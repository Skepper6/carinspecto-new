// UAE deployment: UAE company, UAE bank account, AED, 5% VAT, Stripe.
export default {
  code: 'uae',
  currency: 'AED ',
  currencyCode: 'aed',          // ISO code the payment provider expects (amounts are sent in fils)
  paymentProvider: 'stripe',
  taxName: 'VAT',
  taxRate: 0.05,
  bookingFee: 15,
  promos: { FIRST10: 0.1, DUBAI15: 0.15 },
  company: { name: 'Car InspectO', phone: '+971 4 123 4567', email: 'hello@carinspecto.ae', web: 'www.carinspecto.ae' },
  demo: { customer: 'omar@example.com', inspector: 'khalid@carinspecto.com' },
};
