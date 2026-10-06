// Local mock database. Every function here maps 1:1 to a future Express/MongoDB endpoint,
// so swapping this file for `fetch('/api/...')` calls is the only change the UI will need.
import { useSyncExternalStore } from 'react';
import { buildSeed, priceFor } from './seed';
import { uid } from './format';

const KEY = 'ci_db_v3';
let state;
const listeners = new Set();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.version === 3) return parsed;
    }
  } catch { /* ignore corrupt storage */ }
  return buildSeed();
}

state = load();

let saveTimer;
let lastRaw = null;   // the last serialised state this tab wrote or adopted
let pending = false;  // we have changes not yet written – never overwrite them with older data
function persist() {
  pending = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const raw = JSON.stringify(state);
      localStorage.setItem(KEY, raw);
      lastRaw = raw;
    } catch {
      window.dispatchEvent(new CustomEvent('ci:storage-full'));
    }
    pending = false;
  }, 150);
}

/* ---------------- optional shared server ----------------
 * When the Express API is running, every browser/device shares one copy of the data. Local changes are applied
 * instantly (optimistic) and sent to the server; if someone else changed the data first, the server's version is
 * adopted and our not-yet-sent changes are re-applied on top of it. Without the server the app keeps working locally. */
const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const JSON_H = { 'Content-Type': 'application/json' };
let serverRev = 0;
let serverUp = false;
let everUp = false;
let ops = [];          // local changes the server has not confirmed yet
let syncing = false;

function applyRemote(srvState, rev) {
  const prev = state;
  const next = srvState;
  for (const op of ops) { try { op(next); } catch { /* a change that no longer applies */ } }
  state = next;
  serverRev = rev;
  lastRaw = null;
  persist();
  listeners.forEach((l) => l());
  window.dispatchEvent(new CustomEvent('ci:remote-update', { detail: { prev, next } }));
}
async function push() {
  if (syncing || !serverUp || !ops.length) return;
  syncing = true;
  const sent = ops.length;
  try {
    const r = await fetch(`${API}/state`, { method: 'PUT', headers: JSON_H, body: JSON.stringify({ baseRev: serverRev, state }) });
    if (r.status === 409) { const srv = await r.json(); applyRemote(srv.state, srv.rev); }
    else if (r.ok) { serverRev = (await r.json()).rev; ops = ops.slice(sent); }
    else serverUp = false;
  } catch { serverUp = false; }
  syncing = false;
  if (ops.length && serverUp) setTimeout(push, 30);
}
async function boot() {
  try {
    const s = await (await fetch(`${API}/state`)).json();
    serverUp = true; everUp = true;
    if (s.state && s.state.version === 3) applyRemote(s.state, s.rev);   // adopt what is already on the server
    else { serverRev = s.rev; ops.push(() => {}); push(); }              // empty server: seed it with our data
    if (ops.length) push();
  } catch { serverUp = false; }
}
async function pull() {
  if (syncing || ops.length) return;
  try {
    const { rev } = await (await fetch(`${API}/state/rev`)).json();
    serverUp = true;
    if (rev === serverRev) return;
    const s = await (await fetch(`${API}/state`)).json();
    if (!syncing && !ops.length && s.state) applyRemote(s.state, s.rev);
  } catch { serverUp = false; }
}
boot();
setInterval(() => (serverUp ? pull() : boot()), 1500);

export function mutate(fn) {
  const next = structuredClone(state);
  const result = fn(next);
  state = next;
  if (everUp) { ops.push(fn); setTimeout(push, 0); }
  persist();
  listeners.forEach((l) => l());
  return result;
}

export const getState = () => state;

// Another tab of this browser changed the data (only used when there is no server)
function adopt(raw) {
  if (!raw || raw === lastRaw || pending || serverUp) return;
  try {
    const next = JSON.parse(raw);
    if (next.version !== 3) return;
    const prev = state;
    lastRaw = raw;
    state = next;
    listeners.forEach((l) => l());
    window.dispatchEvent(new CustomEvent('ci:remote-update', { detail: { prev, next } }));
  } catch { /* ignore partial writes */ }
}
const readStore = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
lastRaw = readStore();
window.addEventListener('storage', (e) => { if (e.key === KEY) adopt(e.newValue); });
window.addEventListener('focus', () => { adopt(readStore()); if (serverUp) pull(); });
document.addEventListener('visibilitychange', () => { if (!document.hidden) { adopt(readStore()); if (serverUp) pull(); } });
setInterval(() => adopt(readStore()), 1500);
const subscribe = (l) => (listeners.add(l), () => listeners.delete(l));
export const useDB = (selector = (s) => s) => {
  const snap = useSyncExternalStore(subscribe, getState);
  return selector(snap);
};

export function resetDB() {
  const seed = buildSeed();
  const replace = (d) => { Object.keys(d).forEach((k) => delete d[k]); Object.assign(d, structuredClone(seed)); };
  mutate(replace);
}

const now = () => new Date().toISOString();

function notify(draft, userId, title, body) {
  draft.notifications.unshift({ id: uid('n'), userId, title, body, at: now(), read: false });
}

/* ---------------- users ---------------- */
export const findUserByEmail = (email) => state.users.find((u) => u.email.toLowerCase() === email.toLowerCase());

export function createUser(data) {
  return mutate((d) => {
    const user = {
      id: uid('u'), status: 'active', joinedAt: now(), addresses: [], paymentMethods: [], ...data,
    };
    d.users.push(user);
    if (user.role === 'customer') notify(d, user.id, 'Welcome to Car InspectO', 'Book your first certified inspection in under 2 minutes.');
    return user;
  });
}

export function updateUser(id, patch) {
  mutate((d) => {
    const u = d.users.find((x) => x.id === id);
    if (u) Object.assign(u, patch);
  });
}

export function removeUser(id) {
  mutate((d) => {
    d.users = d.users.filter((u) => u.id !== id);
    d.bookings.forEach((b) => { if (b.inspectorId === id && b.status !== 'completed') { b.inspectorId = null; b.status = 'pending'; } });
  });
}

/* ---------------- bookings ---------------- */
export function createBooking(customer, form, plan, promoPct = 0, paymentLabel = 'Card', payStatus = 'paid', txnId = null) {
  return mutate((d) => {
    const n = d.bookings.length + 1001;
    const id = `CI-${n}`;
    const pricing = priceFor(plan, promoPct);
    const booking = {
      id, customerId: customer.id, inspectorId: null, car: form.car, planId: plan.id,
      location: form.location, date: form.date, time: form.time, status: 'pending', pricing,
      payment: { status: payStatus, method: paymentLabel, txnId: txnId ?? `TXN${Math.floor(Math.random() * 1e9)}` },
      purpose: form.purpose, createdAt: now(), rating: null,
      timeline: [
        { at: now(), label: 'Booking placed', by: customer.name },
        { at: now(), label: payStatus === 'paid' ? 'Payment received' : 'Cash payment due on arrival', by: 'System' },
      ],
    };
    d.bookings.unshift(booking);
    d.payments.unshift({ id: `pay_${id}`, bookingId: id, customerId: customer.id, amount: pricing.total, vat: pricing.vat, status: payStatus, method: paymentLabel, txnId: booking.payment.txnId, at: now() });
    d.users.filter((u) => u.role === 'admin').forEach((a) => notify(d, a.id, 'New booking', `${id} · ${form.car.make} ${form.car.model} on ${form.date}`));
    notify(d, customer.id, 'Booking confirmed', `${id} is confirmed. We will assign an inspector shortly.`);
    return booking;
  });
}

export function assignInspector(bookingId, inspectorId, by = 'Admin Team') {
  mutate((d) => {
    const b = d.bookings.find((x) => x.id === bookingId);
    const insp = d.users.find((u) => u.id === inspectorId);
    if (!b || !insp) return;
    b.inspectorId = inspectorId;
    if (b.status === 'pending') b.status = 'assigned';
    b.timeline.push({ at: now(), label: `Assigned to ${insp.name}`, by });
    notify(d, inspectorId, 'New inspection assigned', `${b.id} · ${b.car.make} ${b.car.model} on ${b.date} at ${b.time}`);
    notify(d, b.customerId, 'Inspector assigned', `${insp.name} will inspect your ${b.car.make} ${b.car.model}.`);
  });
}

export function cancelBooking(bookingId, by) {
  mutate((d) => {
    const b = d.bookings.find((x) => x.id === bookingId);
    if (!b) return;
    b.status = 'cancelled';
    b.payment.status = 'refunded';
    const p = d.payments.find((x) => x.bookingId === bookingId);
    if (p) p.status = 'refunded';
    b.timeline.push({ at: now(), label: 'Booking cancelled – refund initiated', by });
    if (b.inspectorId) notify(d, b.inspectorId, 'Inspection cancelled', `${b.id} was cancelled.`);
  });
}

export function rescheduleBooking(bookingId, date, time, by) {
  mutate((d) => {
    const b = d.bookings.find((x) => x.id === bookingId);
    if (!b) return;
    b.date = date;
    b.time = time;
    b.timeline.push({ at: now(), label: `Rescheduled to ${date} ${time}`, by });
    if (b.inspectorId) notify(d, b.inspectorId, 'Inspection rescheduled', `${b.id} moved to ${date} at ${time}.`);
  });
}

export function rateBooking(bookingId, rating) {
  mutate((d) => {
    const b = d.bookings.find((x) => x.id === bookingId);
    if (b) b.rating = rating;
  });
}

/* ---------------- inspections ---------------- */
export function startInspection(bookingId, inspector) {
  mutate((d) => {
    const b = d.bookings.find((x) => x.id === bookingId);
    if (!b || b.status === 'ongoing' || b.status === 'completed') return;
    b.status = 'ongoing';
    b.timeline.push({ at: now(), label: 'Inspection started', by: inspector.name });
    d.inspections[bookingId] ??= { bookingId, status: 'draft', data: {}, photos: [], comment: '', updatedAt: now(), completedAt: null };
    notify(d, b.customerId, 'Inspection started', `${inspector.name} has started inspecting your ${b.car.make} ${b.car.model}.`);
  });
}

export function saveInspection(bookingId, patch) {
  mutate((d) => {
    const cur = d.inspections[bookingId] ?? { bookingId, status: 'draft', data: {}, photos: [], comment: '' };
    d.inspections[bookingId] = { ...cur, ...patch, updatedAt: now() };
  });
}

export function completeInspection(bookingId, inspector) {
  mutate((d) => {
    const b = d.bookings.find((x) => x.id === bookingId);
    const ins = d.inspections[bookingId];
    if (!b || !ins) return;
    ins.status = 'completed';
    ins.completedAt = now();
    b.status = 'completed';
    b.timeline.push({ at: now(), label: 'Inspection completed & report generated', by: inspector.name });
    notify(d, b.customerId, 'Inspection report ready', `Your report for ${b.id} is ready to view and download.`);
    d.users.filter((u) => u.role === 'admin').forEach((a) => notify(d, a.id, 'Inspection completed', `${b.id} by ${inspector.name}`));
  });
}

/* ---------------- tickets ---------------- */
export function createTicket(customer, { subject, category, categoryDetail, priority, message, bookingId, attachments = [] }) {
  return mutate((d) => {
    const t = {
      id: `T-${200 + d.tickets.length}`, subject, category, categoryDetail, priority, status: 'open', customerId: customer.id, bookingId,
      createdAt: now(), messages: [{ from: 'customer', text: message, at: now(), attachments }],
    };
    d.tickets.unshift(t);
    d.users.filter((u) => u.role === 'admin').forEach((a) => notify(d, a.id, 'New support ticket', `${t.id} · ${subject}`));
    return t;
  });
}

export function replyTicket(ticketId, from, text, attachments = []) {
  mutate((d) => {
    const t = d.tickets.find((x) => x.id === ticketId);
    if (!t) return;
    t.messages.push({ from, text, at: now(), attachments });
    if (from === 'admin') {
      if (t.status === 'open') t.status = 'in_progress';
      notify(d, t.customerId, 'Support replied', `${t.id} · ${t.subject}`);
    }
  });
}

export function setTicketStatus(ticketId, status) {
  mutate((d) => {
    const t = d.tickets.find((x) => x.id === ticketId);
    if (t) t.status = status;
  });
}

/* ---------------- notifications / content / plans ---------------- */
export function markNotificationsRead(userId) {
  mutate((d) => d.notifications.forEach((n) => { if (n.userId === userId) n.read = true; }));
}

export function updateContent(patch) {
  mutate((d) => { d.content = { ...d.content, ...patch }; });
}

export function updatePlan(id, patch) {
  mutate((d) => {
    const p = d.plans.find((x) => x.id === id);
    if (p) Object.assign(p, patch);
  });
}

/* ---------------- ticket attention ---------------- */
// role = 'admin' | 'customer'. unseen: the other side wrote last and this role has not opened it since.
export function ticketState(t, role) {
  const last = t.messages[t.messages.length - 1];
  const other = role === 'admin' ? 'customer' : 'admin';
  const unseen = !!last && last.from === other && (!t.seen?.[role] || t.seen[role] < last.at);
  const awaiting = role === 'admin' && t.status !== 'resolved' && last?.from === 'customer';
  return { last, unseen, awaiting };
}
export function markTicketSeen(ticketId, role) {
  mutate((d) => {
    const t = d.tickets.find((x) => x.id === ticketId);
    if (t) t.seen = { ...(t.seen ?? {}), [role]: new Date().toISOString() };
  });
}
