import { market } from '../config/market.js';
import { fail } from './helpers.js';
import { stripe } from './stripe.js';
import { razorpay } from './razorpay.js';

// One interface over the payment provider each market uses (UAE: Stripe, India: Razorpay), so bookings and
// refunds do not care which one is behind it.
//   configured                      false = no keys, demo mode
//   verify({ txnId, proof, amount }) confirms with the provider that this exact amount was paid; returns the transaction id
//   refund(txnId)                    full refund; throws a 502 if the provider refuses
//   owns(txnId)                      true when the id looks like one of this provider's payments

const stripeGateway = {
  name: 'Stripe',
  configured: Boolean(stripe),
  owns: (txnId) => Boolean(txnId?.startsWith('pi_')),
  async verify({ txnId, amount }) {
    if (!txnId?.startsWith('pi_')) fail(402, 'The payment could not be verified.');
    const pi = await stripe.paymentIntents.retrieve(txnId).catch(() => null);
    if (!pi || pi.status !== 'succeeded' || pi.currency !== market.currencyCode || pi.amount !== Math.round(amount * 100)) fail(402, 'The payment could not be verified.');
    return pi.id;
  },
  async refund(txnId) {
    try { await stripe.refunds.create({ payment_intent: txnId }); }
    catch (e) { if (e?.code !== 'charge_already_refunded') fail(502, 'The refund could not be processed. Please try again or contact support.'); }
  },
};

const razorpayGateway = {
  name: 'Razorpay',
  configured: Boolean(razorpay),
  owns: (txnId) => Boolean(txnId?.startsWith('pay_')),
  async verify({ txnId, proof, amount }) {
    if (!txnId?.startsWith('pay_') || !proof?.orderId || !proof?.signature) fail(402, 'The payment could not be verified.');
    if (!razorpay.verifySignature(proof.orderId, txnId, proof.signature)) fail(402, 'The payment could not be verified.');
    let p = await razorpay.fetchPayment(txnId).catch(() => null);
    // Accounts that do not auto-capture leave the payment "authorized"; capture it now or it is released after a few days
    if (p?.status === 'authorized') p = await razorpay.capture(txnId, p.amount, p.currency).catch(() => null);
    if (!p || p.status !== 'captured' || p.currency !== market.currencyCode.toUpperCase() || p.amount !== Math.round(amount * 100) || p.order_id !== proof.orderId) fail(402, 'The payment could not be verified.');
    return p.id;
  },
  async refund(txnId) {
    try { await razorpay.refund(txnId); }
    catch (e) { if (!/already.*refund|fully refunded/i.test(e?.message ?? '')) fail(502, 'The refund could not be processed. Please try again or contact support.'); }
  },
};

export const gateway = market.paymentProvider === 'razorpay' ? razorpayGateway : stripeGateway;
