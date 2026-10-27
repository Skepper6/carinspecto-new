// UAE deployment: UAE company, UAE bank account, AED, 5% VAT.
// Keep these values in step with backend/src/config/markets/uae.js.
export default {
  code: 'uae',
  country: 'UAE',
  currency: 'AED ',
  taxName: 'VAT',
  taxRate: 0.05,
  bookingFee: 15,
  regionLabel: 'Emirate',
  regionPlural: 'emirates',
  serviceArea: 'Dubai & all emirates',
  regions: ['Dubai', 'Abu Dhabi', 'Sharjah', 'Ajman', 'Ras Al Khaimah', 'Fujairah', 'Umm Al Quwain', 'Al Ain'],
  // Mobile numbers: country code, 9 national digits starting with 5 (landlines are 8 digits).
  phone: { code: '971', nationalLength: 9, groups: [2, 3, 4], startsWith: ['5'], landlineLength: 8, example: '+971 50 123 4567' },
  company: { name: 'Car InspectO', phone: '+971 4 123 4567', email: 'hello@carinspecto.ae', web: 'www.carinspecto.ae' },
};
