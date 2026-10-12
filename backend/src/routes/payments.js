import { Router } from 'express';
import { z } from 'zod';
import { Booking, Payment } from '../models/index.js';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { bumpRev, fail, notifyAdmins } from '../services/helpers.js';
import { stripe } from '../services/stripe.js';
import { parse } from './auth.js';

const router = Router();

// Creates a PaymentIntent in AED. `amount` arrives in dirhams (e.g. 345.5) and is converted to fils.
router.post('/create-intent', requireAuth, requireRole('customer'), async (req, res) => {
  if (!stripe) fail(503, 'Stripe is not configured on the server (set STRIPE_SECRET_KEY).');
  const d = parse(z.object({ amount: z.number().min(2).max(50000) }), req.body);
  try {
    const intent = await stripe.paymentIntents.create({
      amount: Math.round(d.amount * 100), currency: 'aed', automatic_payment_methods: { enabled: true },
      receipt_email: req.user.email, metadata: { app: 'car-inspecto', userId: String(req.user._id) },
    });
    res.json({ clientSecret: intent.client_secret, id: intent.id });
  } catch (err) {
    console.error('Stripe error:', err.message);
    fail(502, 'Could not create the payment.');
  }
});

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
      // a refund made in the Stripe dashboard shows up on the booking too
      const charge = event.data.object;
      const payment = charge.refunded && charge.payment_intent ? await Payment.findOne({ txnId: charge.payment_intent }) : null;
      if (payment && payment.status !== 'refunded') {
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
    } else if (event.type === 'payment_intent.succeeded') {
      // money was taken: five minutes later there must be a booking for it, otherwise the team is told
      const pi = event.data.object;
      setTimeout(async () => {
        try {
          if (await Payment.exists({ txnId: pi.id })) return;
          await notifyAdmins('Payment without a booking', `${pi.id} · AED ${(pi.amount / 100).toFixed(2)} · ${pi.receipt_email ?? 'no email'} – check Stripe and contact the customer.`);
          await bumpRev();
        } catch (e) { console.error('Orphan payment check failed:', e.message); }
      }, 5 * 60 * 1000).unref();
    }
  } catch (e) {
    console.error('Webhook handling failed:', e.message);
    return res.status(500).json({ error: 'Could not process the event.' });   // Stripe retries
  }
  res.json({ received: true });
}

export default router;
