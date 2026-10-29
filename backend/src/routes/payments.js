import crypto from 'node:crypto';
import { Router } from 'express';
import { z } from 'zod';
import { Booking, Payment } from '../models/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { bumpRev, fail, notifyAdmins } from '../services/helpers.js';
import { market } from '../config/market.js';
import { stripe } from '../services/stripe.js';
import { razorpay } from '../services/razorpay.js';
import { parse } from './auth.js';

const router = Router();

// Amounts arrive in whole currency units (e.g. 345.5) and are converted to the smallest unit (fils / paise).
const minor = (amount) => Math.round(amount * 100);
const amountSchema = z.object({ amount: z.number().min(2).max(market.code === 'in' ? 500000 : 50000) });

// UAE (Stripe): creates a PaymentIntent in AED.
router.post('/create-intent', requireAuth, requireRole('customer'), async (req, res) => {
  if (market.paymentProvider !== 'stripe') fail(404, 'Not found.');
  if (!stripe) fail(503, 'Stripe is not configured on the server (set STRIPE_SECRET_KEY).');
  const d = parse(amountSchema, req.body);
  try {
    const intent = await stripe.paymentIntents.create({
      amount: minor(d.amount), currency: market.currencyCode, automatic_payment_methods: { enabled: true },
      receipt_email: req.user.email, metadata: { app: 'car-inspecto', userId: String(req.user._id) },
    });
    res.json({ clientSecret: intent.client_secret, id: intent.id });
  } catch (err) {
    console.error('Stripe error:', err.message);
    fail(502, 'Could not create the payment.');
  }
});

// India (Razorpay): creates an order in INR. The browser opens Razorpay Checkout with this order id and the public key id.
router.post('/create-order', requireAuth, requireRole('customer'), async (req, res) => {
  if (market.paymentProvider !== 'razorpay') fail(404, 'Not found.');
  if (!razorpay) fail(503, 'Razorpay is not configured on the server (set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET).');
  const d = parse(amountSchema, req.body);
  try {
    const order = await razorpay.createOrder(minor(d.amount), `ci_${crypto.randomBytes(8).toString('hex')}`, { app: 'car-inspecto', userId: String(req.user._id) });
    res.json({ orderId: order.id, amount: order.amount, currency: order.currency, keyId: razorpay.keyId });
  } catch (err) {
    console.error('Razorpay error:', err.message);
    fail(502, 'Could not create the payment.');
  }
});

// A refund made in the provider's dashboard shows up on the booking too.
async function markRefunded(txnId) {
  const payment = txnId ? await Payment.findOne({ txnId }) : null;
  if (!payment || payment.status === 'refunded') return;
  payment.status = 'refunded';
  await payment.save();
  const b = await Booking.findOne({ code: payment.bookingCode });
  if (b) {
    b.payment = { ...b.payment, status: 'refunded' };
    b.timeline.push({ at: new Date(), label: 'Refund confirmed by the payment provider', by: 'System' });
    await b.save();
  }
  await bumpRev();
}

// Money was taken: five minutes later there must be a booking for it, otherwise the team is told.
function watchForOrphan(txnId, amountMinor, email, provider) {
  setTimeout(async () => {
    try {
      if (await Payment.exists({ txnId })) return;
      await notifyAdmins('Payment without a booking', `${txnId} · ${market.currency}${(amountMinor / 100).toFixed(2)} · ${email ?? 'no email'} – check ${provider} and contact the customer.`);
      await bumpRev();
    } catch (e) { console.error('Orphan payment check failed:', e.message); }
  }, 5 * 60 * 1000).unref();
}

// Stripe calls this with a signed event. It must receive the raw request body, so server.js mounts it before the JSON parser.
// Setup: Stripe dashboard > Developers > Webhooks > add  https://<your-api>/api/payments/webhook  for
// charge.refunded and payment_intent.succeeded, then put the signing secret in STRIPE_WEBHOOK_SECRET.
export async function stripeWebhook(req, res) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !secret) return res.status(503).json({ error: 'Webhooks are not configured.' });
  let event;
  try { event = stripe.webhooks.constructEvent(req.body, req.get('stripe-signature'), secret); }
  catch { return res.status(400).json({ error: 'Invalid signature.' }); }

  try {
    if (event.type === 'charge.refunded') {
      const charge = event.data.object;
      if (charge.refunded && charge.payment_intent) await markRefunded(charge.payment_intent);
    } else if (event.type === 'payment_intent.succeeded') {
      const pi = event.data.object;
      watchForOrphan(pi.id, pi.amount, pi.receipt_email, 'Stripe');
    }
  } catch (e) {
    console.error('Webhook handling failed:', e.message);
    return res.status(500).json({ error: 'Could not process the event.' });   // Stripe retries
  }
  res.json({ received: true });
}

// Razorpay calls this with a signed event (raw body, mounted in server.js like the Stripe one).
// Setup: Razorpay dashboard > Account & Settings > Webhooks > add  https://<your-api>/api/payments/razorpay-webhook  with a secret,
// events payment.captured and refund.processed, then put that secret in RAZORPAY_WEBHOOK_SECRET.
export async function razorpayWebhook(req, res) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!razorpay || !secret) return res.status(503).json({ error: 'Webhooks are not configured.' });
  if (!Buffer.isBuffer(req.body) || !razorpay.verifyWebhook(req.body, req.get('x-razorpay-signature'), secret)) return res.status(400).json({ error: 'Invalid signature.' });

  try {
    const event = JSON.parse(req.body.toString('utf8'));
    if (event.event === 'refund.processed') {
      await markRefunded(event.payload?.refund?.entity?.payment_id);
    } else if (event.event === 'payment.captured') {
      const p = event.payload?.payment?.entity;
      if (p?.id) watchForOrphan(p.id, p.amount, p.email, 'Razorpay');
    }
  } catch (e) {
    console.error('Webhook handling failed:', e.message);
    return res.status(500).json({ error: 'Could not process the event.' });   // Razorpay retries
  }
  res.json({ received: true });
}

export default router;
