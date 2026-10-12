import mongoose from 'mongoose';

const { Schema } = mongoose;
const { Mixed, ObjectId } = Schema.Types;
const opts = { minimize: false };

/* ---- plans ---- */
const planSchema = new Schema({
  key: { type: String, required: true, unique: true },
  name: String, price: Number, checkpoints: Number, duration: String, color: String,
  popular: Boolean, tagline: String, sections: [String], features: [String], order: { type: Number, default: 0 },
}, opts);
planSchema.set('toJSON', { transform: (_d, r) => { r.id = r.key; delete r._id; delete r.__v; delete r.key; delete r.order; return r; } });
export const Plan = mongoose.model('Plan', planSchema);

/* ---- bookings ---- */
const bookingSchema = new Schema({
  code: { type: String, required: true, unique: true },
  customer: { type: ObjectId, ref: 'User', required: true, index: true },
  inspector: { type: ObjectId, ref: 'User', default: null, index: true },
  car: Mixed, planId: String, location: Mixed, date: String, time: String,
  status: { type: String, enum: ['pending', 'assigned', 'ongoing', 'completed', 'cancelled'], default: 'pending', index: true },
  pricing: Mixed, payment: Mixed, purpose: String,
  rating: { type: Number, default: null },
  timeline: [{ at: Date, label: String, by: String, _id: false }],
  createdAt: { type: Date, default: Date.now },
}, opts);
bookingSchema.set('toJSON', {
  transform: (_d, r) => {
    r.id = r.code; r.customerId = String(r.customer); r.inspectorId = r.inspector ? String(r.inspector) : null;
    delete r._id; delete r.__v; delete r.code; delete r.customer; delete r.inspector;
    return r;
  },
});
export const Booking = mongoose.model('Booking', bookingSchema);

/* ---- payments ---- */
const paymentSchema = new Schema({
  bookingCode: { type: String, required: true, unique: true },
  customer: { type: ObjectId, ref: 'User', index: true },
  amount: Number, vat: Number, status: String, method: String, txnId: String, at: { type: Date, default: Date.now },
}, opts);
paymentSchema.index({ txnId: 1 }, { unique: true, partialFilterExpression: { txnId: { $type: 'string' } } });   // one payment can only back one booking
paymentSchema.set('toJSON', {
  transform: (_d, r) => {
    r.id = `pay_${r.bookingCode}`; r.bookingId = r.bookingCode; r.customerId = String(r.customer);
    delete r._id; delete r.__v; delete r.bookingCode; delete r.customer;
    return r;
  },
});
export const Payment = mongoose.model('Payment', paymentSchema);

/* ---- inspections (one per booking) ---- */
const inspectionSchema = new Schema({
  bookingCode: { type: String, required: true, unique: true },
  status: { type: String, enum: ['draft', 'completed'], default: 'draft' },
  data: { type: Mixed, default: {} },
  photos: { type: [Mixed], default: [] },
  comment: { type: String, default: '' },
  updatedAt: { type: Date, default: Date.now },
  completedAt: { type: Date, default: null },
}, opts);
inspectionSchema.set('toJSON', {
  transform: (_d, r) => { r.bookingId = r.bookingCode; delete r._id; delete r.__v; delete r.bookingCode; return r; },
});
export const Inspection = mongoose.model('Inspection', inspectionSchema);

/* ---- tickets ---- */
const ticketSchema = new Schema({
  code: { type: String, required: true, unique: true },
  subject: String, category: String, categoryDetail: String,
  priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  status: { type: String, enum: ['open', 'in_progress', 'resolved'], default: 'open', index: true },
  customer: { type: ObjectId, ref: 'User', required: true, index: true },
  bookingId: String,
  messages: [{ from: String, text: String, at: Date, attachments: { type: [Mixed], default: [] }, _id: false }],
  seen: { type: Mixed, default: {} },
  createdAt: { type: Date, default: Date.now },
}, opts);
ticketSchema.set('toJSON', {
  transform: (_d, r) => {
    r.id = r.code; r.customerId = String(r.customer);
    delete r._id; delete r.__v; delete r.code; delete r.customer;
    return r;
  },
});
export const Ticket = mongoose.model('Ticket', ticketSchema);

/* ---- notifications ---- */
const notificationSchema = new Schema({
  user: { type: ObjectId, ref: 'User', required: true, index: true },
  title: String, body: String, at: { type: Date, default: Date.now }, read: { type: Boolean, default: false },
}, opts);
notificationSchema.set('toJSON', {
  transform: (_d, r) => { r.id = String(r._id); r.userId = String(r.user); delete r._id; delete r.__v; delete r.user; return r; },
});
export const Notification = mongoose.model('Notification', notificationSchema);

/* ---- site content (single document) ---- */
const contentSchema = new Schema({
  _id: { type: String, default: 'main' },
  faqs: { type: [Mixed], default: [] }, terms: { type: String, default: '' }, privacy: { type: String, default: '' },
}, opts);
contentSchema.set('toJSON', { transform: (_d, r) => ({ faqs: r.faqs, terms: r.terms, privacy: r.privacy }) });
export const Content = mongoose.model('Content', contentSchema);

/* ---- counters (booking / ticket numbers, change revision) ---- */
const counterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
export const Counter = mongoose.model('Counter', counterSchema);

/* ---- uploaded files (ticket attachments) ---- */
const fileSchema = new Schema({
  owner: { type: ObjectId, ref: 'User', index: true },
  contentType: String, size: Number, data: Buffer, stored: { type: Boolean, default: false },   // stored: the bytes live in object storage
  createdAt: { type: Date, default: Date.now },
});
export const File = mongoose.model('File', fileSchema);

export { default as User } from './User.js';
