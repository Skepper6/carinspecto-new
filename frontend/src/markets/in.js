// India deployment: India company, Indian bank account, INR, GST, Razorpay.
// Placeholders to confirm before going live: GST rate and booking fee (accountant), plan prices, service cities,
// company details and the arbitration clause (legal counsel). Keep money, tax, company and demo values in step
// with backend/src/config/markets/in.js.
export default {
  code: 'in',
  country: 'India',
  currency: '₹',
  currencyCode: 'INR',
  locale: 'en-IN',
  paymentProvider: 'razorpay',
  taxName: 'GST',
  taxIdLabel: 'GSTIN',
  taxRate: 0.18,
  bookingFee: 49,
  regionLabel: 'State',
  regionPlural: 'states',
  serviceArea: 'Maharashtra, Delhi, Karnataka & more states',
  regions: ['Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal', 'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu', 'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'],
  // Mobile numbers: country code, 10 digits starting with 6-9.
  phone: { code: '91', nationalLength: 10, groups: [5, 5], startsWith: ['6', '7', '8', '9'], example: '+91 98765 43210' },
  company: { name: 'Car InspectO', phone: '+91 80 1234 5678', email: 'hello@carinspecto.in', web: 'www.carinspecto.in' },
  demo: { customer: 'rohan@example.com', inspector: 'vikram@carinspecto.com' },
  plans: { basic: 1799, standard: 2999, premium: 4499 },   // placeholders, excl. tax; the live prices live in the database and are edited by the admin
  payMethodsText: 'UPI, credit/debit cards, netbanking and wallets (or cash on arrival)',
  currencyWord: 'rupee',
  specs: ['Indian', 'European', 'Japanese', 'American', 'Korean', 'Chinese', 'Other'],   // regional specs offered on the inspection form
  examples: { area: 'Bandra West', street: 'Linking Road', building: 'Flat 12, Sunrise Apartments', landmark: 'Near the metro station, opposite the temple', plate: 'MH 02 AB 1234' },
  reviews: [
    ['Priya N.', 'Bengaluru', 'The inspector caught a hidden repaint and a weak battery before a long road trip. Worth every rupee.'],
    ['Rohan M.', 'Mumbai', 'Booking took two minutes and the report was in my inbox before the inspector had even left.'],
    ['Sneha R.', 'Pune', 'Professional, punctual and the photo-backed report gave me total peace of mind about my SUV.'],
  ],
  // Governing-law clause in the report's terms. Seat of arbitration (Mumbai) is a placeholder; have legal counsel review.
  arbitration: 'under the Arbitration and Conciliation Act, 1996, before a sole arbitrator appointed by mutual consent, with the seat and venue of arbitration at Mumbai',
  seed: {
    customers: [
      ['Rohan Mehta', 'Maharashtra'], ['Ananya Iyer', 'Karnataka'], ['Arjun Singh', 'Delhi'], ['Sarah Thomas', 'Maharashtra'],
      ['Imran Sheikh', 'Telangana'], ['Priya Nair', 'Tamil Nadu'], ['Karthik Reddy', 'Telangana'], ['Meera Banerjee', 'West Bengal'],
      ['Vivek Joshi', 'Maharashtra'], ['Neha Patel', 'Gujarat'], ['Aditya Kapoor', 'Delhi'], ['Divya Menon', 'Karnataka'],
    ],
    inspectors: [
      ['Vikram Rao', 'Maharashtra', 'Luxury & performance specialist'], ['Suresh Kumar', 'Delhi', 'Diesel & SUV expert'],
      ['Imran Qureshi', 'Karnataka', 'Sedan & hybrid specialist'], ['Harish Naidu', 'Telangana', 'EV & hybrid certified'],
      ['Pavan Shetty', 'Maharashtra', 'Transmission specialist'],
    ],
    streets: ['Linking Road', 'MG Road', 'Outer Ring Road', 'Anna Salai', 'Park Street', 'SG Highway', 'Jubilee Hills Road', 'FC Road'],
    areas: ['Bandra', 'Koramangala', 'Indiranagar', 'Banjara Hills', 'Salt Lake', 'Andheri', 'Whitefield', 'Vasant Kunj'],
    buildingWord: 'Flat',
    coords: {
      Maharashtra: [19.0760, 72.8777], Delhi: [28.6139, 77.2090], Karnataka: [12.9716, 77.5946], Telangana: [17.3850, 78.4867],
      'Tamil Nadu': [13.0827, 80.2707], 'West Bengal': [22.5726, 88.3639], Gujarat: [23.0225, 72.5714],
    },
    phones: {
      admin: '+91 98000 00001',
      customer: (i) => `+91 ${98000 + i * 37} ${10000 + i * 7919}`,
      inspector: (i) => `+91 ${97000 + i * 53} ${20000 + i * 6131}`,
    },
    plate: (pick, r) => { const st = pick(['MH', 'DL', 'KA', 'TS', 'TN']); const series = pick(['AB', 'CD', 'EF', 'GH', 'JK']); const n = r(); return `${st} ${String(1 + Math.floor(n * 20)).padStart(2, '0')} ${series} ${1000 + Math.floor(((n * 20) % 1) * 8999)}`; },   // three random calls, like the UAE one, so the demo data has the same shape
    payMethods: ['UPI', 'Visa •••• 4242', 'Mastercard •••• 8811'],
    cardBrands: ['Visa', 'Mastercard', 'RuPay'],
  },
};
