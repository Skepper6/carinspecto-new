// UAE deployment: UAE company, UAE bank account, AED, 5% VAT, Stripe.
// Keep money, tax, company and demo values in step with backend/src/config/markets/uae.js.
export default {
  code: 'uae',
  country: 'UAE',
  currency: 'AED ',
  currencyCode: 'AED',
  locale: 'en-GB',
  paymentProvider: 'stripe',
  taxName: 'VAT',
  taxIdLabel: 'TRN',
  taxRate: 0.05,
  bookingFee: 15,
  regionLabel: 'Emirate',
  regionPlural: 'emirates',
  serviceArea: 'Dubai & all emirates',
  regions: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain', 'Al Ain'],
  // Mobile numbers: country code, 9 national digits starting with 5 (landlines are 8 digits).
  phone: { code: '971', nationalLength: 9, groups: [2, 3, 4], startsWith: ['5'], landlineLength: 8, example: '+971 50 123 4567' },
  company: { name: 'Car InspectO', phone: '+971 4 123 4567', email: 'hello@carinspecto.ae', web: 'www.carinspecto.ae' },
  demo: { customer: 'omar@example.com', inspector: 'khalid@carinspecto.com' },
  plans: { basic: 199, standard: 349, premium: 549 },   // excl. tax; the live prices live in the database and are edited by the admin
  payMethodsText: 'Credit/debit cards and Apple Pay (or cash on arrival)',
  currencyWord: 'dirham',
  specs: ['GCC', 'American', 'Japanese', 'European', 'Canadian', 'Korean', 'Chinese', 'Other'],   // regional specs offered on the inspection form
  // Placeholders and sample text shown in forms and on the landing page
  examples: { area: 'Dubai Marina', street: 'Al Wasl Road', building: 'Villa 12 or Marina Tower', landmark: 'Near Spinneys, opposite the mosque', plate: 'Dubai A 12345' },
  reviews: [
    ['Priya N.', 'Dubai Marina', 'The inspector caught a hidden repaint and a weak battery before a long road trip. Worth every dirham.'],
    ['Omar A.', 'Abu Dhabi', 'Booking took two minutes and the report was in my inbox before the inspector had even left.'],
    ['Sarah T.', 'Sharjah', 'Professional, punctual and the photo-backed report gave me total peace of mind about my SUV.'],
  ],
  // Governing-law clause in the report's terms. Wording should be reviewed by legal counsel.
  arbitration: 'in accordance with the rules of the Dubai International Arbitration Centre (DIAC)',
  // Demo data for `npm run seed` (see lib/seed.js)
  seed: {
    customers: [
      ['Omar Al Mansoori', 'Dubai'], ['Fatima Al Hashimi', 'Abu Dhabi'], ['Rashid Al Nuaimi', 'Sharjah'], ['Sarah Thompson', 'Dubai'],
      ['Ahmed Khan', 'Ajman'], ['Priya Nair', 'Dubai'], ['Khalid Al Suwaidi', 'Al Ain'], ['Layla Haddad', 'Sharjah'],
      ['James Carter', 'Dubai'], ['Mariam Al Ketbi', 'Ras Al Khaimah'], ['Yusuf Ibrahim', 'Abu Dhabi'], ['Elena Petrova', 'Dubai'],
    ],
    inspectors: [
      ['Khalid Rahman', 'Dubai', 'Luxury & performance specialist'], ['Suresh Kumar', 'Dubai', 'Diesel & SUV expert'],
      ['Imran Ali', 'Abu Dhabi', 'Sedan & hybrid specialist'], ['Hassan Mahmoud', 'Sharjah', 'EV & hybrid certified'],
      ['Pavel Novak', 'Al Ain', 'Transmission specialist'],
    ],
    streets: ['Sheikh Zayed Road', 'Al Wasl Road', 'Jumeirah Beach Road', 'Marina Walk', 'Al Khalidiyah St', 'Corniche Road', 'Al Majaz', 'Business Bay'],
    areas: ['Marina', 'Jumeirah', 'Downtown', 'Al Barsha', 'Deira', 'Khalidiyah', 'Al Nahda', 'Mirdif'],
    buildingWord: 'Villa',
    coords: {
      Dubai: [25.2048, 55.2708], 'Abu Dhabi': [24.4539, 54.3773], Sharjah: [25.3463, 55.4209], Ajman: [25.4052, 55.5136],
      'Ras Al Khaimah': [25.7895, 55.9432], Fujairah: [25.1288, 56.3265], 'Umm Al Quwain': [25.5647, 55.5534], 'Al Ain': [24.2075, 55.7447],
    },
    phones: {
      admin: '+971 50 000 0001',
      customer: (i) => `+971 50 ${String(1000000 + i * 73117).slice(0, 3)} ${String(1000 + i * 311).slice(0, 4)}`,
      inspector: (i) => `+971 55 ${String(2000000 + i * 51131).slice(0, 3)} ${String(2000 + i * 211).slice(0, 4)}`,
    },
    // Registration plate; `pick` and `r` are the seeded random helpers (call order matters for repeatable data)
    plate: (pick, r) => `${pick(['Dubai', 'Abu Dhabi', 'Sharjah'])} ${pick(['A', 'B', 'K', 'N', 'R'])} ${10000 + Math.floor(r() * 89999)}`,
    payMethods: ['Visa •••• 4242', 'Apple Pay', 'Mastercard •••• 8811'],
    cardBrands: ['Visa', 'Mastercard', 'Amex'],
  },
};
