import cors from 'cors';
import express from 'express';
import { routes } from './routes.js';
import { seedDemo } from './store.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '256kb' }));

app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/api', routes);

app.use((_req, res) => res.status(404).json({ error: 'Not found.' }));

const port = Number(process.env.PORT ?? 4000);
seedDemo();
app.listen(port, () => {
  console.log(`AI Support Agent API listening on http://localhost:${port}`);
  console.log('Demo owner login: owner@brightsmile.demo / demo1234');
});
