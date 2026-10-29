// Checks the India payment flow end to end WITHOUT real Razorpay keys:  npm run smoke:razorpay
// It starts a stand-in Razorpay API, a throwaway API server (MARKET=in, its own local database, nothing real) and
// tests orders, signature checks, wrong amounts, reused payments, refunds and webhooks. The throwaway database is dropped at the end.
import crypto from 'node:crypto';
import http from 'node:http';
import { execFileSync, spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

process.env.MARKET = 'in';   // so the expected totals below use India's tax and booking fee
const { priceFor } = await import('../config/constants.js');

const backend = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const FAKE_PORT = 5098; const API_PORT = 5097;
const KEY_ID = 'rzp_test_standin'; const KEY_SECRET = 'standin_secret'; const WH_SECRET = 'standin_webhook_secret';
const DB = 'mongodb://127.0.0.1:27017/carinspecto_rzp_smoke';
const BASE = `http://127.0.0.1:${API_PORT}/api`;
const hmac = (secret, text) => crypto.createHmac('sha256', secret).update(text).digest('hex');

let pass = 0; let failed = 0;
const ok = (cond, name, extra = '') => { if (cond) { pass++; console.log(`  ✓ ${name}`); } else { failed++; console.log(`  ✗ ${name} ${extra}`); } };

/* ---- stand-in Razorpay API ---- */
const orders = new Map(); const payments = new Map(); const refunds = [];
const fake = http.createServer((req, res) => {
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    const send = (code, json) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(json)); };
    const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
    if (req.headers.authorization !== `Basic ${auth}`) return send(401, { error: { code: 'BAD_REQUEST_ERROR', description: 'Authentication failed' } });
    const data = body ? JSON.parse(body) : {};
    const [, kind, id, action] = req.url.split('/');
    if (req.method === 'POST' && kind === 'orders') {
      const o = { id: `order_${crypto.randomBytes(6).toString('hex')}`, amount: data.amount, currency: data.currency, receipt: data.receipt, notes: data.notes };
      orders.set(o.id, o); return send(200, o);
    }
    const p = payments.get(id);
    if (!p) return send(400, { error: { code: 'BAD_REQUEST_ERROR', description: 'The id provided does not exist' } });
    if (req.method === 'GET') return send(200, p);
    if (action === 'capture') { p.status = 'captured'; return send(200, p); }
    if (action === 'refund') {
      if (p.refundError) return send(400, { error: { code: 'BAD_REQUEST_ERROR', description: p.refundError } });
      refunds.push(id); p.status = 'refunded'; return send(200, { id: `rfnd_${id}`, payment_id: id });
    }
    return send(404, {});
  });
});
await new Promise((r) => fake.listen(FAKE_PORT, '127.0.0.1', r));

/* ---- throwaway server with its own database ---- */
const env = {
  ...process.env, NODE_ENV: 'development', MARKET: 'in', PORT: String(API_PORT), MONGODB_URI: '', MONGODB_URI_LOCAL: DB,
  JWT_SECRET: crypto.randomBytes(32).toString('hex'), CLIENT_ORIGIN: 'http://localhost:5174', CLIENT_URL: 'http://localhost:5174',
  RAZORPAY_KEY_ID: KEY_ID, RAZORPAY_KEY_SECRET: KEY_SECRET, RAZORPAY_WEBHOOK_SECRET: WH_SECRET, RAZORPAY_API_BASE: `http://127.0.0.1:${FAKE_PORT}`,
  STRIPE_SECRET_KEY: '', STRIPE_WEBHOOK_SECRET: '', GOOGLE_CLIENT_ID: '', RESEND_API_KEY: '', MAIL_FROM: '', ALLOW_DEMO_PAYMENTS: '',
  DO_SPACES_BUCKET: '', DO_SPACES_REGION: '', DO_SPACES_ENDPOINT: '', DO_SPACES_KEY: '', DO_SPACES_SECRET: '',
};
let server;
async function cleanup() {
  server?.kill();
  fake.close();
  try { await mongoose.connect(DB); await mongoose.connection.dropDatabase(); await mongoose.disconnect(); } catch { /* nothing to drop */ }
}

try {
  console.log('Preparing a throwaway India database…');
  execFileSync(process.execPath, ['src/scripts/seed.js'], { cwd: backend, env, stdio: 'ignore' });
  server = spawn(process.execPath, ['server.js'], { cwd: backend, env, stdio: 'ignore' });
  for (let i = 0; ; i++) {
    if (i > 40) throw new Error('The test server did not start.');
    if (await fetch(`${BASE}/health`).then((r) => r.ok).catch(() => false)) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  const call = async (method, path, { token, body, raw, headers: extra } = {}) => {
    const headers = { ...extra };
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body) headers['Content-Type'] = 'application/json';
    const res = await fetch(BASE + path, { method, headers, body: raw ?? (body ? JSON.stringify(body) : undefined) });
    const text = await res.text();
    let json; try { json = JSON.parse(text); } catch { json = null; }
    return { status: res.status, json };
  };

  const email = `rzp${Date.now()}@example.com`;
  const su = await call('POST', '/auth/signup', { body: { name: 'Rzp Tester', email, password: 'goodpass1', phone: '', acceptTerms: true } });
  const token = su.json.token;
  const plans = (await call('GET', '/public')).json.state.plans;
  const total = priceFor(plans.find((p) => p.id === 'standard').price).total;
  const car = { type: 'SUV', make: 'Toyota', model: 'Fortuner', year: 2020, fuel: 'Diesel', reg: 'MH 02 AB 1234' };
  const loc = { building: 'Flat 1', street: 'Linking Road', area: 'Bandra', city: 'Mumbai', address: 'Flat 1, Linking Road, Bandra' };
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const book = (txnId, txnProof, time = '10:00') => call('POST', '/bookings', { token, body: { car, location: loc, date: tomorrow, time, purpose: 'Pre-purchase check', planId: 'standard', method: 'UPI / Card / Netbanking (Razorpay)', payStatus: 'paid', txnId, txnProof } });
  // what the customer's browser would hand back after paying in Razorpay Checkout
  const pay = (over = {}) => {
    const order = [...orders.values()].at(-1);
    const id = `pay_${crypto.randomBytes(7).toString('hex')}`;
    payments.set(id, { id, status: 'captured', amount: order.amount, currency: 'INR', order_id: order.id, ...over });
    return { id, proof: { orderId: order.id, signature: hmac(KEY_SECRET, `${order.id}|${id}`) } };
  };

  console.log('\nOrders');
  ok((await call('POST', '/payments/create-order', { body: { amount: total } })).status === 401, 'creating an order needs a login');
  ok((await call('POST', '/payments/create-intent', { token, body: { amount: total } })).status === 404, 'the Stripe endpoint is closed in the India market');
  ok((await call('POST', '/payments/create-order', { token, body: { amount: 0 } })).status === 400, 'an amount below the minimum is rejected');
  const ord = await call('POST', '/payments/create-order', { token, body: { amount: total } });
  ok(ord.status === 200 && ord.json.orderId?.startsWith('order_') && ord.json.keyId === KEY_ID, 'order created and the public key id returned');
  ok(ord.json.amount === total * 100 && ord.json.currency === 'INR', `amount is sent in paise (${ord.json.amount})`);
  ok(!JSON.stringify(ord.json).includes(KEY_SECRET), 'the key secret is never sent to the browser');

  console.log('\nBooking with a Razorpay payment');
  const good = pay();
  const bad = pay();
  ok((await book(good.id, { ...good.proof, signature: 'f'.repeat(64) })).status === 402, 'a wrong signature is rejected');
  ok((await book(good.id, null)).status === 402, 'a payment id without proof is rejected');
  ok((await book('pi_stripe_style', good.proof)).status === 402, 'a Stripe-style id is rejected');
  const cheap = pay({ amount: 100 });
  ok((await book(cheap.id, cheap.proof)).status === 402, 'a payment of a lower amount is rejected');
  const other = pay({ order_id: 'order_someone_else' });
  ok((await book(other.id, other.proof)).status === 402, 'a payment for a different order is rejected');
  const unpaid = pay({ status: 'failed' });
  ok((await book(unpaid.id, unpaid.proof)).status === 402, 'a failed payment is rejected');
  const usd = pay({ currency: 'USD' });
  ok((await book(usd.id, usd.proof)).status === 402, 'a payment in another currency is rejected');
  const made = await book(good.id, good.proof);
  ok(made.status === 201 && made.json.bookings[0].payment.status === 'paid' && made.json.bookings[0].payment.txnId === good.id, 'a verified payment creates a paid booking');
  ok(made.json.bookings[0].pricing.total === total && made.json.payments[0].amount === total, 'the booking total matches what was charged');
  ok((await book(good.id, good.proof, '11:00')).status === 409, 'the same payment cannot pay for a second booking');

  const auth = pay({ status: 'authorized' });
  const authBooking = await book(auth.id, auth.proof, '12:30');
  ok(authBooking.status === 201 && payments.get(auth.id).status === 'captured', 'an authorized payment is captured by the server before the booking is accepted');

  console.log('\nCancel & refund');
  const c1 = await call('POST', `/bookings/${made.json.bookings[0].id}/cancel`, { token });
  ok(c1.json?.bookings?.[0]?.status === 'cancelled' && c1.json.bookings[0].payment.status === 'refunded', 'cancelling a paid booking refunds it');
  ok(refunds.includes(good.id), 'the refund was requested from Razorpay for that payment');
  const failing = pay({ refundError: 'Refunds are temporarily unavailable' });
  const b3 = await book(failing.id, failing.proof, '14:00');
  const c3 = await call('POST', `/bookings/${b3.json.bookings[0].id}/cancel`, { token });
  ok(c3.status === 502, 'if Razorpay refuses the refund the cancellation fails and the customer is told');
  const stillThere = (await call('GET', '/bootstrap', { token })).json.state.bookings.find((b) => b.id === b3.json.bookings[0].id);
  ok(stillThere.status !== 'cancelled' && stillThere.payment.status === 'paid', 'the booking stays paid and active after a failed refund');
  const done = pay({ refundError: 'The payment has been fully refunded already' });
  const b4 = await book(done.id, done.proof, '15:30');
  const c4 = await call('POST', `/bookings/${b4.json.bookings[0].id}/cancel`, { token });
  ok(c4.json?.bookings?.[0]?.status === 'cancelled', 'a payment already refunded in the dashboard does not block the cancellation');

  console.log('\nWebhook');
  const evt = (payment_id) => JSON.stringify({ event: 'refund.processed', payload: { refund: { entity: { id: 'rfnd_1', payment_id } } } });
  const post = (raw, sig) => call('POST', '/payments/razorpay-webhook', { raw, headers: { 'Content-Type': 'application/json', ...(sig ? { 'x-razorpay-signature': sig } : {}) } });
  const rawEvt = evt(auth.id);
  ok((await post(rawEvt, null)).status === 400, 'an unsigned event is rejected');
  ok((await post(rawEvt, 'a'.repeat(64))).status === 400, 'a wrongly signed event is rejected');
  ok((await post(rawEvt, hmac('not-the-secret', rawEvt))).status === 400, 'an event signed with another secret is rejected');
  ok((await post(rawEvt, hmac(WH_SECRET, rawEvt))).status === 200, 'a correctly signed refund event is accepted');
  const after = (await call('GET', '/bootstrap', { token })).json.state;
  ok(after.bookings.find((b) => b.id === authBooking.json.bookings[0].id).payment.status === 'refunded', 'a refund made in the Razorpay dashboard shows up on the booking');
  ok(after.payments.find((p) => p.txnId === auth.id).status === 'refunded', 'and on the payment record');
  ok((await post(evt('pay_unknown'), hmac(WH_SECRET, evt('pay_unknown')))).status === 200, 'an event for an unknown payment is acknowledged, not retried forever');
} catch (e) {
  failed++;
  console.log(`  ✗ test run aborted: ${e.message}`);
} finally {
  await cleanup();
}

console.log(`\n${pass} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
