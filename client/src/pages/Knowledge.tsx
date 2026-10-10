import { useEffect, useState } from 'react';
import { api, type Faq } from '../api';

export default function Knowledge() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const [editQ, setEditQ] = useState('');
  const [editA, setEditA] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    const { faqs } = await api.faqs();
    setFaqs(faqs);
  }

  useEffect(() => {
    load().catch((e) => setError(e instanceof Error ? e.message : 'Could not load the knowledge base.'));
  }, []);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api.createFaq(question.trim(), answer.trim());
      setQuestion('');
      setAnswer('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add that.');
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    setError('');
    try {
      await api.updateFaq(id, editQ.trim(), editA.trim());
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save that.');
    }
  }

  async function remove(id: string) {
    setError('');
    try {
      await api.deleteFaq(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete that.');
    }
  }

  return (
    <div>
      <h1 className="dash__title">Knowledge base</h1>
      <p className="dash__subtitle">
        This is everything your agent knows. It answers <strong>only</strong> from here — add the questions your
        customers actually ask, in your own words and prices.
      </p>

      {error && <div className="form-error">{error}</div>}

      <form className="panel faqform" onSubmit={add}>
        <h2>Teach your agent something new</h2>
        <label>
          A question customers ask
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. Do you deliver outside Karachi?"
            required
          />
        </label>
        <label>
          The answer the agent should give
          <textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="e.g. Yes, we deliver nationwide in 2–3 working days for Rs. 300."
            rows={3}
            required
          />
        </label>
        <button className="btn" type="submit" disabled={busy}>
          {busy ? 'Adding…' : 'Add to knowledge base'}
        </button>
      </form>

      <div className="panel">
        <h2>
          What your agent knows <span className="muted">({faqs.length})</span>
        </h2>
        {faqs.length === 0 ? (
          <p className="muted">
            Nothing yet — your agent can only greet customers right now. Add your first question above.
          </p>
        ) : (
          <ul className="faqlist">
            {faqs.map((f) => (
              <li key={f.id} className="faq">
                {editing === f.id ? (
                  <div className="faq__edit">
                    <input value={editQ} onChange={(e) => setEditQ(e.target.value)} aria-label="Question" />
                    <textarea value={editA} onChange={(e) => setEditA(e.target.value)} rows={3} aria-label="Answer" />
                    <div className="faq__actions">
                      <button className="btn btn--small" onClick={() => void saveEdit(f.id)}>
                        Save
                      </button>
                      <button className="btn btn--small btn--ghost" onClick={() => setEditing(null)}>
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="faq__q">{f.question}</div>
                    <div className="faq__a">{f.answer}</div>
                    <div className="faq__actions">
                      <button
                        className="btn btn--small btn--ghost"
                        onClick={() => {
                          setEditing(f.id);
                          setEditQ(f.question);
                          setEditA(f.answer);
                        }}
                      >
                        Edit
                      </button>
                      <button className="btn btn--small btn--danger" onClick={() => void remove(f.id)}>
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
