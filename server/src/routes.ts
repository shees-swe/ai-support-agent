import { Router, type Response } from 'express';
import { requireAuth, signToken, type AuthedRequest } from './auth.js';
import { answer } from './engine.js';
import {
  addMessage,
  createConversation,
  createFaq,
  createUser,
  db,
  deleteFaq,
  findUserByEmail,
  getConversation,
  lastMessage,
  listConversations,
  listFaqs,
  listMessages,
  updateFaq,
  verifyPassword,
} from './store.js';

export const routes = Router();

const publicBusiness = (b: { id: string; name: string; industry: string; greeting: string; color: string }) => ({
  id: b.id,
  name: b.name,
  industry: b.industry,
  greeting: b.greeting,
  color: b.color,
});

function ownBusiness(req: AuthedRequest, res: Response) {
  const biz = db.businesses.get(req.user!.businessId);
  if (!biz) {
    res.status(404).json({ error: 'Business not found.' });
    return null;
  }
  return biz;
}

/* ---------------- auth ---------------- */

routes.post('/auth/register', (req, res) => {
  const { name, email, password, businessName, industry } = req.body ?? {};
  if (!name || !email || !password || !businessName) {
    res.status(400).json({ error: 'Name, email, password and business name are required.' });
    return;
  }
  if (String(password).length < 6) {
    res.status(400).json({ error: 'Password must be at least 6 characters.' });
    return;
  }
  if (findUserByEmail(String(email))) {
    res.status(409).json({ error: 'An account with this email already exists — try signing in.' });
    return;
  }
  const user = createUser(String(name), String(email), String(password), String(businessName), String(industry ?? 'Business'));
  res.status(201).json({
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email },
    business: publicBusiness(db.businesses.get(user.businessId)!),
  });
});

routes.post('/auth/login', (req, res) => {
  const { email, password } = req.body ?? {};
  const user = email ? findUserByEmail(String(email)) : undefined;
  if (!user || !verifyPassword(user, String(password ?? ''))) {
    res.status(401).json({ error: 'Email or password is incorrect.' });
    return;
  }
  res.json({
    token: signToken(user),
    user: { id: user.id, name: user.name, email: user.email },
    business: publicBusiness(db.businesses.get(user.businessId)!),
  });
});

routes.get('/me', requireAuth, (req: AuthedRequest, res) => {
  const biz = ownBusiness(req, res);
  if (!biz) return;
  res.json({
    user: { id: req.user!.id, name: req.user!.name, email: req.user!.email },
    business: publicBusiness(biz),
  });
});

routes.patch('/business', requireAuth, (req: AuthedRequest, res) => {
  const biz = ownBusiness(req, res);
  if (!biz) return;
  const { name, greeting, color } = req.body ?? {};
  if (name) biz.name = String(name);
  if (greeting) biz.greeting = String(greeting);
  if (color) biz.color = String(color);
  res.json({ business: publicBusiness(biz) });
});

/* ---------------- knowledge base ---------------- */

routes.get('/faqs', requireAuth, (req: AuthedRequest, res) => {
  res.json({ faqs: listFaqs(req.user!.businessId) });
});

routes.post('/faqs', requireAuth, (req: AuthedRequest, res) => {
  const { question, answer } = req.body ?? {};
  if (!question || !answer) {
    res.status(400).json({ error: 'Both a question and an answer are required.' });
    return;
  }
  res.status(201).json({ faq: createFaq(req.user!.businessId, String(question), String(answer)) });
});

routes.put('/faqs/:id', requireAuth, (req: AuthedRequest, res) => {
  const faq = db.faqs.get(req.params.id);
  if (!faq || faq.businessId !== req.user!.businessId) {
    res.status(404).json({ error: 'FAQ not found.' });
    return;
  }
  const { question, answer } = req.body ?? {};
  res.json({ faq: updateFaq(faq.id, String(question ?? faq.question), String(answer ?? faq.answer)) });
});

routes.delete('/faqs/:id', requireAuth, (req: AuthedRequest, res) => {
  const faq = db.faqs.get(req.params.id);
  if (!faq || faq.businessId !== req.user!.businessId) {
    res.status(404).json({ error: 'FAQ not found.' });
    return;
  }
  deleteFaq(faq.id);
  res.json({ ok: true });
});

/* ---------------- conversations (owner) ---------------- */

routes.get('/conversations', requireAuth, (req: AuthedRequest, res) => {
  const convos = listConversations(req.user!.businessId).map((c) => ({
    ...c,
    lastMessage: lastMessage(c.id) ?? null,
    messageCount: listMessages(c.id).length,
  }));
  res.json({ conversations: convos });
});

routes.get('/conversations/:id', requireAuth, (req: AuthedRequest, res) => {
  const convo = getConversation(req.params.id);
  if (!convo || convo.businessId !== req.user!.businessId) {
    res.status(404).json({ error: 'Conversation not found.' });
    return;
  }
  res.json({ conversation: convo, messages: listMessages(convo.id) });
});

routes.post('/conversations/:id/reply', requireAuth, (req: AuthedRequest, res) => {
  const convo = getConversation(req.params.id);
  if (!convo || convo.businessId !== req.user!.businessId) {
    res.status(404).json({ error: 'Conversation not found.' });
    return;
  }
  const text = String(req.body?.text ?? '').trim();
  if (!text) {
    res.status(400).json({ error: 'Message cannot be empty.' });
    return;
  }
  convo.mode = 'human'; // replying personally = taking over from the AI
  const msg = addMessage(convo.id, 'agent', text);
  res.status(201).json({ message: msg, conversation: convo });
});

routes.post('/conversations/:id/mode', requireAuth, (req: AuthedRequest, res) => {
  const convo = getConversation(req.params.id);
  if (!convo || convo.businessId !== req.user!.businessId) {
    res.status(404).json({ error: 'Conversation not found.' });
    return;
  }
  convo.mode = req.body?.mode === 'human' ? 'human' : 'ai';
  res.json({ conversation: convo });
});

routes.post('/conversations/:id/resolve', requireAuth, (req: AuthedRequest, res) => {
  const convo = getConversation(req.params.id);
  if (!convo || convo.businessId !== req.user!.businessId) {
    res.status(404).json({ error: 'Conversation not found.' });
    return;
  }
  convo.status = convo.status === 'resolved' ? 'open' : 'resolved';
  res.json({ conversation: convo });
});

/* ---------------- stats ---------------- */

routes.get('/stats', requireAuth, (req: AuthedRequest, res) => {
  const businessId = req.user!.businessId;
  const convos = listConversations(businessId);
  let messages = 0;
  let aiAnswers = 0;
  let takeovers = 0;
  const perDay = new Map<string, number>();
  const dayMs = 24 * 60 * 60 * 1000;
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * dayMs);
    perDay.set(d.toISOString().slice(0, 10), 0);
  }
  for (const c of convos) {
    if (c.mode === 'human') takeovers++;
    for (const m of listMessages(c.id)) {
      messages++;
      if (m.role === 'ai' && (m.confidence ?? 0) > 0.3) aiAnswers++;
      const key = new Date(m.at).toISOString().slice(0, 10);
      if (perDay.has(key)) perDay.set(key, (perDay.get(key) ?? 0) + 1);
    }
  }
  res.json({
    stats: {
      conversations: convos.length,
      openConversations: convos.filter((c) => c.status === 'open').length,
      messages,
      aiResolvedPct: messages === 0 ? 0 : Math.round((aiAnswers / Math.max(1, messages)) * 100),
      takeovers,
      faqCount: listFaqs(businessId).length,
      perDay: [...perDay.entries()].map(([day, count]) => ({
        day,
        label: new Date(day + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' }),
        count,
      })),
    },
  });
});

/* ---------------- public widget / chat ---------------- */

routes.get('/public/demo', (_req, res) => {
  const demo = [...db.businesses.values()].find((b) => b.name === 'BrightSmile Dental Clinic');
  if (!demo) {
    res.status(404).json({ error: 'Demo business is not seeded.' });
    return;
  }
  res.json({ business: publicBusiness(demo) });
});

routes.get('/public/business/:id', (req, res) => {
  const biz = db.businesses.get(req.params.id);
  if (!biz) {
    res.status(404).json({ error: 'Business not found.' });
    return;
  }
  res.json({ business: publicBusiness(biz) });
});

interface ChatResult {
  conversationId: string;
  reply: { text: string; source: string | null; confidence: number } | null;
  mode: 'ai' | 'human';
}

function handleChat(businessId: string, visitorName: string, conversationId: string | undefined, text: string): ChatResult | null {
  const biz = db.businesses.get(businessId);
  if (!biz) return null;
  const convo = conversationId ? getConversation(conversationId) : undefined;
  const active = convo && convo.businessId === businessId ? convo : createConversation(businessId, visitorName);
  addMessage(active.id, 'visitor', text);
  if (active.mode === 'human') {
    return { conversationId: active.id, reply: null, mode: 'human' };
  }
  const result = answer(businessId, biz.name, biz.greeting, text);
  addMessage(active.id, 'ai', result.text, { source: result.source, confidence: result.confidence });
  return { conversationId: active.id, reply: result, mode: 'ai' };
}

routes.post('/chat/:businessId', (req, res) => {
  const text = String(req.body?.message ?? '').trim();
  if (!text) {
    res.status(400).json({ error: 'Message cannot be empty.' });
    return;
  }
  const result = handleChat(req.params.businessId, String(req.body?.visitorName ?? 'Guest'), req.body?.conversationId, text);
  if (!result) {
    res.status(404).json({ error: 'Business not found.' });
    return;
  }
  res.json(result);
});

/** Streaming variant: emits the AI reply word-by-word as Server-Sent Events. */
routes.post('/chat/:businessId/stream', (req, res) => {
  const text = String(req.body?.message ?? '').trim();
  if (!text) {
    res.status(400).json({ error: 'Message cannot be empty.' });
    return;
  }
  const result = handleChat(req.params.businessId, String(req.body?.visitorName ?? 'Guest'), req.body?.conversationId, text);
  if (!result) {
    res.status(404).json({ error: 'Business not found.' });
    return;
  }
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  send('meta', { conversationId: result.conversationId, mode: result.mode });
  if (!result.reply) {
    send('done', { source: null, confidence: 0 });
    res.end();
    return;
  }
  const words = result.reply.text.split(/(?<=\s)/);
  let i = 0;
  const timer = setInterval(() => {
    if (i < words.length) {
      send('token', { text: words[i] });
      i++;
    } else {
      clearInterval(timer);
      send('done', { source: result.reply!.source, confidence: result.reply!.confidence });
      res.end();
    }
  }, 24);
  // NOTE: listen on the response, not the request — req 'close' fires as soon
  // as the body is consumed, which would cancel the stream immediately.
  res.on('close', () => clearInterval(timer));
});

routes.get('/public/conversation/:id', (req, res) => {
  const convo = getConversation(req.params.id);
  if (!convo) {
    res.status(404).json({ error: 'Conversation not found.' });
    return;
  }
  res.json({ conversation: convo, messages: listMessages(convo.id) });
});
