import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import { ZodError } from 'zod';
import { connectDB } from './src/config/db.js';
import { ensureCounters, HttpError } from './src/services/helpers.js';
import syncRoutes from './src/routes/sync.js';
import authRoutes from './src/routes/auth.js';
import userRoutes from './src/routes/users.js';
import bookingRoutes from './src/routes/bookings.js';
import inspectionRoutes from './src/routes/inspections.js';
import ticketRoutes from './src/routes/tickets.js';
import fileRoutes from './src/routes/files.js';
import paymentRoutes, { stripeWebhook } from './src/routes/payments.js';
import miscRoutes from './src/routes/misc.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET is missing or too short (use 32+ random characters). See backend/.env.example.');
  process.exit(1);
}
if (process.env.NODE_ENV === 'production' && !process.env.STRIPE_SECRET_KEY && process.env.ALLOW_DEMO_PAYMENTS !== 'true') {
  console.error('Live mode needs STRIPE_SECRET_KEY. Without it anyone could create a booking marked as paid. (Set ALLOW_DEMO_PAYMENTS=true only for a cash-only launch.)');
  process.exit(1);
}
if (!(await connectDB())) {
  console.error('Cannot start without the database. Check MONGODB_URI in backend/.env.');
  process.exit(1);
}
await ensureCounters();

const app = express();
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',').map((s) => s.trim()) : true }));
app.use(compression());
app.post('/api/payments/webhook', express.raw({ type: 'application/json', limit: '1mb' }), stripeWebhook);   // needs the raw body
const bigJson = express.json({ limit: '30mb' });   // inspection saves carry compressed photos
app.use('/api/inspections', bigJson);
app.use(express.json({ limit: '2mb' }));
app.use('/api', rateLimit({ windowMs: 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Please slow down.' } }));

app.use('/api', syncRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/inspections', inspectionRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', miscRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
  if (err instanceof ZodError) return res.status(400).json({ error: err.issues[0]?.message ?? 'Invalid request.' });
  if (err?.type === 'entity.too.large') return res.status(413).json({ error: 'That is too large to upload.' });
  if (err?.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid request.' });
  if (err?.name === 'CastError') return res.status(400).json({ error: 'Invalid request.' });
  if (err?.code === 11000) return res.status(409).json({ error: 'That already exists.' });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on our side. Please try again.' });
});

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`Car InspectO API listening on http://localhost:${port}`));
