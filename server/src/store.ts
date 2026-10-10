import bcrypt from 'bcryptjs';
import { randomUUID } from 'node:crypto';

/**
 * Data layer.
 *
 * Everything runs on an in-memory store so the whole product can be demoed
 * anywhere with zero setup (no database server needed). The store is kept
 * behind plain functions (`createUser`, `listFaqs`, ...) so swapping the
 * internals for Mongoose models later touches only this file — the API
 * layer above it does not change.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  businessId: string;
  createdAt: number;
}

export interface Business {
  id: string;
  name: string;
  industry: string;
  greeting: string;
  color: string;
  ownerId: string;
  createdAt: number;
}

export interface Faq {
  id: string;
  businessId: string;
  question: string;
  answer: string;
  createdAt: number;
}

export interface Message {
  id: string;
  conversationId: string;
  role: 'visitor' | 'ai' | 'agent';
  text: string;
  /** FAQ question the AI matched, when role === 'ai' and it had an answer. */
  source?: string | null;
  confidence?: number;
  at: number;
}

export interface Conversation {
  id: string;
  businessId: string;
  visitorName: string;
  /** 'ai' = the agent answers; 'human' = the owner took over. */
  mode: 'ai' | 'human';
  status: 'open' | 'resolved';
  createdAt: number;
  updatedAt: number;
}

export const db = {
  users: new Map<string, User>(),
  usersByEmail: new Map<string, string>(),
  businesses: new Map<string, Business>(),
  faqs: new Map<string, Faq>(),
  conversations: new Map<string, Conversation>(),
  messages: new Map<string, Message[]>(),
};

export const id = () => randomUUID();
export const now = () => Date.now();

/* ---------------- users & businesses ---------------- */

export function createUser(name: string, email: string, password: string, businessName: string, industry: string): User {
  const user: User = {
    id: id(),
    name,
    email: email.toLowerCase(),
    passwordHash: bcrypt.hashSync(password, 10),
    businessId: '',
    createdAt: now(),
  };
  const business: Business = {
    id: id(),
    name: businessName,
    industry,
    greeting: `Hi there! Welcome to ${businessName}. Ask me anything about our services, prices or timings.`,
    color: '#00d4c8',
    ownerId: user.id,
    createdAt: now(),
  };
  user.businessId = business.id;
  db.users.set(user.id, user);
  db.usersByEmail.set(user.email, user.id);
  db.businesses.set(business.id, business);
  return user;
}

export function findUserByEmail(email: string): User | undefined {
  const uid = db.usersByEmail.get(email.toLowerCase());
  return uid ? db.users.get(uid) : undefined;
}

export function verifyPassword(user: User, password: string): boolean {
  return bcrypt.compareSync(password, user.passwordHash);
}

/* ---------------- FAQs ---------------- */

export function listFaqs(businessId: string): Faq[] {
  return [...db.faqs.values()]
    .filter((f) => f.businessId === businessId)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function createFaq(businessId: string, question: string, answer: string): Faq {
  const faq: Faq = { id: id(), businessId, question, answer, createdAt: now() };
  db.faqs.set(faq.id, faq);
  return faq;
}

export function updateFaq(faqId: string, question: string, answer: string): Faq | undefined {
  const faq = db.faqs.get(faqId);
  if (!faq) return undefined;
  faq.question = question;
  faq.answer = answer;
  return faq;
}

export function deleteFaq(faqId: string): boolean {
  return db.faqs.delete(faqId);
}

/* ---------------- conversations & messages ---------------- */

export function createConversation(businessId: string, visitorName: string): Conversation {
  const convo: Conversation = {
    id: id(),
    businessId,
    visitorName: visitorName || 'Guest',
    mode: 'ai',
    status: 'open',
    createdAt: now(),
    updatedAt: now(),
  };
  db.conversations.set(convo.id, convo);
  db.messages.set(convo.id, []);
  return convo;
}

export function listConversations(businessId: string): Conversation[] {
  return [...db.conversations.values()]
    .filter((c) => c.businessId === businessId)
    .sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getConversation(conversationId: string): Conversation | undefined {
  return db.conversations.get(conversationId);
}

export function addMessage(
  conversationId: string,
  role: Message['role'],
  text: string,
  extra?: { source?: string | null; confidence?: number },
): Message {
  const msg: Message = { id: id(), conversationId, role, text, at: now(), ...extra };
  const list = db.messages.get(conversationId) ?? [];
  list.push(msg);
  db.messages.set(conversationId, list);
  const convo = db.conversations.get(conversationId);
  if (convo) convo.updatedAt = msg.at;
  return msg;
}

export function listMessages(conversationId: string): Message[] {
  return db.messages.get(conversationId) ?? [];
}

export function lastMessage(conversationId: string): Message | undefined {
  const list = db.messages.get(conversationId) ?? [];
  return list[list.length - 1];
}

/* ---------------- seed: a demo dental clinic ---------------- */

export const DEMO_EMAIL = 'owner@brightsmile.demo';
export const DEMO_PASSWORD = 'demo1234';

export function seedDemo(): Business {
  const existing = [...db.businesses.values()].find((b) => b.name === 'BrightSmile Dental Clinic');
  if (existing) return existing;

  const owner = createUser(
    'Dr. Ayesha Khan',
    DEMO_EMAIL,
    DEMO_PASSWORD,
    'BrightSmile Dental Clinic',
    'Dental clinic',
  );
  const biz = db.businesses.get(owner.businessId)!;
  biz.greeting =
    'Hi! Welcome to BrightSmile Dental Clinic. Ask me about our timings, treatment prices, or booking an appointment.';

  const faqs: Array<[string, string]> = [
    [
      'What are your clinic timings?',
      'We are open Monday to Saturday, 10:00 AM to 9:00 PM. The clinic is closed on Sundays.',
    ],
    [
      'How much does teeth cleaning cost?',
      'Dental cleaning and polishing costs Rs. 5,000. If you need scaling as well, the dentist will confirm the exact price after a quick checkup.',
    ],
    [
      'Where is the clinic located?',
      'We are on the 2nd floor of Ocean Tower, Bahadurabad, Karachi. Free parking is available in the basement.',
    ],
    [
      'How can I book an appointment?',
      'You can book by calling 021-3455-2211, messaging us on WhatsApp at 0300-1234567, or simply walking in — though booking ahead means almost no waiting.',
    ],
    ['Do you offer braces or aligners?', 'Yes, we offer both metal braces and clear aligners. Braces start at Rs. 85,000 and clear aligners at Rs. 180,000, with monthly installment plans available.'],
    [
      'Do you do root canal treatment?',
      'Yes, our specialists perform single-visit root canals starting at Rs. 18,000, including the X-ray and temporary filling.',
    ],
    [
      'What should I do in a dental emergency?',
      'For severe pain, a broken tooth or swelling, call us immediately at 021-3455-2211. We keep emergency slots open every day from 10 AM to 12 PM.',
    ],
    [
      'Which payment methods do you accept?',
      'We accept cash, debit and credit cards, and bank transfer. Installment plans are available on treatments above Rs. 50,000.',
    ],
    [
      'Is the first checkup free?',
      'Yes — your first consultation and checkup are completely free, including a basic oral examination. X-rays, if needed, are charged separately.',
    ],
    [
      'Do you treat children?',
      'Absolutely. We have a pediatric dentist for children aged 3 and above, and we keep those appointments short and friendly.',
    ],
  ];
  for (const [q, a] of faqs) createFaq(biz.id, q, a);

  // A few past conversations so the dashboard opens with realistic data.
  const day = 24 * 60 * 60 * 1000;
  const samples: Array<{ visitor: string; turns: Array<[Message['role'], string]>; daysAgo: number }> = [
    {
      visitor: 'Ahmed Raza',
      daysAgo: 0,
      turns: [
        ['visitor', 'What are your timings on Saturday?'],
        ['ai', 'We are open Monday to Saturday, 10:00 AM to 9:00 PM. The clinic is closed on Sundays.'],
        ['visitor', 'Great, and cleaning price?'],
        ['ai', 'Dental cleaning and polishing costs Rs. 5,000.'],
      ],
    },
    {
      visitor: 'Fatima Noor',
      daysAgo: 1,
      turns: [
        ['visitor', 'Do you offer installment plans for braces?'],
        ['ai', 'Yes — braces start at Rs. 85,000 with monthly installment plans available.'],
        ['visitor', 'Can I talk to someone about my case specifically?'],
        ['agent', 'Of course, this is Dr. Ayesha. Please share a photo of your teeth on WhatsApp and I will advise.'],
      ],
    },
    {
      visitor: 'Bilal Hussain',
      daysAgo: 2,
      turns: [
        ['visitor', 'I have severe tooth pain since last night'],
        ['ai', 'For severe pain, please call us at 021-3455-2211 right away. We keep emergency slots open every day from 10 AM to 12 PM.'],
      ],
    },
  ];
  for (const s of samples) {
    const convo = createConversation(biz.id, s.visitor);
    convo.createdAt = now() - s.daysAgo * day;
    convo.updatedAt = convo.createdAt;
    if (s.turns.some(([r]) => r === 'agent')) convo.mode = 'human';
    s.turns.forEach(([role, text], i) => {
      const msg = addMessage(convo.id, role, text, role === 'ai' ? { confidence: 0.92 } : undefined);
      msg.at = convo.createdAt + (i + 1) * 60_000; // spread messages across the day they happened
    });
    convo.updatedAt = now() - s.daysAgo * day + 60_000;
  }

  return biz;
}
