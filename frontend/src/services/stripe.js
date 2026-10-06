import { loadStripe } from '@stripe/stripe-js';

const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export const stripeEnabled = Boolean(key);
export const stripePromise = key ? loadStripe(key) : null;

// Asks the Express API (which holds the secret key) to create a PaymentIntent in AED.
export async function createPaymentIntent({ amount, email }) {
  const res = await fetch(`${API}/payments/create-intent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ amount, email }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'Payment server error');
  return res.json();
}
