import { Router } from 'express';
import { z } from 'zod';
import { Booking, Inspection } from '../models/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { fail, notify, notifyAdmins, send } from '../services/helpers.js';
import { lightInspection } from '../services/state.js';
import { mailReportReady } from '../services/emails.js';
import { inflateInspection, offloadData, offloadPhotos, storedKeys } from '../services/photos.js';
import { parse } from './auth.js';

const router = Router();
router.use(requireAuth);

const now = () => new Date();
const COVER = 'Cover';

// the booking must be assigned to the signed-in inspector
async function myBooking(code, user) {
  const b = (await Booking.findOne({ code })) ?? fail(404, 'Booking not found.');
  if (String(b.inspector) !== String(user._id)) fail(403, 'This inspection is not assigned to you.');
  if (b.status === 'cancelled') fail(409, 'This booking was cancelled.');
  return b;
}

router.post('/:code/start', requireRole('inspector'), async (req, res) => {
  const b = await myBooking(req.params.code, req.user);
  if (b.status !== 'assigned') return send(res, { bookings: [b.toJSON()] }, { changed: false });   // already started / done
  b.status = 'ongoing';
  b.timeline.push({ at: now(), label: 'Inspection started', by: req.user.name });
  await b.save();
  const ins = await Inspection.findOneAndUpdate({ bookingCode: b.code }, { $setOnInsert: { bookingCode: b.code, status: 'draft', data: {}, photos: [], comment: '', updatedAt: now() } }, { upsert: true, returnDocument: 'after' });
  await notify(b.customer, 'Inspection started', `${req.user.name} has started inspecting your ${b.car.make} ${b.car.model}.`);
  await send(res, { bookings: [b.toJSON()], inspections: [lightInspection(ins)] });
});

const saveSchema = z.object({
  data: z.record(z.string(), z.any()).optional(),
  photos: z.array(z.record(z.string(), z.any())).max(80).optional(),
  comment: z.string().max(5000).optional(),
});
router.put('/:code', requireRole('inspector'), async (req, res) => {
  const d = parse(saveSchema, req.body);
  const b = await myBooking(req.params.code, req.user);
  if (!['ongoing', 'completed'].includes(b.status)) fail(409, 'Start the inspection before saving it.');
  const ins = (await Inspection.findOne({ bookingCode: b.code })) ?? fail(404, 'Inspection not found.');
  const known = storedKeys(ins);
  if (d.data) ins.data = await offloadData(b.code, d.data, known);
  if (d.photos) ins.photos = await offloadPhotos(b.code, d.photos, known);
  if (d.comment !== undefined) ins.comment = d.comment;
  ins.updatedAt = now();
  ins.markModified('data'); ins.markModified('photos');
  await ins.save();
  await send(res, { savedAt: ins.updatedAt });
});

router.post('/:code/complete', requireRole('inspector'), async (req, res) => {
  const b = await myBooking(req.params.code, req.user);
  const ins = (await Inspection.findOne({ bookingCode: b.code })) ?? fail(404, 'Inspection not found.');
  if (b.status === 'completed') return send(res, { bookings: [b.toJSON()], inspections: [lightInspection(ins)] }, { changed: false });
  if (b.status !== 'ongoing') fail(409, 'Start the inspection before completing it.');
  if (!ins.photos.some((p) => p.category === COVER) || ins.photos.length < 3) fail(400, 'Add a cover photo and at least 3 photos before finishing.');
  if (ins.photos.some((p) => ['Cover', 'Exterior'].includes(p.category) && !p.plateChecked)) fail(400, 'Cover the number plate with the logo (or confirm that no plate is visible) on every cover and exterior photo before finishing.');
  ins.status = 'completed'; ins.completedAt = now(); ins.updatedAt = now();
  b.status = 'completed';
  b.timeline.push({ at: now(), label: 'Inspection completed & report generated', by: req.user.name });
  await ins.save(); await b.save();
  await notify(b.customer, 'Inspection report ready', `Your report for ${b.code} is ready to view and download.`);
  mailReportReady(b.customer, b);
  await notifyAdmins('Inspection completed', `${b.code} by ${req.user.name}`);
  await send(res, { bookings: [b.toJSON()], inspections: [lightInspection(ins)] });
});

// Full record including photos – loaded on demand (report view, PDF, the inspection form).
router.get('/:code', async (req, res) => {
  const b = (await Booking.findOne({ code: req.params.code })) ?? fail(404, 'Booking not found.');
  const u = req.user;
  const ok = u.role === 'admin' || (u.role === 'inspector' && String(b.inspector) === String(u._id)) || (u.role === 'customer' && String(b.customer) === String(u._id));
  if (!ok) fail(403, 'You do not have access to this.');
  const ins = (await Inspection.findOne({ bookingCode: b.code })) ?? fail(404, 'No inspection yet.');
  if (u.role === 'customer' && ins.status !== 'completed') fail(403, 'This report is not ready yet.');
  res.json({ inspection: await inflateInspection(ins.toJSON()) });
});

export default router;
