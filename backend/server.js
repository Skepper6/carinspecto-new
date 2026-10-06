import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const app = express();
const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

app.use(cors({ origin: process.env.CLIENT_ORIGIN?.split(',') ?? true }));
app.use(express.json({ limit: '60mb' }));

app.get('/api/health', (_req, res) => res.json({ ok: true, stripe: Boolean(stripe) }));

// Creates a PaymentIntent in AED. `amount` arrives in dirhams (e.g. 345.5) and is converted to fils.
app.post('/api/payments/create-intent', async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Stripe is not configured on the server (set STRIPE_SECRET_KEY).' });
  const amount = Number(req.body?.amount);
  if (!Number.isFinite(amount) || amount < 2 || amount > 50000) return res.status(400).json({ error: 'Invalid amount.' });
  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'aed',
      automatic_payment_methods: { enabled: true },
      receipt_email: req.body?.email || undefined,
      metadata: { app: 'car-inspecto' },
    });
    res.json({ clientSecret: intent.client_secret, id: intent.id });
  } catch (err) {
    console.error('Stripe error:', err.message);
    res.status(502).json({ error: 'Could not create the payment.' });
  }
});

/* ---------- shared app state (demo sync) ----------
 * Every browser / device reads and writes the same state through these endpoints, so a message sent by the
 * admin reaches the customer anywhere. Optimistic concurrency: PUT must carry the revision it was based on;
 * on a mismatch the server answers 409 with the latest state and the client re-applies its pending changes. */
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.join(__dirname, 'data');
const FILES = path.join(DATA, 'files');
fs.mkdirSync(FILES, { recursive: true });
const STATE_FILE = path.join(DATA, 'state.json');
let store = { rev: 0, state: null };
try { store = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { /* first run */ }
const saveStore = () => fs.writeFile(STATE_FILE, JSON.stringify(store), () => {});

app.get('/api/state/rev', (_req, res) => res.json({ rev: store.rev }));
app.get('/api/state', (_req, res) => res.json(store));
app.put('/api/state', (req, res) => {
  const { baseRev, state } = req.body ?? {};
  if (!state || typeof state !== 'object') return res.status(400).json({ error: 'Invalid state.' });
  if (store.state && baseRev !== store.rev) return res.status(409).json(store);
  store = { rev: store.rev + 1, state };
  saveStore();
  res.json({ rev: store.rev });
});
app.delete('/api/state', (_req, res) => { store = { rev: store.rev + 1, state: null }; saveStore(); res.json({ ok: true }); });

// attachments (max 5 MB, images / pdf / word)
const okId = (id) => /^[\w-]{3,64}$/.test(id);
app.put('/api/files/:id', express.raw({ type: '*/*', limit: '6mb' }), (req, res) => {
  if (!okId(req.params.id) || !Buffer.isBuffer(req.body) || !req.body.length) return res.status(400).json({ error: 'Invalid file.' });
  fs.writeFileSync(path.join(FILES, req.params.id), req.body);
  fs.writeFileSync(path.join(FILES, `${req.params.id}.type`), String(req.get('content-type') || 'application/octet-stream'));
  res.json({ ok: true });
});
app.get('/api/files/:id', (req, res) => {
  if (!okId(req.params.id)) return res.status(400).end();
  const f = path.join(FILES, req.params.id);
  if (!fs.existsSync(f)) return res.status(404).end();
  let type = 'application/octet-stream';
  try { type = fs.readFileSync(`${f}.type`, 'utf8'); } catch { /* default */ }
  res.type(type).send(fs.readFileSync(f));
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Car InspectO API listening on http://localhost:${port}`));
