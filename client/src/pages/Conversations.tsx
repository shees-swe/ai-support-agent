import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, type Conversation, type Message } from '../api';

export default function Conversations() {
  const [params] = useSearchParams();
  const [list, setList] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(params.get('open'));
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState('');
  const [error, setError] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadList = useCallback(async () => {
    const { conversations } = await api.conversations();
    setList(conversations);
  }, []);

  const loadThread = useCallback(async (id: string) => {
    const { conversation, messages } = await api.conversation(id);
    setActive(conversation);
    setMessages(messages);
  }, []);

  useEffect(() => {
    loadList().catch((e) => setError(e instanceof Error ? e.message : 'Could not load conversations.'));
    const timer = setInterval(() => void loadList().catch(() => undefined), 5000);
    return () => clearInterval(timer);
  }, [loadList]);

  useEffect(() => {
    if (!activeId && list.length > 0) setActiveId(list[0].id);
  }, [list, activeId]);

  useEffect(() => {
    if (!activeId) return;
    void loadThread(activeId).catch(() => undefined);
    const timer = setInterval(() => void loadThread(activeId).catch(() => undefined), 4000);
    return () => clearInterval(timer);
  }, [activeId, loadThread]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages]);

  async function sendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!activeId || !reply.trim()) return;
    const text = reply.trim();
    setReply('');
    try {
      await api.reply(activeId, text);
      await loadThread(activeId);
      await loadList();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the reply.');
    }
  }

  async function toggleMode() {
    if (!active) return;
    const { conversation } = await api.setMode(active.id, active.mode === 'ai' ? 'human' : 'ai');
    setActive(conversation);
    await loadList();
  }

  async function toggleResolve() {
    if (!active) return;
    const { conversation } = await api.resolve(active.id);
    setActive(conversation);
    await loadList();
  }

  return (
    <div>
      <h1 className="dash__title">Conversations</h1>
      <p className="dash__subtitle">
        Every customer chat, live. Reply from here and you take over from the AI — the customer sees your message in
        the same chat.
      </p>
      {error && <div className="form-error">{error}</div>}

      <div className="convo">
        <div className="convo__list">
          {list.length === 0 && <p className="muted">No conversations yet.</p>}
          {list.map((c) => (
            <button
              key={c.id}
              className={`convo__item ${c.id === activeId ? 'convo__item--active' : ''}`}
              onClick={() => setActiveId(c.id)}
            >
              <span className="convo__top">
                <span className="convo__who">{c.visitorName}</span>
                <span className={`pill ${c.mode === 'human' ? 'pill--human' : 'pill--ai'}`}>
                  {c.mode === 'human' ? 'Human' : 'AI'}
                </span>
              </span>
              <span className="convo__last">{c.lastMessage?.text ?? '—'}</span>
              <span className="convo__meta">
                {c.messageCount ?? 0} messages · {c.status}
              </span>
            </button>
          ))}
        </div>

        <div className="convo__thread">
          {active ? (
            <>
              <div className="convo__head">
                <div>
                  <strong>{active.visitorName}</strong>
                  <span className="muted"> · {active.status}</span>
                </div>
                <div className="convo__head-actions">
                  <button className="btn btn--small btn--ghost" onClick={() => void toggleMode()}>
                    {active.mode === 'ai' ? 'Take over from AI' : 'Hand back to AI'}
                  </button>
                  <button className="btn btn--small btn--ghost" onClick={() => void toggleResolve()}>
                    {active.status === 'resolved' ? 'Reopen' : 'Mark resolved'}
                  </button>
                </div>
              </div>

              <div className="convo__messages" ref={scrollRef}>
                {messages.map((m) => (
                  <div key={m.id} className={`bubble-row bubble-row--${m.role === 'visitor' ? 'visitor' : 'ai'}`}>
                    <div className={`bubble bubble--${m.role}`}>
                      {m.role === 'agent' && <div className="bubble__who">You (team)</div>}
                      {m.role === 'ai' && <div className="bubble__who">AI agent</div>}
                      <div>{m.text}</div>
                      {m.role === 'ai' && m.source && <div className="bubble__source">From: “{m.source}”</div>}
                      {m.role === 'ai' && typeof m.confidence === 'number' && (
                        <div className="bubble__source">Confidence {Math.round(m.confidence * 100)}%</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <form className="convo__reply" onSubmit={sendReply}>
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder={
                    active.mode === 'ai'
                      ? 'Reply as yourself — this takes over from the AI…'
                      : 'Reply to the customer…'
                  }
                  aria-label="Reply to the customer"
                />
                <button className="btn" type="submit" disabled={!reply.trim()}>
                  Send
                </button>
              </form>
            </>
          ) : (
            <p className="muted convo__empty">Pick a conversation to read it.</p>
          )}
        </div>
      </div>
    </div>
  );
}
