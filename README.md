# Assistly — AI Support Agent for Small Businesses

Assistly gives any small business (clinic, salon, shop, service) an AI support
agent trained on **its own business information**. Customers get instant,
accurate answers on the business's website; the owner watches every
conversation from a dashboard and can take over any chat live, in the same
thread.

![Stack](https://img.shields.io/badge/React_19-TypeScript-61dafb) ![API](https://img.shields.io/badge/Express-TypeScript-green) ![Streaming](https://img.shields.io/badge/Chat-SSE_streaming-teal)

## Try it in 60 seconds

```bash
npm run install:all   # installs root + server + client
npm run dev           # API on :4000, web on :5173 (one command)
```

Open http://localhost:5173

- **Live demo:** the landing page has a working agent for a demo dental
  clinic. Ask about cleaning prices, Saturday timings, braces — then ask
  something it was never taught ("Do you repair laptops?") and watch it
  hand over to a human instead of guessing.
- **Owner dashboard:** sign in with `owner@brightsmile.demo` / `demo1234`
  to see the clinic's conversations, stats, and knowledge base. Anything you
  ask the demo agent appears in that dashboard seconds later.
- **Be your own business:** register a new business, teach it 2–3 FAQs in
  the Knowledge Base, then open your widget page and chat with your own agent.

## What it does

| Feature | Where |
| --- | --- |
| Streaming AI chat (token-by-token, Server-Sent Events) | Landing demo + widget page |
| Knowledge base — the agent answers *only* from what the owner wrote | Dashboard → Knowledge base |
| Answer provenance — every AI reply cites the FAQ it came from, with confidence | Chat + dashboard |
| Honest fallback — unknown questions notify the team, never get invented | Engine |
| Live human takeover — owner replies in-thread; AI steps aside | Dashboard → Conversations |
| Multi-tenant — every business has isolated data, FAQs and chats | API |
| Stats — conversations, AI-answer rate, takeovers, 7-day activity | Dashboard → Overview |
| Embeddable widget — brand colour, greeting, one-line embed | Widget & settings |

## Architecture

```
client (React 19 + Vite + TS)            server (Express + TS)
┌────────────────────────────┐           ┌──────────────────────────────┐
│ Landing + live demo chat   │  REST     │ Auth (JWT, bcrypt)           │
│ Auth (login / register)    │ ────────▶ │ Knowledge base CRUD          │
│ Dashboard                  │  SSE      │ Chat engine (retrieval over  │
│  · Overview (stats)        │ ◀──────── │   the business's own FAQs)   │
│  · Knowledge base          │  stream   │ Conversations + takeover     │
│  · Conversations (live)    │           │ Stats                        │
│  · Widget & settings       │           │ In-memory store (see below)  │
│ Customer widget page       │           └──────────────────────────────┘
└────────────────────────────┘
```

### Key design decisions (the interview-worthy parts)

1. **Retrieval, not free generation.** The chat engine matches each customer
   message against the business's own FAQs (weighted token overlap,
   question matches count double) and answers with the owner's exact words.
   A support bot that invents a price is worse than no bot — so below a
   confidence threshold the agent says so and flags the conversation for a
   human. The `answer()` function is the single seam where a real LLM
   (OpenAI / Anthropic) can later be dropped in for rephrasing, with the
   retrieved FAQ passed as its only allowed source.

2. **Streaming over SSE.** Replies are emitted word-by-word as Server-Sent
   Events over a `fetch` stream, so the UI feels instant without the
   complexity of a persistent WebSocket. (A subtle bug lives here in every
   first implementation: `req.on('close')` fires as soon as the request body
   is consumed, which kills the stream — the disconnect listener belongs on
   the *response*. The fix is commented in `server/src/routes.ts`.)

3. **Takeover is a mode, not a separate tool.** A conversation is either
   `ai` or `human`. The moment the owner replies, the AI stops answering
   that thread; the customer's widget polls and shows the human reply in the
   same chat. Handing back is one click.

4. **In-memory store behind a data layer.** The whole product demos with
   zero infrastructure. All persistence goes through `server/src/store.ts`,
   so swapping in MongoDB/Postgres later touches one file, not the routes.

## Project layout

```
server/src/
  index.ts     app bootstrap + demo seed
  routes.ts    REST + SSE endpoints
  engine.ts    retrieval answer engine (the LLM seam)
  auth.ts      JWT auth middleware
  store.ts     data layer + demo business seed
client/src/
  pages/       Landing, Auth, Dashboard, Knowledge, Conversations,
               WidgetSettings, WidgetPage
  components/  ChatWidget (used by the demo and the real widget)
  api.ts       typed API client + SSE stream reader
```

## Production roadmap

- [ ] Persist the store in MongoDB (Mongoose models behind `store.ts`)
- [ ] Real LLM rephrasing behind the `answer()` seam, FAQ as sole source
- [ ] `widget.js` embed script (the settings page already generates the snippet)
- [ ] WhatsApp channel — the channel Pakistani businesses actually live on
- [ ] Deploy: API on Render/Railway, client on Vercel, env-based config

## Portfolio case study (short version)

**Problem.** Small businesses lose customers because the same questions
(prices, timings, booking) go unanswered for hours — owners can't sit on
chat all day, and a generic chatbot that guesses is worse than silence.

**What I built.** A multi-tenant SaaS: owners sign up, teach the agent
their own FAQs, and embed a streaming chat widget. The agent answers only
from that knowledge base, cites its source, and hands off honestly when it
doesn't know. Owners get a live dashboard with stats and one-click human
takeover.

**Decisions that mattered.** Retrieval over generation for trustworthiness;
SSE over WebSockets for streaming simplicity; takeover as a conversation
mode so the customer never leaves the thread; an in-memory data layer so
the product runs anywhere while persistence stays swappable.

**Stack.** React 19 · TypeScript · Vite · Express · JWT/bcrypt · SSE
streaming · zero-config in-memory store (Mongo-ready).
