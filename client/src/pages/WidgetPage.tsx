import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, type Business } from '../api';
import ChatWidget from '../components/ChatWidget';

/**
 * A page styled like the business's own website, with the chat widget
 * docked bottom-right — exactly how customers will experience the agent.
 */
export default function WidgetPage() {
  const { businessId } = useParams();
  const [business, setBusiness] = useState<Business | null>(null);
  const [open, setOpen] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!businessId) return;
    api
      .publicBusiness(businessId)
      .then(({ business }) => setBusiness(business))
      .catch(() => setError('This business widget could not be found.'));
  }, [businessId]);

  if (error) return <div className="widgetsite__error">{error}</div>;
  if (!business) return <div className="widgetsite__error">Loading…</div>;

  return (
    <div className="widgetsite" style={{ ['--biz' as string]: business.color }}>
      <header className="widgetsite__nav">
        <strong>{business.name}</strong>
        <nav>
          <span>Services</span>
          <span>About</span>
          <span>Contact</span>
        </nav>
      </header>

      <main className="widgetsite__main">
        <h1>{business.name}</h1>
        <p className="widgetsite__tag">
          Quality {business.industry.toLowerCase()} services, honest prices, and answers the moment you need them.
        </p>
        <div className="widgetsite__cards">
          <article>
            <h3>Our services</h3>
            <p>Everything we offer, explained clearly — ask the chat for exact prices.</p>
          </article>
          <article>
            <h3>Timings &amp; location</h3>
            <p>Wondering when we are open or where to find us? The chat knows.</p>
          </article>
          <article>
            <h3>Book in seconds</h3>
            <p>Ask the chat how to book, and a team member can join the same conversation.</p>
          </article>
        </div>
        <p className="widgetsite__hint">Questions? Tap the chat — bottom right. It replies instantly.</p>
      </main>

      <div className="widgetdock">
        {open ? (
          <div className="widgetdock__panel">
            <ChatWidget
              businessId={business.id}
              businessName={business.name}
              greeting={business.greeting}
              color={business.color}
              suggestions={['What are your timings?', 'What are your prices?', 'How do I book?']}
            />
            <button className="widgetdock__close" onClick={() => setOpen(false)} aria-label="Close chat">
              ×
            </button>
          </div>
        ) : (
          <button className="widgetdock__bubble" onClick={() => setOpen(true)} aria-label="Open chat">
            Chat with us
          </button>
        )}
      </div>
    </div>
  );
}
