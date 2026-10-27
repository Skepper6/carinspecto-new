// India deployment: India company, Indian bank account, INR, GST.
// TODO: every value below is a placeholder. Keep in step with backend/src/config/markets/in.js.
export default {
  code: 'in',
  country: 'India',
  currency: '₹',
  taxName: 'GST',
  taxRate: 0.18, // TODO: confirm with your accountant
  bookingFee: 0, // TODO
  regionLabel: 'City',
  regionPlural: 'cities',
  serviceArea: 'TODO: service area', // TODO
  regions: ['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad'], // TODO: confirm service cities
  // Mobile numbers: country code, 10 digits starting with 6-9.
  phone: { code: '91', nationalLength: 10, groups: [5, 5], startsWith: ['6', '7', '8', '9'], example: '+91 98765 43210' },
  company: { name: 'TODO India company name', phone: 'TODO', email: 'TODO', web: 'TODO' },
};
