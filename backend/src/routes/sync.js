import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getContent, getPlans, buildState } from '../services/state.js';
import { getRev } from '../services/helpers.js';
import { dbState } from '../config/db.js';
import { stripe } from '../services/stripe.js';
import { storageEnabled } from '../services/storage.js';

const router = Router();

router.get('/health', (_req, res) => res.json({ ok: true, stripe: Boolean(stripe), storage: storageEnabled, db: dbState() }));

// Cheap change check the browser polls: only when the revision moves does it download its data again.
router.get('/rev', async (_req, res) => res.json({ rev: await getRev() }));

// What a visitor who is not signed in may see (landing pages, FAQ, terms).
router.get('/public', async (_req, res) => {
  const [plans, content, rev] = await Promise.all([getPlans(), getContent(), getRev()]);
  res.json({ rev, state: { plans, content, users: [], bookings: [], inspections: {}, payments: [], tickets: [], notifications: [] } });
});

// Everything the signed-in user is allowed to see.
router.get('/bootstrap', requireAuth, async (req, res) => {
  const rev = await getRev();
  res.json({ rev, user: req.user.toJSON(), state: await buildState(req.user) });
});

export default router;
