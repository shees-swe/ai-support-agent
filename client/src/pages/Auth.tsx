import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, setToken } from '../api';

export function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api.login(email, password);
      setToken(token);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="auth__card" onSubmit={submit}>
        <div className="nav__brand">
          <span className="logo">A</span> Assistly
        </div>
        <h1>Owner sign in</h1>
        <p className="auth__sub">See your agent's conversations and take over whenever a customer needs you.</p>
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label>
          Password
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn--full" type="submit" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
        <p className="auth__alt">
          Demo owner account: <code>owner@brightsmile.demo</code> / <code>demo1234</code>
        </p>
        <p className="auth__alt">
          New here? <Link to="/register">Create your agent</Link>
        </p>
      </form>
    </div>
  );
}

export function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', businessName: '', industry: 'Business' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api.register(form);
      setToken(token);
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth">
      <form className="auth__card" onSubmit={submit}>
        <div className="nav__brand">
          <span className="logo">A</span> Assistly
        </div>
        <h1>Create your agent</h1>
        <p className="auth__sub">Two minutes from now, your customers can be getting instant answers.</p>
        <label>
          Your name
          <input value={form.name} onChange={set('name')} required autoComplete="name" />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={set('email')} required autoComplete="email" />
        </label>
        <label>
          Password
          <input type="password" value={form.password} onChange={set('password')} required minLength={6} autoComplete="new-password" />
        </label>
        <label>
          Business name
          <input value={form.businessName} onChange={set('businessName')} required placeholder="e.g. City Cuts Salon" />
        </label>
        <label>
          Type of business
          <select value={form.industry} onChange={set('industry')}>
            <option>Business</option>
            <option>Dental clinic</option>
            <option>Salon / barber</option>
            <option>Restaurant / cafe</option>
            <option>Retail shop</option>
            <option>Coaching / tuition</option>
            <option>Repair service</option>
            <option>Other service</option>
          </select>
        </label>
        {error && <div className="form-error">{error}</div>}
        <button className="btn btn--full" type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create my agent'}
        </button>
        <p className="auth__alt">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
