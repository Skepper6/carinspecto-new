import { market } from '../lib/market';
import { stripeEnabled } from './stripe';
import { razorpayEnabled } from './razorpay';

// What the checkout shows for the market's payment provider (UAE: Stripe, India: Razorpay).
const razorpay = market.paymentProvider === 'razorpay';

export const onlineEnabled = razorpay ? razorpayEnabled : stripeEnabled;
export const onlineLabel = razorpay ? 'UPI · Cards · Netbanking · Wallets' : 'Card · Apple Pay · Google Pay';
export const onlineMethodName = razorpay ? 'UPI / Card / Netbanking (Razorpay)' : 'Card / Apple Pay (Stripe)';
export const onlineKeyHint = razorpay ? 'Razorpay key id (VITE_RAZORPAY_KEY_ID)' : 'Stripe publishable key';
