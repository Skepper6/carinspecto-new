import { Router } from 'express';
import { z } from 'zod';
import { Content, Notification, Plan } from '../models/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { fail, send } from '../services/helpers.js';
import { getContent } from '../services/state.js';
import { parse } from './auth.js';

const router = Router();
router.post('/notifications/read', requireAuth, async (req, res) => {
  const r = await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  const list = (await Notification.find({ user: req.user._id }).sort({ at: -1 }).limit(200)).map((n) => n.toJSON());
  await send(res, { notifications: list }, { changed: r.modifiedCount > 0 });
});

const faq = z.object({ id: z.string().min(1).max(40), q: z.string().trim().min(5).max(300), a: z.string().trim().min(10).max(3000) });
router.put('/content', requireAuth, requireRole('admin'), async (req, res) => {
  const d = parse(z.object({ faqs: z.array(faq).max(100).optional(), terms: z.string().max(50000).optional(), privacy: z.string().max(50000).optional() }), req.body);
  await Content.updateOne({ _id: 'main' }, { $set: d }, { upsert: true });
  await send(res, { content: await getContent() });
});

router.patch('/plans/:key', requireAuth, requireRole('admin'), async (req, res) => {
  const { price } = parse(z.object({ price: z.number().min(100, 'Enter a valid price.').max(100000) }), req.body);
  const plan = (await Plan.findOne({ key: req.params.key })) ?? fail(404, 'Plan not found.');
  plan.price = Math.round(price);
  await plan.save();
  await send(res, { plans: [plan.toJSON()] });
});

export default router;
