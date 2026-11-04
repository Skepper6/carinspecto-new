import { carName, fmtDate } from './format';
import { COMPANY, CURRENCY, TAX_NAME, VAT_RATE } from './constants';
import { market } from './market';

const INDIGO = [51, 35, 127];
const GREY = [110, 110, 130];
const INK = [28, 28, 44];

// The built-in PDF fonts have no rupee sign, so the invoice prints the ISO code instead.
const code = (market.currencyCode || CURRENCY).trim();
const amt = (n = 0) => `${code} ${Math.round(n).toLocaleString(market.locale)}`;

// Tax invoice for a paid booking: seller and customer details, line items, tax and total.
export async function downloadInvoice({ booking, plan, customer }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 48;
  const set = (c) => doc.setTextColor(c[0], c[1], c[2]);
  const pr = booking.pricing;
  const no = `INV-${booking.id}`;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(22); set(INDIGO);
  doc.text('TAX INVOICE', M, 64);
  doc.setFontSize(10); set(INK);
  doc.text(COMPANY.name, W - M, 56, { align: 'right' });
  doc.setFont('helvetica', 'normal'); set(GREY);
  [COMPANY.address, `${market.taxIdLabel}: ${COMPANY.taxId}`, COMPANY.email, COMPANY.phone].forEach((t, i) => doc.text(t, W - M, 70 + i * 13, { align: 'right' }));

  doc.setFontSize(10); set(INK);
  const meta = [['Invoice no.', no], ['Date', fmtDate(booking.payment?.paidAt || booking.date)], ['Booking', booking.id], ['Payment', `${booking.payment.method} · ${booking.payment.status}`]];
  meta.forEach(([k, v], i) => { set(GREY); doc.text(k, M, 110 + i * 15); set(INK); doc.text(String(v), M + 80, 110 + i * 15); });

  doc.setFont('helvetica', 'bold'); doc.text('Billed to', W / 2 + 20, 110);
  doc.setFont('helvetica', 'normal'); set(GREY);
  [customer?.name, customer?.email, customer?.phone, booking.location?.city].filter(Boolean).forEach((t, i) => doc.text(String(t), W / 2 + 20, 125 + i * 13));

  let y = 200;
  doc.setFillColor(...INDIGO); doc.rect(M, y, W - M * 2, 24, 'F');
  doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold');
  doc.text('Description', M + 10, y + 16); doc.text('Amount', W - M - 10, y + 16, { align: 'right' });
  y += 24;

  const rows = [[`${plan?.name || 'Vehicle'} inspection – ${carName(booking.car)} (${booking.car.reg})`, pr.plan]];
  if (pr.discount > 0) rows.push(['Promo discount', -pr.discount]);
  rows.push(['Booking fee', pr.bookingFee]);
  doc.setFont('helvetica', 'normal'); set(INK);
  rows.forEach(([d, a]) => {
    y += 22;
    doc.text(doc.splitTextToSize(d, W - M * 2 - 120)[0], M + 10, y - 6);
    doc.text(a < 0 ? `-${amt(-a)}` : amt(a), W - M - 10, y - 6, { align: 'right' });
    doc.setDrawColor(224, 222, 230); doc.line(M, y, W - M, y);
  });

  y += 28;
  const line = (k, v, bold) => { doc.setFont('helvetica', bold ? 'bold' : 'normal'); set(bold ? INDIGO : INK); doc.setFontSize(bold ? 12 : 10); doc.text(k, W - M - 190, y); doc.text(v, W - M - 10, y, { align: 'right' }); y += 18; };
  line('Taxable amount', amt(pr.total - pr.vat));
  line(`${TAX_NAME} (${Math.round(VAT_RATE * 100)}%)`, amt(pr.vat));
  line('Total', amt(pr.total), true);

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); set(GREY);
  doc.text('This is a computer-generated invoice.', M, 780);
  doc.text(`${COMPANY.name} · ${COMPANY.web}`, W - M, 780, { align: 'right' });
  doc.save(`${no}.pdf`);
}
