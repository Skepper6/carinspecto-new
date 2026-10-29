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
  regionLabel: 'City',
  regionPlural: 'cities',
  serviceArea: 'Mumbai, Delhi, Bengaluru & more cities',
  regions: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'],
  // Mobile numbers: country code, 10 digits starting with 6-9.
  phone: { code: '91', nationalLength: 10, groups: [5, 5], startsWith: ['6', '7', '8', '9'], example: '+91 98765 43210' },
  company: { name: 'Car InspectO', phone: '+91 80 1234 5678', email: 'hello@carinspecto.in', web: 'www.carinspecto.in' },
  demo: { customer: 'rohan@example.com', inspector: 'vikram@carinspecto.com' },
  plans: { basic: 1499, standard: 2499, premium: 3999 },   // placeholders, excl. tax; the live prices live in the database and are edited by the admin
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
      ['Rohan Mehta', 'Mumbai'], ['Ananya Iyer', 'Bengaluru'], ['Arjun Singh', 'Delhi'], ['Sarah Thomas', 'Mumbai'],
      ['Imran Sheikh', 'Hyderabad'], ['Priya Nair', 'Chennai'], ['Karthik Reddy', 'Hyderabad'], ['Meera Banerjee', 'Kolkata'],
      ['Vivek Joshi', 'Pune'], ['Neha Patel', 'Ahmedabad'], ['Aditya Kapoor', 'Delhi'], ['Divya Menon', 'Bengaluru'],
    ],
    inspectors: [
      ['Vikram Rao', 'Mumbai', 'Luxury & performance specialist'], ['Suresh Kumar', 'Delhi', 'Diesel & SUV expert'],
      ['Imran Qureshi', 'Bengaluru', 'Sedan & hybrid specialist'], ['Harish Naidu', 'Hyderabad', 'EV & hybrid certified'],
      ['Pavan Shetty', 'Pune', 'Transmission specialist'],
    ],
    streets: ['Linking Road', 'MG Road', 'Outer Ring Road', 'Anna Salai', 'Park Street', 'SG Highway', 'Jubilee Hills Road', 'FC Road'],
    areas: ['Bandra', 'Koramangala', 'Indiranagar', 'Banjara Hills', 'Salt Lake', 'Andheri', 'Whitefield', 'Vasant Kunj'],
    buildingWord: 'Flat',
    coords: {
      Mumbai: [19.0760, 72.8777], Delhi: [28.6139, 77.2090], Bengaluru: [12.9716, 77.5946], Hyderabad: [17.3850, 78.4867],
      Chennai: [13.0827, 80.2707], Kolkata: [22.5726, 88.3639], Pune: [18.5204, 73.8567], Ahmedabad: [23.0225, 72.5714],
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
