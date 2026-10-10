import { listFaqs } from './store.js';

/**
 * The answer engine.
 *
 * Design decision worth knowing in an interview: the engine is a *retrieval*
 * matcher over the business's own knowledge base — not a free-generating
 * model. That means the agent can never invent prices or policies the owner
 * didn't write, which is exactly what a real business needs from a support
 * bot. The `answer()` signature is the seam where a real LLM (OpenAI,
 * Anthropic, ...) drops in later for rephrasing, without touching routes
 * or the UI.
 */

const STOPWORDS = new Set([
  'a', 'an', 'the', 'is', 'are', 'do', 'does', 'did', 'you', 'your', 'we', 'our',
  'i', 'me', 'my', 'can', 'could', 'please', 'what', 'when', 'where', 'how',
  'much', 'many', 'any', 'for', 'to', 'of', 'in', 'on', 'at', 'and', 'or',
  'hai', 'hain', 'kya', 'ka', 'ki', 'ke', 'mujhe', 'aap',
]);

export interface EngineAnswer {
  text: string;
  /** The FAQ question that matched (for the dashboard's "source" display). */
  source: string | null;
  /** 0..1 — how sure the engine is that this answer fits. */
  confidence: number;
}

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2 && !STOPWORDS.has(w)),
  );
}

function score(questionTokens: Set<string>, answerTokens: Set<string>, msgTokens: Set<string>): number {
  let hits = 0;
  for (const t of msgTokens) {
    if (questionTokens.has(t)) hits += 2; // matching the question matters most
    else if (answerTokens.has(t)) hits += 1;
  }
  return msgTokens.size === 0 ? 0 : hits / (msgTokens.size * 2);
}

export function answer(businessId: string, businessName: string, greeting: string, message: string): EngineAnswer {
  const faqs = listFaqs(businessId);
  const msgTokens = tokenize(message);
  const lower = message.toLowerCase();

  if (/\b(hi|hello|hey|salam|assalam)\b/.test(lower) && msgTokens.size <= 3) {
    return { text: greeting, source: null, confidence: 0.95 };
  }
  if (/\b(thank|shukriya|great|perfect)\b/.test(lower)) {
    return { text: 'You are most welcome! Is there anything else I can help you with?', source: null, confidence: 0.9 };
  }

  let best: { faq: (typeof faqs)[number]; value: number } | null = null;
  for (const faq of faqs) {
    const value = score(tokenize(faq.question), tokenize(faq.answer), msgTokens);
    if (!best || value > best.value) best = { faq, value };
  }

  if (best && best.value >= 0.34) {
    return { text: best.faq.answer, source: best.faq.question, confidence: Math.min(0.99, 0.55 + best.value) };
  }

  return {
    text:
      `Thanks for asking — I don't have that detail in ${businessName}'s information yet. ` +
      'A team member has been notified and will reply here shortly. Is there anything else I can help with meanwhile?',
    source: null,
    confidence: 0.15,
  };
}
