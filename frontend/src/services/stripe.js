import { loadStripe } from '@stripe/stripe-js';
import { api } from '../lib/api';

const key = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

export const stripeEnabled = Boolean(key);
export const stripePromise = key ? loadStripe(key) : null;

// Asks the API (which holds the secret key) to create a PaymentIntent in AED. The receipt goes to the signed-in user's email.
export const createPaymentIntent = ({ amount }) => api('POST', '/payments/create-intent', { amount });
