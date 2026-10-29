import { market } from './market.js';

export const BOOKING_FEE = market.bookingFee;
export const VAT_RATE = market.taxRate;
export const PROMOS = market.promos;

export const BOOKING_STATUS = ['pending', 'assigned', 'ongoing', 'completed', 'cancelled'];
export const TICKET_STATUS = ['open', 'in_progress', 'resolved'];
export const TICKET_PRIORITY = ['low', 'medium', 'high'];

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const FILE_TYPES = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'application/pdf': 'pdf',
  'application/msword': 'doc', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
};

// Same maths as the frontend's priceFor(): discount first, then booking fee, then VAT on the total.
export function priceFor(planPrice, promoPct = 0) {
  const discount = Math.round(planPrice * promoPct);
  const taxable = planPrice - discount + BOOKING_FEE;
  const vat = Math.round(taxable * VAT_RATE);
  return { plan: planPrice, bookingFee: BOOKING_FEE, discount, vat, total: taxable + vat };
}
