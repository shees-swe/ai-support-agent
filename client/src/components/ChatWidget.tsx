import { useCallback, useEffect, useRef, useState } from 'react';
import { api, streamChat, type Message } from '../api';

interface ChatMsg {
  id: string;
  role: 'visitor' | 'ai' | 'agent';
  text: string;
  source?: string | null;
}

interface Props {
  businessId: string;
  businessName: string;
  greeting: string;
  color: string;
  suggestions?: string[];
}

/**
 * The customer-facing chat. Used on the landing-page demo and on the
 * business's own widget page — same component businesses would embed.
 * AI replies stream in token-by-token; if the owner takes over, their
 * replies arrive here live via polling.
 */
export default function ChatWidget({ businessId, businessName, greeting, color, suggestions = [] }: Props) {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState('');
  const [visitorName, setVisitorName] = useState('Guest');
  const [nameDraft, setNameDraft] = useState('');
  const [nameSet, setNameSet] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [humanMode, setHumanMode] = useState(false);
  const [error, setError] = useState('');
  const conversationId = useRef<string | undefined>(undefined);
  const streamingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([{ id: 'greeting', role: 'ai', text: greeting }]);
  }, [greeting]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, streaming]);

  const syncFromServer = useCallback(async () => {
    if (!conversationId.current || streamingRef.current) return;
    try {
      const { conversation, messages: serverMsgs } = await api.publicConversation(conversationId.current);
      setHumanMode(conversation.mode === 'human');
      setMessages((prev) => {
        const greetingMsg = prev.find((m) => m.id === 'greeting');
        const mapped: ChatMsg[] = serverMsgs.map((m: Message) => ({
          id: m.id,
          role: m.role,
          text: m.text,
          source: m.source,
        }));
        return greetingMsg ? [greetingMsg, ...mapped] : mapped;
      });
    } catch {
      /* polling is best-effort */
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(syncFromServer, 4000);
    return () => clearInterval(timer);
  }, [syncFromServer]);

  async function send(text: string) {
    const message = text.trim();
    if (!message || streaming) return;
    setError('');
    setInput('');
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: 'visitor', text: message }]);
    setStreaming(true);
    streamingRef.current = true;
    const aiId = `stream-${Date.now()}`;
    try {
      await streamChat(
        businessId,
        { visitorName, conversationId: conversationId.current, message },
        {
          onMeta: (cid, mode) => {
            conversationId.current = cid;
            setHumanMode(mode === 'human');
            if (mode === 'ai') {
              setMessages((prev) => [...prev, { id: aiId, role: 'ai', text: '' }]);
            }
          },
          onToken: (token) => {
            setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, text: m.text + token } : m)));
          },
          onDone: (source) => {
            setMessages((prev) => prev.map((m) => (m.id === aiId ? { ...m, source } : m)));
          },
        },
      );
    } catch {
      setError('The agent could not be reached. Please try again in a moment.');
    } finally {
      setStreaming(false);
      streamingRef.current = false;
      void syncFromServer();
    }
  }

  return (
    <div className="chat" style={{ ['--biz' as string]: color }}>
      <div className="chat__head">
        <div className="chat__avatar" aria-hidden="true">
          {businessName.charAt(0)}
        </div>
        <div>
          <div className="chat__name">{businessName}</div>
          <div className="chat__status">
            <span className={humanMode ? 'dot dot--human' : 'dot dot--ai'} />
            {humanMode ? 'You are chatting with the team' : 'AI agent · replies instantly'}
          </div>
        </div>
      </div>

      {!nameSet && (
        <form
          className="chat__nameform"
          onSubmit={(e) => {
            e.preventDefault();
            if (nameDraft.trim()) setVisitorName(nameDraft.trim());
            setNameSet(true);
          }}
        >
          <input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder="Your name (optional)"
            aria-label="Your name"
          />
          <button type="submit">Start chat</button>
        </form>
      )}

      <div className="chat__body" ref={scrollRef}>
        {messages.map((m) => (
          <div key={m.id} className={`bubble-row bubble-row--${m.role}`}>
            <div className={`bubble bubble--${m.role}`}>
              {m.role === 'agent' && <div className="bubble__who">{businessName} (team)</div>}
              <div>{m.text || (streaming && m.role === 'ai' ? '…' : '')}</div>
              {m.role === 'ai' && m.source && <div className="bubble__source">Answered from: “{m.source}”</div>}
            </div>
          </div>
        ))}
        {suggestions.length > 0 && messages.length <= 1 && (
          <div className="chat__suggest">
            {suggestions.map((s) => (
              <button key={s} onClick={() => void send(s)}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <div className="chat__error">{error}</div>}

      <form
        className="chat__input"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={humanMode ? 'Message the team…' : 'Ask about prices, timings, booking…'}
          aria-label="Type your message"
        />
        <button type="submit" disabled={streaming || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
