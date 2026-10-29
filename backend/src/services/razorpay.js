import crypto from 'node:crypto';

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;
// Override only for tests (a local stand-in server); the real API is the default.
const BASE = process.env.RAZORPAY_API_BASE || 'https://api.razorpay.com/v1';

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString('base64')}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(15000),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(json?.error?.description || `Razorpay responded ${res.status}`);
    err.status = res.status;
    err.code = json?.error?.code;
    throw err;
  }
  return json;
}

const hmac = (secret, text) => crypto.createHmac('sha256', secret).update(text).digest('hex');
const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Razorpay uses the smallest currency unit (paise) for every amount.
export const razorpay = keyId && keySecret ? {
  keyId,
  createOrder: (amountPaise, receipt, notes) => call('POST', '/orders', { amount: amountPaise, currency: 'INR', receipt, notes }),
  fetchPayment: (id) => call('GET', `/payments/${encodeURIComponent(id)}`),
  capture: (id, amountPaise, currency) => call('POST', `/payments/${encodeURIComponent(id)}/capture`, { amount: amountPaise, currency }),
  refund: (id) => call('POST', `/payments/${encodeURIComponent(id)}/refund`, { speed: 'normal' }),
  // The browser hands back razorpay_signature = HMAC_SHA256(order_id|payment_id, key secret)
  verifySignature: (orderId, paymentId, signature) => same(hmac(keySecret, `${orderId}|${paymentId}`), signature),
  // Webhooks are signed over the raw body with the webhook secret
  verifyWebhook: (rawBody, signature, secret) => same(hmac(secret, rawBody), signature),
} : null;
