import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { api, setToken, type Business, type Conversation, type User } from '../api';

export interface DashContext {
  user: User;
  business: Business;
  refreshBusiness: () => Promise<void>;
}

export function DashboardLayout() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [error, setError] = useState('');

  async function load() {
    const { user, business } = await api.me();
    setUser(user);
    setBusiness(business);
  }

  useEffect(() => {
    load().catch(() => {
      setToken(null);
      navigate('/login');
    });
  }, [navigate]);

  if (error) return <div className="dash__loading">{error}</div>;
  if (!user || !business) return <div className="dash__loading">Loading your dashboard…</div>;

  const ctx: DashContext = { user, business, refreshBusiness: load };

  return (
    <div className="dash">
      <aside className="dash__side">
        <div className="nav__brand">
          <span className="logo">A</span> Assistly
        </div>
        <div className="dash__biz">
          <div className="dash__bizname">{business.name}</div>
          <div className="dash__bizsub">{business.industry}</div>
        </div>
        <nav className="dash__nav">
          <NavLink to="/dashboard" end>
            Overview
          </NavLink>
          <NavLink to="/dashboard/knowledge">Knowledge base</NavLink>
          <NavLink to="/dashboard/conversations">Conversations</NavLink>
          <NavLink to="/dashboard/widget">Widget &amp; settings</NavLink>
        </nav>
        <div className="dash__sidefoot">
          <Link to={`/widget/${business.id}`} target="_blank" rel="noreferrer">
            Open customer widget ↗
          </Link>
          <button
            onClick={() => {
              setToken(null);
              navigate('/');
            }}
          >
            Sign out ({user.name.split(' ')[0]})
          </button>
        </div>
      </aside>
      <main className="dash__main">
        <Outlet context={ctx} />
      </main>
    </div>
  );
}

export function Overview() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof api.stats>>['stats'] | null>(null);
  const [recent, setRecent] = useState<Conversation[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([api.stats(), api.conversations()])
      .then(([{ stats }, { conversations }]) => {
        setStats(stats);
        setRecent(conversations.slice(0, 5));
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Could not load stats.'));
  }, []);

  if (error) return <div className="form-error">{error}</div>;
  if (!stats) return <div className="dash__loading">Crunching your numbers…</div>;

  const max = Math.max(1, ...stats.perDay.map((d) => d.count));

  return (
    <div>
      <h1 className="dash__title">Overview</h1>
      <p className="dash__subtitle">What your agent has been doing for your customers.</p>

      <div className="statgrid">
        <div className="stat">
          <div className="stat__value">{stats.conversations}</div>
          <div className="stat__label">Conversations</div>
        </div>
        <div className="stat">
          <div className="stat__value">{stats.messages}</div>
          <div className="stat__label">Messages handled</div>
        </div>
        <div className="stat">
          <div className="stat__value">{stats.aiResolvedPct}%</div>
          <div className="stat__label">Answered by AI</div>
        </div>
        <div className="stat">
          <div className="stat__value">{stats.takeovers}</div>
          <div className="stat__label">Human takeovers</div>
        </div>
      </div>

      <div className="panel">
        <h2>Messages — last 7 days</h2>
        <div className="bars" role="img" aria-label="Bar chart of messages per day">
          {stats.perDay.map((d) => (
            <div key={d.day} className="bar">
              <div className="bar__fill" style={{ height: `${(d.count / max) * 100}%` }}>
                {d.count > 0 && <span>{d.count}</span>}
              </div>
              <div className="bar__label">{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <h2>Recent conversations</h2>
        {recent.length === 0 ? (
          <p className="muted">No conversations yet. Share your widget link and they will appear here live.</p>
        ) : (
          <ul className="recent">
            {recent.map((c) => (
              <li key={c.id}>
                <Link to={`/dashboard/conversations?open=${c.id}`}>
                  <span className="recent__who">{c.visitorName}</span>
                  <span className="recent__msg">{c.lastMessage?.text ?? '—'}</span>
                  <span className={`pill ${c.mode === 'human' ? 'pill--human' : 'pill--ai'}`}>
                    {c.mode === 'human' ? 'Human' : 'AI'}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
