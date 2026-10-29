import { api } from '../lib/api';

const key = import.meta.env.VITE_RAZORPAY_KEY_ID;

export const razorpayEnabled = Boolean(key);

// Asks the API (which holds the key secret) to create an order in INR; the response carries the public key id for Checkout.
const createOrder = ({ amount }) => api('POST', '/payments/create-order', { amount });

let script;
// Razorpay Checkout is loaded from Razorpay's own server on demand, as their integration requires.
export function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  script ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = resolve;
    s.onerror = () => { script = null; s.remove(); reject(new Error('Could not load the payment window. Check your connection and try again.')); };
    document.head.append(s);
  });
  return script;
}

// Opens the Razorpay window (UPI, cards, netbanking, wallets). Resolves with the payment id and the proof the server checks;
// rejects if the customer closes the window. A failed attempt is left to Razorpay's own retry screen.
export async function payWithRazorpay({ amount, name, email, phone }) {
  const [order] = await Promise.all([createOrder({ amount }), loadCheckout()]);
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: order.keyId, order_id: order.orderId, amount: order.amount, currency: order.currency,
      name: 'Car InspectO', description: 'Car inspection',
      prefill: { name, email, contact: (phone ?? '').replace(/\s/g, '') },
      theme: { color: '#33237f' },
      modal: { ondismiss: () => reject(new Error('The payment window was closed before the payment finished.')) },
      handler: (r) => resolve({ id: r.razorpay_payment_id, proof: { orderId: r.razorpay_order_id, signature: r.razorpay_signature } }),
    });
    rzp.open();
  });
}
