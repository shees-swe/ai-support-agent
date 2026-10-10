export interface Business {
  id: string;
  name: string;
  industry: string;
  greeting: string;
  color: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Faq {
  id: string;
  question: string;
  answer: string;
  createdAt: number;
}

export interface Message {
  id: string;
  role: 'visitor' | 'ai' | 'agent';
  text: string;
  source?: string | null;
  confidence?: number;
  at: number;
}

export interface Conversation {
  id: string;
  visitorName: string;
  mode: 'ai' | 'human';
  status: 'open' | 'resolved';
  createdAt: number;
  updatedAt: number;
  lastMessage?: Message | null;
  messageCount?: number;
}

const TOKEN_KEY = 'assistly_token';

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string | null) => {
  if (t) localStorage.setItem(TOKEN_KEY, t);
  else localStorage.removeItem(TOKEN_KEY);
};

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export const api = {
  register: (body: { name: string; email: string; password: string; businessName: string; industry: string }) =>
    request<{ token: string; user: User; business: Business }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  login: (email: string, password: string) =>
    request<{ token: string; user: User; business: Business }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ user: User; business: Business }>('/api/me'),
  updateBusiness: (body: Partial<Pick<Business, 'name' | 'greeting' | 'color'>>) =>
    request<{ business: Business }>('/api/business', { method: 'PATCH', body: JSON.stringify(body) }),
  faqs: () => request<{ faqs: Faq[] }>('/api/faqs'),
  createFaq: (question: string, answer: string) =>
    request<{ faq: Faq }>('/api/faqs', { method: 'POST', body: JSON.stringify({ question, answer }) }),
  updateFaq: (id: string, question: string, answer: string) =>
    request<{ faq: Faq }>(`/api/faqs/${id}`, { method: 'PUT', body: JSON.stringify({ question, answer }) }),
  deleteFaq: (id: string) => request<{ ok: true }>(`/api/faqs/${id}`, { method: 'DELETE' }),
  conversations: () => request<{ conversations: Conversation[] }>('/api/conversations'),
  conversation: (id: string) => request<{ conversation: Conversation; messages: Message[] }>(`/api/conversations/${id}`),
  reply: (id: string, text: string) =>
    request<{ message: Message; conversation: Conversation }>(`/api/conversations/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    }),
  setMode: (id: string, mode: 'ai' | 'human') =>
    request<{ conversation: Conversation }>(`/api/conversations/${id}/mode`, {
      method: 'POST',
      body: JSON.stringify({ mode }),
    }),
  resolve: (id: string) => request<{ conversation: Conversation }>(`/api/conversations/${id}/resolve`, { method: 'POST' }),
  stats: () =>
    request<{
      stats: {
        conversations: number;
        openConversations: number;
        messages: number;
        aiResolvedPct: number;
        takeovers: number;
        faqCount: number;
        perDay: Array<{ day: string; label: string; count: number }>;
      };
    }>('/api/stats'),
  demoBusiness: () => request<{ business: Business }>('/api/public/demo'),
  publicBusiness: (id: string) => request<{ business: Business }>(`/api/public/business/${id}`),
  publicConversation: (id: string) =>
    request<{ conversation: Conversation; messages: Message[] }>(`/api/public/conversation/${id}`),
};

export interface StreamHandlers {
  onMeta?: (conversationId: string, mode: 'ai' | 'human') => void;
  onToken?: (text: string) => void;
  onDone?: (source: string | null, confidence: number) => void;
}

/** Sends a chat message and streams the AI reply token-by-token (SSE over fetch). */
export async function streamChat(
  businessId: string,
  body: { visitorName: string; conversationId?: string; message: string },
  handlers: StreamHandlers,
): Promise<void> {
  const res = await fetch(`/api/chat/${businessId}/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) throw new Error('Could not reach the agent. Please try again.');

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';
    for (const raw of events) {
      const lines = raw.split('\n');
      const event = lines.find((l) => l.startsWith('event:'))?.slice(6).trim();
      const dataLine = lines.find((l) => l.startsWith('data:'))?.slice(5).trim();
      if (!event || !dataLine) continue;
      const data = JSON.parse(dataLine);
      if (event === 'meta') handlers.onMeta?.(data.conversationId, data.mode);
      else if (event === 'token') handlers.onToken?.(data.text);
      else if (event === 'done') handlers.onDone?.(data.source, data.confidence);
    }
  }
}
