// India deployment: India company, Indian bank account, INR, GST, Razorpay.
// Placeholders to confirm before going live: GST rate and booking fee (accountant), promo codes, company details.
export default {
  code: 'in',
  currency: '₹',
  currencyCode: 'inr',          // ISO code the payment provider expects (amounts are sent in paise)
  paymentProvider: 'razorpay',
  taxName: 'GST',
  taxRate: 0.18, // confirm the GST rate for inspection services with your accountant
  bookingFee: 49, // placeholder
  promos: { FIRST10: 0.1 }, // placeholder
  company: { name: 'Car InspectO', phone: '+91 80 1234 5678', email: 'hello@carinspecto.in', web: 'www.carinspecto.in' },
  demo: { customer: 'rohan@example.com', inspector: 'vikram@carinspecto.com' },
};
