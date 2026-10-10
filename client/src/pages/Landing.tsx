import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Business } from '../api';
import ChatWidget from '../components/ChatWidget';

const FEATURES = [
  {
    title: 'Trained on your business only',
    body: 'The agent answers from the information you give it — your prices, your timings, your policies. It never invents details, which is exactly what a support bot must guarantee.',
  },
  {
    title: 'Streaming, human-feeling replies',
    body: 'Answers appear word-by-word the moment a customer asks. No waiting, no ticket queues, at 2 PM or 2 AM.',
  },
  {
    title: 'Take over any chat, live',
    body: 'Watch conversations from your dashboard. When a customer needs a person, reply yourself — the customer sees your answer in the same chat, instantly.',
  },
  {
    title: 'Know what customers ask',
    body: 'Every conversation and every answer the agent gave is logged, with the source it used. Spot the questions you should add next.',
  },
];

const STEPS = [
  { n: '01', title: 'Add your business info', body: 'Enter the questions customers always ask — prices, timings, services — in plain words.' },
  { n: '02', title: 'Put the chat on your site', body: 'One widget on your website or Facebook page, styled with your brand colour.' },
  { n: '03', title: 'Customers get instant answers', body: 'The agent handles the routine questions. You only step in when it matters.' },
];

export default function Landing() {
  const [demo, setDemo] = useState<Business | null>(null);
  const [demoError, setDemoError] = useState('');

  useEffect(() => {
    api
      .demoBusiness()
      .then(({ business }) => setDemo(business))
      .catch(() => setDemoError('The live demo is unavailable right now — the API may still be starting.'));
  }, []);

  return (
    <div className="page">
      <header className="nav">
        <div className="nav__brand">
          <span className="logo">A</span> Assistly
        </div>
        <nav className="nav__links">
          <a href="#demo">Live demo</a>
          <a href="#features">Features</a>
          <a href="#how">How it works</a>
          <Link to="/login">Sign in</Link>
          <Link className="btn btn--small" to="/register">
            Get started free
          </Link>
        </nav>
      </header>

      <section className="hero">
        <div className="hero__copy">
          <div className="eyebrow">AI support agent for small businesses</div>
          <h1>
            Your customers ask the same questions every day.
            <span className="grad"> Let an agent answer them.</span>
          </h1>
          <p className="lede">
            Assistly trains an AI support agent on your own business information and puts it on your website.
            Customers get instant, accurate answers — and you step in only when a human really matters.
          </p>
          <div className="hero__cta">
            <Link className="btn" to="/register">
              Create your agent
            </Link>
            <a className="btn btn--ghost" href="#demo">
              Try the live demo
            </a>
          </div>
          <p className="hero__note">No card required · Set up in minutes · Built for shops, clinics, salons and services</p>
        </div>
      </section>

      <section id="demo" className="demo">
        <div className="demo__copy">
          <div className="eyebrow">Live demo</div>
          <h2>This is a real agent, answering right now</h2>
          <p>
            BrightSmile Dental Clinic is a demo business. Its agent only knows what the clinic taught it — try asking
            about cleaning prices, Saturday timings, braces, or booking. Then ask something it was never taught, and
            watch how honestly it hands over to a human.
          </p>
          <ul className="demo__points">
            <li>Answers cite the exact information they came from</li>
            <li>Unknown questions are handed to the team — never guessed</li>
            <li>The clinic owner sees this whole conversation in their dashboard</li>
          </ul>
          <p className="demo__login">
            Want to see the owner's side? <Link to="/login">Sign in</Link> with{' '}
            <code>owner@brightsmile.demo</code> / <code>demo1234</code>
          </p>
        </div>
        <div className="demo__frame">
          <div className="demo__bar">
            <span /> <span /> <span />
            <em>brightsmile-clinic.example</em>
          </div>
          {demo ? (
            <ChatWidget
              businessId={demo.id}
              businessName={demo.name}
              greeting={demo.greeting}
              color={demo.color}
              suggestions={[
                'What are your timings on Saturday?',
                'How much does teeth cleaning cost?',
                'Do you offer braces?',
                'Do you repair laptops?',
              ]}
            />
          ) : (
            <div className="demo__unavailable">{demoError || 'Loading the demo agent…'}</div>
          )}
        </div>
      </section>

      <section id="features" className="features">
        <div className="eyebrow">Why Assistly</div>
        <h2>Built like a product, not a toy</h2>
        <div className="features__grid">
          {FEATURES.map((f) => (
            <article key={f.title} className="card">
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="how" className="steps">
        <div className="eyebrow">How it works</div>
        <h2>Live on your site in three steps</h2>
        <div className="steps__grid">
          {STEPS.map((s) => (
            <article key={s.n} className="step">
              <div className="step__n">{s.n}</div>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </article>
          ))}
        </div>
        <div className="steps__cta">
          <Link className="btn" to="/register">
            Create your free agent
          </Link>
        </div>
      </section>

      <footer className="footer">
        <span>Assistly — AI support agents for small businesses.</span>
        <span>
          <Link to="/login">Owner sign in</Link> · <Link to="/register">Get started</Link>
        </span>
      </footer>
    </div>
  );
}
