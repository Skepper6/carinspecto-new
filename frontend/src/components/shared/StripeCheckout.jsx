import { useEffect, useState } from 'react';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { createPaymentIntent, stripePromise } from '../../services/stripe';
import { Skeleton } from '../ui/kit';

function Form({ register }) {
  const stripe = useStripe();
  const elements = useElements();
  useEffect(() => {
    register(async () => {
      if (!stripe || !elements) throw new Error('The payment form is still loading.');
      const { error: submitErr } = await elements.submit();
      if (submitErr) throw new Error(submitErr.message);
      const { error, paymentIntent } = await stripe.confirmPayment({ elements, redirect: 'if_required' });
      if (error) throw new Error(error.message);
      return paymentIntent;
    });
  }, [stripe, elements, register]);
  return <PaymentElement options={{ layout: 'tabs' }} />;
}

// Stripe Payment Element (cards, Apple Pay, Google Pay). `register` receives an async confirm() function.
export default function StripeCheckout({ amount, email, register }) {
  const [secret, setSecret] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let off = false;
    setSecret(null); setError(null);
    createPaymentIntent({ amount, email }).then((d) => !off && setSecret(d.clientSecret)).catch((e) => !off && setError(e.message));
    return () => { off = true; };
  }, [amount, email]);

  if (error) return <p className="field-error">Could not start the payment: {error}. Check that the API server is running.</p>;
  if (!secret) return <Skeleton h={150} r={12} />;
  return (
    <div className="stripe-box">
      <Elements key={secret} stripe={stripePromise} options={{ clientSecret: secret, appearance: { theme: 'stripe', variables: { colorPrimary: '#33237f', borderRadius: '11px', fontFamily: 'Plus Jakarta Sans, system-ui, sans-serif' } } }}>
        <Form register={register} />
      </Elements>
    </div>
  );
}
