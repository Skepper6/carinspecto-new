// Data layer. The browser keeps a working copy of exactly what the signed-in user may see (the server decides, per role),
// and every change goes to the Express API, which validates it and answers with the updated records.
// Pages read with useDB(selector) and write with the functions below.
import { useEffect, useState, useSyncExternalStore } from 'react';
import { api, clearSession, getToken, saveSession, setExpiredHandler } from './api';

const emptyState = () => ({
  users: [], plans: [], bookings: [], inspections: {}, payments: [], tickets: [], notifications: [],
  content: { faqs: [], terms: '', privacy: '' },
});

let state = emptyState();
let serverRev = -1;
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());
const setState = (next) => { state = next; emit(); };

/* ---------------- load status (first load / server unreachable) ---------------- */
let status = { ready: false, error: null };
const statusListeners = new Set();
const setStatus = (s) => { status = s; statusListeners.forEach((l) => l()); };
export const useDBStatus = () => useSyncExternalStore((l) => (statusListeners.add(l), () => statusListeners.delete(l)), () => status);

/* ---------------- state helpers ---------------- */
const upsert = (list, items) => {
  if (!items?.length) return list;
  const out = list.slice();
  items.forEach((it) => { const i = out.findIndex((x) => x.id === it.id); if (i >= 0) out[i] = it; else out.unshift(it); });
  return out;
};
// Lists carry inspections without photos; once a full copy was loaded keep it until the server version changes.
const keepFull = (old, incoming) => (old?._full && old.updatedAt === incoming.updatedAt ? old : incoming);

function mergeSnapshot(prev, incoming) {
  const inspections = {};
  Object.entries(incoming.inspections ?? {}).forEach(([id, i]) => { inspections[id] = keepFull(prev.inspections[id], i); });
  return { ...emptyState(), ...incoming, inspections };
}

function applyPatch(p) {
  let next = state;
  ['bookings', 'payments', 'tickets', 'notifications', 'plans', 'users'].forEach((k) => {
    if (p[k]) next = { ...next, [k]: upsert(next[k], p[k]) };
  });
  if (p.removedUserIds) next = { ...next, users: next.users.filter((u) => !p.removedUserIds.includes(u.id)) };
  if (p.inspections) {
    const inspections = { ...next.inspections };
    p.inspections.forEach((i) => { inspections[i.bookingId] = keepFull(inspections[i.bookingId], i); });
    next = { ...next, inspections };
  }
  if (p.content) next = { ...next, content: p.content };
  if (next !== state) setState(next);
}

/* ---------------- loading & staying in sync ---------------- */
let refreshing = null;
export function refresh({ silent = true } = {}) {
  refreshing ??= (async () => {
    try {
      const data = await api('GET', getToken() ? '/bootstrap' : '/public');
      const prev = state;
      serverRev = data.rev;
      setState(mergeSnapshot(prev, data.state));
      if (!silent) window.dispatchEvent(new CustomEvent('ci:remote-update', { detail: { prev, next: state } }));
    } finally { refreshing = null; }
  })();
  return refreshing;
}

let inflight = 0;
async function checkForChanges() {
  if (document.hidden || !getToken() || !status.ready || inflight) return;
  try {
    const { rev } = await api('GET', '/rev');
    if (rev !== serverRev) await refresh({ silent: false });
  } catch { /* offline or session ended – the next tick tries again */ }
}
setInterval(checkForChanges, 3000);
window.addEventListener('focus', checkForChanges);
document.addEventListener('visibilitychange', checkForChanges);

let expiring = false;
setExpiredHandler(() => {
  if (expiring) return;
  expiring = true;
  clearSession();
  setState(emptyState());
  window.dispatchEvent(new CustomEvent('ci:session-expired'));
  refresh().catch(() => {}).finally(() => { expiring = false; });
});

// When the server cannot be reached (restarting, database down, network blip) the first load keeps retrying by itself,
// so the "can't reach" screen clears as soon as the server is back – nobody has to press Try again.
let retryTimer = null;
let retryDelay = 1500;
const failBoot = (message) => {
  setStatus({ ready: false, error: message });
  clearTimeout(retryTimer);
  retryTimer = setTimeout(() => boot({ auto: true }), retryDelay);
  retryDelay = Math.min(Math.round(retryDelay * 1.5), 6000);
};
const bootDone = () => { retryDelay = 1500; setStatus({ ready: true, error: null }); };

export async function boot(opts) {
  const auto = opts?.auto === true;                   // the button passes a click event, not options
  clearTimeout(retryTimer);
  if (!auto) { retryDelay = 1500; setStatus({ ready: false, error: null }); }   // automatic retries keep the message on screen instead of flashing a spinner
  try {
    await refresh();
    bootDone();
  } catch (e) {
    // the saved session is no longer valid (expired, or the account was suspended): fall back to the public data
    if (e.status === 401 || e.status === 403 || (!getToken() && e.status !== 0)) {
      clearSession();
      try { await refresh(); bootDone(); } catch (err) { failBoot(err.message); }
    } else failBoot(e.message);
  }
}
boot();

export async function startSession(token, userId) {
  saveSession(token, userId);
  try { await refresh(); } catch (e) { clearSession(); throw e; }
}
export async function endSession() {
  clearSession();
  setState(emptyState());
  await refresh().catch(() => {});
}

/* ---------------- reading ---------------- */
const subscribe = (l) => (listeners.add(l), () => listeners.delete(l));
export const getState = () => state;
export const useDB = (selector = (s) => s) => selector(useSyncExternalStore(subscribe, getState));
export const findUserByEmail = (email) => state.users.find((u) => u.email?.toLowerCase() === String(email).toLowerCase());

/* ---------------- writing ---------------- */
// Changes run one after another (so e.g. "save" always lands before "complete"). Each call resolves with the server's
// answer or rejects with an Error whose message is safe to show the user.
let queue = Promise.resolve();
function mutation(method, path, body, after) {
  inflight++;
  const run = queue.then(async () => {
    const data = await api(method, path, body);
    if (typeof data.rev === 'number') {
      const missed = data.rev !== serverRev + 1;   // somebody else changed something meanwhile
      serverRev = data.rev;
      applyPatch(data);
      if (missed) refresh({ silent: false }).catch(() => {});
    } else applyPatch(data);
    after?.(data);
    return data;
  });
  queue = run.catch(() => {});
  return run.finally(() => { inflight--; });
}

/* ---- users ---- */
export const createUser = async (data) => (await mutation('POST', '/users', data)).users[0];
export const updateUser = (id, patch) => mutation('PATCH', `/users/${id}`, patch);
export const removeUser = (id) => mutation('DELETE', `/users/${id}`);

/* ---- bookings ---- */
// `customer` is kept for the old call signature; the server always uses the signed-in user.
export async function createBooking(_customer, form, plan, promoCode = '', paymentLabel = 'Card', payStatus = 'paid', txnId = null, txnProof = null) {
  const data = await mutation('POST', '/bookings', {
    car: form.car, location: form.location, date: form.date, time: form.time, purpose: form.purpose,
    planId: plan.id, promo: promoCode || '', method: paymentLabel, payStatus, txnId, txnProof,
  });
  return data.bookings[0];
}
export const assignInspector = (bookingId, inspectorId) => mutation('POST', `/bookings/${bookingId}/assign`, { inspectorId });
export const cancelBooking = (bookingId) => mutation('POST', `/bookings/${bookingId}/cancel`);
export const rescheduleBooking = (bookingId, date, time) => mutation('POST', `/bookings/${bookingId}/reschedule`, { date, time });
export const rateBooking = (bookingId, rating) => mutation('POST', `/bookings/${bookingId}/rate`, { rating });

/* ---- inspections ---- */
export const startInspection = (bookingId) => mutation('POST', `/inspections/${bookingId}/start`);
export const saveInspection = (bookingId, patch) => mutation('PUT', `/inspections/${bookingId}`, patch, (data) => {
  const cur = state.inspections[bookingId] ?? { bookingId };
  setState({ ...state, inspections: { ...state.inspections, [bookingId]: { ...cur, ...patch, updatedAt: data.savedAt, _full: true } } });
});
export const completeInspection = (bookingId) => mutation('POST', `/inspections/${bookingId}/complete`);

// Photos are not part of the lists – fetch the full record when a report or the inspection form needs them.
export async function fullInspection(bookingId) {
  if (!bookingId) return null;
  const cur = state.inspections[bookingId];
  if (cur?._full) return cur;
  try {
    const { inspection } = await api('GET', `/inspections/${bookingId}`);
    const full = { ...inspection, _full: true };
    setState({ ...state, inspections: { ...state.inspections, [bookingId]: full } });
    return full;
  } catch (e) {
    if (e.status === 404) return null;               // not started yet
    throw e;
  }
}

// The one way any dashboard (customer, inspector, admin) downloads a report. It always reads the same record and builds
// the same inputs, so the PDF is identical whoever opens it.
export async function downloadReportById(bookingId) {
  const booking = state.bookings.find((b) => b.id === bookingId);
  if (!booking) throw new Error('Booking not found.');
  const inspection = await fullInspection(bookingId);
  if (!inspection) throw new Error('No report for this booking yet.');
  const { downloadReport } = await import('./pdf');
  await downloadReport({
    booking, inspection, plan: state.plans.find((p) => p.id === booking.planId),
    customer: state.users.find((u) => u.id === booking.customerId), inspector: state.users.find((u) => u.id === booking.inspectorId),
  });
}
export function useFullInspection(bookingId) {
  const [st, setSt] = useState({ ready: false, error: null });
  useEffect(() => {
    let off = false;
    setSt({ ready: false, error: null });
    if (!bookingId) { setSt({ ready: true, error: null }); return undefined; }
    fullInspection(bookingId).then(() => !off && setSt({ ready: true, error: null })).catch((e) => !off && setSt({ ready: false, error: e.message }));
    return () => { off = true; };
  }, [bookingId]);
  return st;
}

/* ---- tickets ---- */
export async function createTicket(_customer, { subject, category, categoryDetail, priority, message, bookingId, attachments = [] }) {
  const data = await mutation('POST', '/tickets', { subject, category, categoryDetail, priority, message, bookingId: bookingId || null, attachments });
  return data.tickets[0];
}
export const replyTicket = (ticketId, _from, text, attachments = []) => mutation('POST', `/tickets/${ticketId}/reply`, { text, attachments });
export const setTicketStatus = (ticketId, status) => mutation('POST', `/tickets/${ticketId}/status`, { status });
export const markTicketSeen = (ticketId) => mutation('POST', `/tickets/${ticketId}/seen`).catch(() => {});

/* ---- notifications / content / plans ---- */
export const markNotificationsRead = () => mutation('POST', '/notifications/read').catch(() => {});
export const updateContent = (patch) => mutation('PUT', '/content', patch);
export const updatePlan = (id, patch) => mutation('PATCH', `/plans/${id}`, patch);

/* ---------------- ticket attention ---------------- */
// role = 'admin' | 'customer'. unseen: the other side wrote last and this role has not opened it since.
export function ticketState(t, role) {
  const last = t.messages[t.messages.length - 1];
  const other = role === 'admin' ? 'customer' : 'admin';
  const unseen = !!last && last.from === other && (!t.seen?.[role] || t.seen[role] < last.at);
  const awaiting = role === 'admin' && t.status !== 'resolved' && last?.from === 'customer';
  return { last, unseen, awaiting };
}
