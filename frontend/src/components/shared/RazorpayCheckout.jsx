import { useEffect } from 'react';
import { loadCheckout, payWithRazorpay } from '../../services/razorpay';

// Razorpay opens its own secure window when the customer presses Pay. `register` receives an async confirm() function.
export default function RazorpayCheckout({ amount, user, register }) {
  useEffect(() => {
    loadCheckout().catch(() => {});   // load early; confirm() reports the error if it still fails
    register(() => payWithRazorpay({ amount, name: user.name, email: user.email, phone: user.phone }));
  }, [amount, user, register]);
  return <p className="muted small mt-s">You will pay in Razorpay's secure window – UPI, cards, netbanking or wallets.</p>;
}
