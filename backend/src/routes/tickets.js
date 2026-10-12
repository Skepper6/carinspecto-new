import { Router } from 'express';
import { z } from 'zod';
import { Booking, File, Ticket } from '../models/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { fail, notify, notifyAdmins, nextSeq, send } from '../services/helpers.js';
import { TICKET_PRIORITY, TICKET_STATUS } from '../config/constants.js';
import { mailSupportReply } from '../services/emails.js';
import { parse } from './auth.js';

const router = Router();
router.use(requireAuth);

const attachment = z.object({ id: z.string().min(8).max(40), name: z.string().max(200), size: z.number().max(10 * 1024 * 1024), type: z.string().max(100).optional().default('') });
const createSchema = z.object({
  subject: z.string().trim().min(4, 'Add a short subject.').max(140),
  category: z.string().trim().min(2).max(40), categoryDetail: z.string().trim().max(120).optional().default(''),
  priority: z.enum(TICKET_PRIORITY).default('medium'),
  message: z.string().trim().min(10, 'Please describe the issue (10+ characters).').max(4000),
  bookingId: z.string().max(20).nullable().optional(),
  attachments: z.array(attachment).max(5).optional().default([]),
});

const now = () => new Date();
// attachments must be files this user uploaded themselves
async function ownFiles(list, user) {
  if (!list.length) return [];
  const ids = list.map((a) => a.id);
  const found = await File.find({ _id: { $in: ids }, owner: user._id }).select('_id').catch(() => []);
  if (found.length !== new Set(ids).size) fail(400, 'One of the attachments could not be found. Please upload it again.');
  return list;
}
const find = async (code) => (await Ticket.findOne({ code })) ?? fail(404, 'Ticket not found.');
const canSee = (t, user) => user.role === 'admin' || (user.role === 'customer' && String(t.customer) === String(user._id));

router.post('/', requireRole('customer'), async (req, res) => {
  const d = parse(createSchema, req.body);
  if (d.bookingId && !(await Booking.exists({ code: d.bookingId, customer: req.user._id }))) fail(400, 'That booking was not found.');
  const attachments = await ownFiles(d.attachments, req.user);
  const stamp = now();
  const t = await Ticket.create({
    code: `T-${await nextSeq('ticket')}`, subject: d.subject, category: d.category, categoryDetail: d.categoryDetail, priority: d.priority,
    status: 'open', customer: req.user._id, bookingId: d.bookingId ?? undefined, createdAt: stamp,
    messages: [{ from: 'customer', text: d.message, at: stamp, attachments }],
  });
  await notifyAdmins('New support ticket', `${t.code} · ${d.subject}`);
  await send(res, { tickets: [t.toJSON()] }, { status: 201 });
});

router.post('/:code/reply', async (req, res) => {
  const d = parse(z.object({ text: z.string().trim().min(1, 'Write a message first.').max(4000), attachments: z.array(attachment).max(5).optional().default([]) }), req.body);
  const t = await find(req.params.code);
  if (!canSee(t, req.user)) fail(403, 'You do not have access to this.');
  const attachments = await ownFiles(d.attachments, req.user);
  const from = req.user.role === 'admin' ? 'admin' : 'customer';
  t.messages.push({ from, text: d.text, at: now(), attachments });
  if (from === 'admin') {
    if (t.status === 'open') t.status = 'in_progress';
    await notify(t.customer, 'Support replied', `${t.code} · ${t.subject}`);
    mailSupportReply(t.customer, t);
  } else if (t.status === 'resolved') t.status = 'open';   // a customer reply re-opens a resolved ticket
  await t.save();
  await send(res, { tickets: [t.toJSON()] });
});

router.post('/:code/status', requireRole('admin'), async (req, res) => {
  const { status } = parse(z.object({ status: z.enum(TICKET_STATUS) }), req.body);
  const t = await find(req.params.code);
  t.status = status;
  await t.save();
  await send(res, { tickets: [t.toJSON()] });
});

router.post('/:code/seen', async (req, res) => {
  const t = await find(req.params.code);
  if (!canSee(t, req.user)) fail(403, 'You do not have access to this.');
  const role = req.user.role === 'admin' ? 'admin' : 'customer';
  const last = t.messages[t.messages.length - 1];
  const prev = t.seen?.[role];
  if (prev && last && prev >= last.at.toISOString()) return send(res, { tickets: [t.toJSON()] }, { changed: false });
  t.seen = { ...(t.seen ?? {}), [role]: now().toISOString() };
  t.markModified('seen');
  await t.save();
  await send(res, { tickets: [t.toJSON()] });
});

export default router;
