import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { api } from '../api';
import type { DashContext } from './Dashboard';

const COLORS = ['#00d4c8', '#7dd3fc', '#a78bfa', '#f472b6', '#fbbf24', '#34d399'];

export default function WidgetSettings() {
  const { business, refreshBusiness } = useOutletContext<DashContext>();
  const [name, setName] = useState(business.name);
  const [greeting, setGreeting] = useState(business.greeting);
  const [color, setColor] = useState(business.color);
  const [saved, setSaved] = useState('');
  const [error, setError] = useState('');

  const widgetUrl = `${window.location.origin}/widget/${business.id}`;
  const embed = `<script src="${window.location.origin}/widget.js" data-business="${business.id}" async></script>`;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved('');
    try {
      await api.updateBusiness({ name: name.trim(), greeting: greeting.trim(), color });
      await refreshBusiness();
      setSaved('Saved — your widget already reflects the change.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save.');
    }
  }

  return (
    <div>
      <h1 className="dash__title">Widget &amp; settings</h1>
      <p className="dash__subtitle">How your agent looks and sounds wherever customers meet it.</p>

      {error && <div className="form-error">{error}</div>}
      {saved && <div className="form-ok">{saved}</div>}

      <form className="panel faqform" onSubmit={save}>
        <label>
          Business name
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label>
          Greeting message
          <textarea value={greeting} onChange={(e) => setGreeting(e.target.value)} rows={3} required />
        </label>
        <label>
          Brand colour
          <div className="swatches">
            {COLORS.map((c) => (
              <button
                key={c}
                type="button"
                className={`swatch ${c === color ? 'swatch--active' : ''}`}
                style={{ background: c }}
                onClick={() => setColor(c)}
                aria-label={`Use colour ${c}`}
              />
            ))}
          </div>
        </label>
        <button className="btn" type="submit">
          Save settings
        </button>
      </form>

      <div className="panel">
        <h2>Your customer widget</h2>
        <p className="muted">
          This page is what customers see — the same agent, on a page styled like your own website. Share it or open
          it on your phone to test as a customer.
        </p>
        <p>
          <Link className="btn btn--ghost" to={`/widget/${business.id}`} target="_blank" rel="noreferrer">
            Open widget page ↗
          </Link>
        </p>
        <label className="embed">
          Embed on any website (one line)
          <code className="embed__code">{embed}</code>
        </label>
        <p className="muted embed__note">
          Live page: <code>{widgetUrl}</code>
        </p>
      </div>
    </div>
  );
}
