import { BOOKING_FEE, VAT_RATE } from './constants';

// Price breakdown for a plan. The server recomputes this when a booking is created; this copy is for the live summary.
export function priceFor(plan, promoPct = 0) {
  const discount = Math.round(plan.price * promoPct);
  const taxable = plan.price - discount + BOOKING_FEE;
  const vat = Math.round(taxable * VAT_RATE);
  return { plan: plan.price, bookingFee: BOOKING_FEE, discount, vat, total: taxable + vat };
}
