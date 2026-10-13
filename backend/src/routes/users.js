import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Booking, Notification, User } from '../models/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { cleanAddress, cleanCard, fail, send } from '../services/helpers.js';
import { parse } from './auth.js';

const router = Router();
router.use(requireAuth);

const phone = z.string().trim().max(30);
const createSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name.').max(80),
  email: z.string().trim().toLowerCase().email('Enter a valid email.').max(120),
  phone: phone.optional().default(''), city: z.string().trim().min(2, 'Select a city.').max(40),
  specialization: z.string().trim().max(120).optional().default(''),
  pw: z.string().min(8, 'Password must be at least 8 characters.').max(100),
});

// Admin adds an inspector (inspectors cannot sign themselves up).
router.post('/', requireRole('admin'), async (req, res) => {
  const d = parse(createSchema, req.body);
  if (await User.exists({ email: d.email })) fail(409, 'This email is already in use.');
  const user = await User.create({
    role: 'inspector', name: d.name, email: d.email, phone: d.phone, city: d.city, specialization: d.specialization,
    rating: null, available: true, emailVerified: true, passwordHash: await bcrypt.hash(d.pw, 12),
  });
  await send(res, { users: [user.toJSON()] }, { status: 201 });
});

const SELF_FIELDS = {
  name: z.string().trim().min(2).max(80), phone, city: z.string().trim().max(40), specialization: z.string().trim().max(120),
  available: z.boolean(), addresses: z.array(z.record(z.string(), z.any())).max(20), paymentMethods: z.array(z.record(z.string(), z.any())).max(10),
};
const ADMIN_FIELDS = { status: z.enum(['active', 'suspended']) };

router.patch('/:id', async (req, res) => {
  const me = req.user;
  const isSelf = String(me._id) === req.params.id;
  if (!isSelf && me.role !== 'admin') fail(403, 'You do not have access to this.');
  const target = isSelf ? me : await User.findById(req.params.id);
  if (!target) fail(404, 'User not found.');
  if (target.role === 'admin' && !isSelf) fail(403, 'Admin accounts cannot be edited here.');

  const allowed = { ...SELF_FIELDS, ...(me.role === 'admin' && !isSelf ? ADMIN_FIELDS : {}) };
  const patch = {};
  for (const [k, v] of Object.entries(req.body ?? {})) {
    if (!allowed[k]) continue;                                   // role, email, password etc. can never be set here
    const r = allowed[k].safeParse(v);
    if (!r.success) fail(400, `Invalid ${k}.`);
    patch[k] = r.data;
  }
  // role-specific fields
  if (target.role !== 'customer') { delete patch.addresses; delete patch.paymentMethods; }
  if (target.role !== 'inspector') { delete patch.available; delete patch.specialization; }
  if (patch.addresses) patch.addresses = patch.addresses.map(cleanAddress);
  if (patch.paymentMethods) patch.paymentMethods = patch.paymentMethods.map(cleanCard);
  if (patch.status === 'suspended' && target.role === 'admin') fail(400, 'Admin accounts cannot be suspended.');

  target.set(patch);
  await target.save();
  await send(res, { users: [target.toJSON()] });
});

router.delete('/:id', requireRole('admin'), async (req, res) => {
  const target = await User.findById(req.params.id);
  if (!target) fail(404, 'User not found.');
  if (target.role === 'admin') fail(403, 'Admin accounts cannot be deleted.');
  // open work assigned to a removed inspector goes back to the unassigned queue
  const open = await Booking.find({ inspector: target._id, status: { $in: ['assigned', 'ongoing'] } });
  for (const b of open) { b.inspector = null; b.status = 'pending'; await b.save(); }
  await Notification.deleteMany({ user: target._id });
  await target.deleteOne();
  await send(res, { removedUserIds: [req.params.id], bookings: open.map((b) => b.toJSON()) });
});

export default router;
