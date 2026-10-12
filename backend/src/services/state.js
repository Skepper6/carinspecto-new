import { Booking, Content, Inspection, Notification, Payment, Plan, Ticket, User } from '../models/index.js';
import { publicUser } from './helpers.js';

export const getPlans = async () => (await Plan.find().sort('order')).map((p) => p.toJSON());
export const getContent = async () => (await Content.findById('main'))?.toJSON() ?? { faqs: [], terms: '', privacy: '' };

// Per-item photos are heavy; lists carry the answers only and photos are fetched on demand.
function stripCellPhotos(data) {
  const out = {};
  Object.entries(data ?? {}).forEach(([sec, items]) => {
    out[sec] = {};
    Object.entries(items ?? {}).forEach(([id, cell]) => {
      out[sec][id] = cell?.photos?.length ? { ...cell, photos: [], photoCount: cell.photos.length } : cell;
    });
  });
  return out;
}
export function lightInspection(doc) {
  const j = doc.toJSON ? doc.toJSON() : doc;
  return { ...j, data: stripCellPhotos(j.data), photos: [], photoCount: j.photos?.length ?? 0 };
}
const asMap = (list) => Object.fromEntries(list.map((i) => { const l = lightInspection(i); return [l.bookingId, l]; }));

/* What each role may see. The browser keeps this as its working copy of the data. */
export async function buildState(me) {
  const [plans, content] = await Promise.all([getPlans(), getContent()]);
  const notifications = (await Notification.find({ user: me._id }).sort({ at: -1 }).limit(200)).map((n) => n.toJSON());
  const base = { plans, content, notifications, users: [], bookings: [], inspections: {}, payments: [], tickets: [] };

  if (me.role === 'admin') {
    const [users, bookings, inspections, payments, tickets] = await Promise.all([
      User.find().sort({ joinedAt: -1 }), Booking.find().sort({ createdAt: -1 }), Inspection.find(),
      Payment.find().sort({ at: -1 }), Ticket.find().sort({ createdAt: -1 }),
    ]);
    return { ...base, users: users.map((u) => u.toJSON()), bookings: bookings.map((b) => b.toJSON()), inspections: asMap(inspections), payments: payments.map((p) => p.toJSON()), tickets: tickets.map((t) => t.toJSON()) };
  }

  if (me.role === 'customer') {
    const bookings = await Booking.find({ customer: me._id }).sort({ createdAt: -1 });
    const codes = bookings.map((b) => b.code);
    const inspectorIds = [...new Set(bookings.map((b) => b.inspector).filter(Boolean).map(String))];
    const [inspections, payments, tickets, inspectors] = await Promise.all([
      Inspection.find({ bookingCode: { $in: codes }, status: 'completed' }), Payment.find({ customer: me._id }).sort({ at: -1 }),
      Ticket.find({ customer: me._id }).sort({ createdAt: -1 }), User.find({ _id: { $in: inspectorIds } }),
    ]);
    return { ...base, users: [me.toJSON(), ...inspectors.map(publicUser)], bookings: bookings.map((b) => b.toJSON()), inspections: asMap(inspections), payments: payments.map((p) => p.toJSON()), tickets: tickets.map((t) => t.toJSON()) };
  }

  // inspector
  const bookings = await Booking.find({ inspector: me._id }).sort({ createdAt: -1 });
  const customerIds = [...new Set(bookings.map((b) => String(b.customer)))];
  const [inspections, customers] = await Promise.all([
    Inspection.find({ bookingCode: { $in: bookings.map((b) => b.code) } }), User.find({ _id: { $in: customerIds } }),
  ]);
  return { ...base, users: [me.toJSON(), ...customers.map(publicUser)], bookings: bookings.map((b) => b.toJSON()), inspections: asMap(inspections) };
}
