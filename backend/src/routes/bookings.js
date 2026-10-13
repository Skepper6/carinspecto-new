import { Router } from 'express';
import { z } from 'zod';
import { Booking, Payment, Plan, User } from '../models/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { cleanFlat, fail, notify, notifyAdmins, nextSeq, send } from '../services/helpers.js';
import { PROMOS, priceFor } from '../config/constants.js';
import { stripe } from '../services/stripe.js';
import { mailBookingConfirmed } from '../services/emails.js';
import { parse } from './auth.js';

const router = Router();
router.use(requireAuth);

const str = (n = 120) => z.string().trim().min(1).max(n);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Choose a valid date.');
const time = z.string().regex(/^\d{2}:\d{2}$/, 'Choose a valid time.');
const createSchema = z.object({
  car: z.object({ make: str(60), model: str(80), year: z.number().int().min(1950).max(new Date().getFullYear() + 1) }).passthrough(),
  location: z.object({ city: str(40) }).passthrough(),
  date, time, purpose: str(120), planId: str(40),
  promo: z.string().trim().max(30).optional().default(''),
  method: str(60), payStatus: z.enum(['paid', 'pending']),
  txnId: z.string().max(100).nullable().optional(),
});

const now = () => new Date();
const mine = (b, user) => String(b.customer) === String(user._id);
const find = async (code) => (await Booking.findOne({ code })) ?? fail(404, 'Booking not found.');

router.post('/', requireRole('customer'), async (req, res) => {
  const d = parse(createSchema, req.body);
  const plan = await Plan.findOne({ key: d.planId });
  if (!plan) fail(400, 'Choose a valid plan.');
  const today = new Date(); today.setDate(today.getDate() - 1);
  if (new Date(`${d.date}T00:00:00`) < today) fail(400, 'Choose a date that is not in the past.');
  const promoPct = d.promo ? PROMOS[d.promo.toUpperCase()] : 0;
  if (d.promo && promoPct === undefined) fail(400, 'That promo code is not valid.');
  const pricing = priceFor(plan.price, promoPct ?? 0);

  // A booking is only "paid" if Stripe confirms it (or, with no Stripe key configured, in demo mode).
  let txnId = `TXN${Math.floor(Math.random() * 1e9)}`;
  const payStatus = d.payStatus;
  if (payStatus === 'paid' && stripe) {
    if (!d.txnId?.startsWith('pi_')) fail(402, 'The payment could not be verified.');
    const pi = await stripe.paymentIntents.retrieve(d.txnId).catch(() => null);
    if (!pi || pi.status !== 'succeeded' || pi.currency !== 'aed' || pi.amount !== Math.round(pricing.total * 100)) fail(402, 'The payment could not be verified.');
    if (await Payment.exists({ txnId: pi.id })) fail(409, 'This payment was already used for another booking.');
    txnId = pi.id;
  } else if (payStatus === 'paid' && process.env.NODE_ENV === 'production' && process.env.ALLOW_DEMO_PAYMENTS !== 'true') fail(402, 'Card payments are not available right now.');   // ALLOW_DEMO_PAYMENTS=true: accept the booking without charging (until Stripe is configured)

  const customer = req.user;
  const code = `CI-${await nextSeq('booking')}`;
  const stamp = now();
  const booking = await Booking.create({
    code, customer: customer._id, inspector: null, car: cleanFlat(d.car), planId: plan.key, location: cleanFlat(d.location),
    date: d.date, time: d.time, status: 'pending', pricing, purpose: d.purpose, rating: null, createdAt: stamp,
    payment: { status: payStatus, method: d.method, txnId },
    timeline: [
      { at: stamp, label: 'Booking placed', by: customer.name },
      { at: stamp, label: payStatus === 'paid' ? 'Payment received' : 'Cash payment due on arrival', by: 'System' },
    ],
  });
  const payment = await Payment.create({ bookingCode: code, customer: customer._id, amount: pricing.total, vat: pricing.vat, status: payStatus, method: d.method, txnId, at: stamp });
  await notifyAdmins('New booking', `${code} · ${d.car.make} ${d.car.model} on ${d.date}`);
  const mineNote = await notify(customer._id, 'Booking confirmed', `${code} is confirmed. We will assign an inspector shortly.`);
  mailBookingConfirmed(customer._id, booking);
  await send(res, { bookings: [booking.toJSON()], payments: [payment.toJSON()], notifications: [mineNote.toJSON()] }, { status: 201 });
});

router.post('/:code/assign', requireRole('admin'), async (req, res) => {
  const { inspectorId } = parse(z.object({ inspectorId: z.string().min(10).max(40) }), req.body);
  const b = await find(req.params.code);
  if (['completed', 'cancelled'].includes(b.status)) fail(409, `A ${b.status} booking cannot be assigned.`);
  const insp = await User.findOne({ _id: inspectorId, role: 'inspector' }).catch(() => null);
  if (!insp) fail(400, 'Choose a valid inspector.');
  if (insp.status !== 'active') fail(400, 'That inspector is suspended.');
  b.inspector = insp._id;
  if (b.status === 'pending') b.status = 'assigned';
  b.timeline.push({ at: now(), label: `Assigned to ${insp.name}`, by: req.user.name });
  await b.save();
  await notify(insp._id, 'New inspection assigned', `${b.code} · ${b.car.make} ${b.car.model} on ${b.date} at ${b.time}`);
  await notify(b.customer, 'Inspector assigned', `${insp.name} will inspect your ${b.car.make} ${b.car.model}.`);
  await send(res, { bookings: [b.toJSON()] });
});

router.post('/:code/cancel', async (req, res) => {
  const b = await find(req.params.code);
  const admin = req.user.role === 'admin';
  if (!admin && !(req.user.role === 'customer' && mine(b, req.user))) fail(403, 'You do not have access to this.');
  if (b.status === 'cancelled') fail(409, 'This booking is already cancelled.');
  if (b.status === 'completed') fail(409, 'A completed inspection cannot be cancelled.');
  if (!admin && b.status === 'ongoing') fail(409, 'This inspection has already started. Please contact support.');

  const payment = await Payment.findOne({ bookingCode: b.code });
  const wasPaid = b.payment?.status === 'paid';
  if (wasPaid && stripe && b.payment.txnId?.startsWith('pi_')) {
    try { await stripe.refunds.create({ payment_intent: b.payment.txnId }); }
    catch (e) { if (e?.code !== 'charge_already_refunded') fail(502, 'The refund could not be processed. Please try again or contact support.'); }
  }
  b.status = 'cancelled';
  if (wasPaid) { b.payment = { ...b.payment, status: 'refunded' }; if (payment) payment.status = 'refunded'; }
  b.timeline.push({ at: now(), label: wasPaid ? 'Booking cancelled – refund initiated' : 'Booking cancelled', by: req.user.name });
  await b.save();
  if (payment) await payment.save();
  if (b.inspector) await notify(b.inspector, 'Inspection cancelled', `${b.code} was cancelled.`);
  if (admin) await notify(b.customer, 'Booking cancelled', `${b.code} was cancelled by our team.${wasPaid ? ' Your refund has been initiated.' : ''}`);
  await send(res, { bookings: [b.toJSON()], payments: payment ? [payment.toJSON()] : [] });
});

router.post('/:code/reschedule', async (req, res) => {
  const d = parse(z.object({ date, time }), req.body);
  const b = await find(req.params.code);
  const admin = req.user.role === 'admin';
  if (!admin && !(req.user.role === 'customer' && mine(b, req.user))) fail(403, 'You do not have access to this.');
  if (!['pending', 'assigned'].includes(b.status)) fail(409, `A ${b.status} booking cannot be rescheduled.`);
  const today = new Date(); today.setDate(today.getDate() - 1);
  if (new Date(`${d.date}T00:00:00`) < today) fail(400, 'Choose a date that is not in the past.');
  b.date = d.date; b.time = d.time;
  b.timeline.push({ at: now(), label: `Rescheduled to ${d.date} ${d.time}`, by: req.user.name });
  await b.save();
  if (b.inspector) await notify(b.inspector, 'Inspection rescheduled', `${b.code} moved to ${d.date} at ${d.time}.`);
  await send(res, { bookings: [b.toJSON()] });
});

router.post('/:code/rate', requireRole('customer'), async (req, res) => {
  const { rating } = parse(z.object({ rating: z.number().int().min(1).max(5) }), req.body);
  const b = await find(req.params.code);
  if (!mine(b, req.user)) fail(403, 'You do not have access to this.');
  if (b.status !== 'completed') fail(409, 'You can rate an inspection once it is completed.');
  b.rating = rating;
  await b.save();
  await send(res, { bookings: [b.toJSON()] });
});

export default router;
