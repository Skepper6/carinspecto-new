import { Counter, Notification, User } from '../models/index.js';

/* ---- change revision: every successful write bumps it so clients know to refresh ---- */
export const getRev = async () => (await Counter.findById('rev').lean())?.seq ?? 0;
export const bumpRev = async () => (await Counter.findByIdAndUpdate('rev', { $inc: { seq: 1 } }, { upsert: true, returnDocument: 'after' })).seq;

// Responds with the changed documents plus the new revision. `changed: false` skips the bump.
export async function send(res, patch = {}, { changed = true, status = 200 } = {}) {
  const rev = changed ? await bumpRev() : await getRev();
  res.status(status).json({ ...patch, rev });
}

/* ---- counters for booking / ticket numbers ---- */
export async function ensureCounters() {
  await Counter.updateOne({ _id: 'booking' }, { $setOnInsert: { seq: 1000 } }, { upsert: true });
  await Counter.updateOne({ _id: 'ticket' }, { $setOnInsert: { seq: 199 } }, { upsert: true });
  await Counter.updateOne({ _id: 'rev' }, { $setOnInsert: { seq: 1 } }, { upsert: true });
}
export const nextSeq = async (name) => (await Counter.findByIdAndUpdate(name, { $inc: { seq: 1 } }, { returnDocument: 'after' })).seq;

/* ---- notifications ---- */
export const notify = (userId, title, body) => Notification.create({ user: userId, title, body });
export async function notifyAdmins(title, body) {
  const admins = await User.find({ role: 'admin', status: 'active' }).select('_id').lean();
  return Notification.insertMany(admins.map((a) => ({ user: a._id, title, body })));
}

/* ---- small utilities ---- */
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const fail = (status, message) => { throw new HttpError(status, message); };

// Keeps only plain values (strings truncated, no nested objects) from a client-supplied object.
export function cleanFlat(obj, { maxLen = 200, maxKeys = 40 } = {}) {
  const out = {};
  Object.entries(obj ?? {}).slice(0, maxKeys).forEach(([k, v]) => {
    if (/^[\w.-]{1,40}$/.test(k) && !k.startsWith('$')) {
      if (typeof v === 'string') out[k] = v.slice(0, maxLen);
      else if (typeof v === 'number' && Number.isFinite(v)) out[k] = v;
      else if (typeof v === 'boolean' || v === null) out[k] = v;
    }
  });
  return out;
}

const str = (v, n = 120) => String(v ?? '').slice(0, n);
export const cleanAddress = (a) => ({
  ...cleanFlat(a), id: str(a?.id, 40) || undefined, isDefault: Boolean(a?.isDefault),
});
export const cleanCard = (c) => ({
  id: str(c?.id, 40), type: 'card', brand: str(c?.brand, 20), last4: str(c?.last4, 4).replace(/\D/g, ''), exp: str(c?.exp, 7), isDefault: Boolean(c?.isDefault),
});

// Fields of another user that are safe to show to the people who work with them.
export const publicUser = (u) => {
  const j = u.toJSON ? u.toJSON() : u;
  return { id: j.id, role: j.role, name: j.name, phone: j.phone, city: j.city, status: j.status, rating: j.rating, specialization: j.specialization, available: j.available };
};
