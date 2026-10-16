import { itemTotals } from './inspectionSchema';

export const monthKey = (iso) => iso.slice(0, 7);
export const monthLabel = (key) => new Date(key + '-01T00:00:00').toLocaleString('en-GB', { month: 'short' });

export function lastMonths(n) {
  const out = [];
  const d = new Date();
  d.setDate(1);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    out.push(`${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}`);
  }
  return out;
}

const paid = (b) => b.payment.status === 'paid';

export function salesTrend(bookings, months) {
  return lastMonths(months).map((k) => {
    const inMonth = bookings.filter((b) => monthKey(b.date) === k && b.status !== 'cancelled');
    return { month: monthLabel(k), key: k, orders: inMonth.length, revenue: inMonth.filter(paid).reduce((a, b) => a + b.pricing.total, 0) };
  });
}

// sales trend for a date range: one point per month from `from` to `to`.
// A missing start uses the earliest booking; a missing end uses today.
export function salesTrendRange(bookings, from, to) {
  const earliest = bookings.reduce((m, b) => (!m || b.date < m ? b.date : m), null);
  const start = new Date(`${from || earliest || ymd(new Date())}T00:00:00`);
  const end = new Date(`${to || ymd(new Date())}T00:00:00`);
  const keys = [];
  const cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const stop = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= stop && keys.length < 120) {
    keys.push(`${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`);
    cur.setMonth(cur.getMonth() + 1);
  }
  return keys.map((k) => {
    const inMonth = bookings.filter((b) => monthKey(b.date) === k && b.status !== 'cancelled');
    return { month: monthLabel(k), key: k, orders: inMonth.length, revenue: inMonth.filter(paid).reduce((a, b) => a + b.pricing.total, 0) };
  });
}

export function packagePerformance(bookings, plans) {
  return plans.map((p) => {
    const bs = bookings.filter((b) => b.planId === p.id && b.status !== 'cancelled');
    return { name: p.name, color: p.color, orders: bs.length, revenue: bs.filter(paid).reduce((a, b) => a + b.pricing.total, 0) };
  });
}

// -> { rating: average of the customers' stars (1 decimal) or null when nobody has rated yet, reviews: how many ratings }
export function ratingOf(bookings, inspectorId) {
  const rated = bookings.filter((b) => b.inspectorId === inspectorId && b.status === 'completed' && b.rating);
  return { rating: rated.length ? +(rated.reduce((a, b) => a + b.rating, 0) / rated.length).toFixed(1) : null, reviews: rated.length };
}

export function inspectorPerformance(state) {
  return state.users.filter((u) => u.role === 'inspector').map((u) => {
    const mine = state.bookings.filter((b) => b.inspectorId === u.id);
    const done = mine.filter((b) => b.status === 'completed');
    const scores = done.map((b) => {
      const ins = state.inspections[b.id];
      const plan = state.plans.find((p) => p.id === b.planId);
      return ins ? itemTotals(plan, ins.data).score : null;
    }).filter((x) => x !== null);
    const rated = done.filter((b) => b.rating);
    return {
      id: u.id, name: u.name, status: u.status, city: u.city, completed: done.length,
      active: mine.filter((b) => ['assigned', 'ongoing'].includes(b.status)).length,
      avgScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      rating: rated.length ? +(rated.reduce((a, b) => a + b.rating, 0) / rated.length).toFixed(1) : null,   // no ratings yet = no number
      reviews: rated.length,
    };
  });
}

export function groupCount(items, keyFn) {
  const m = new Map();
  items.forEach((i) => m.set(keyFn(i), (m.get(keyFn(i)) ?? 0) + 1));
  return [...m.entries()].map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
}

// Suggest the best inspector: same city, active, available, lowest current load.
export function suggestInspector(state, booking) {
  const perf = inspectorPerformance(state);
  const candidates = state.users.filter((u) => u.role === 'inspector' && u.status === 'active' && u.available !== false);
  return candidates
    .map((u) => ({ u, load: perf.find((p) => p.id === u.id).active, same: u.city === booking.location.city }))
    .sort((a, b) => Number(b.same) - Number(a.same) || a.load - b.load)[0]?.u ?? null;
}

// ---- revenue over any period -------------------------------------------------------------------------------------
const pad = (n) => String(n).padStart(2, '0');
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const addD = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

export const PERIODS = [
  { value: 'month', label: 'This month' }, { value: 'lastmonth', label: 'Last month' }, { value: '3m', label: 'Last 3 months' },
  { value: '6m', label: 'Last 6 months' }, { value: 'year', label: 'This year' }, { value: 'lastyear', label: 'Last year' },
  { value: '2y', label: 'Last 2 years' }, { value: 'all', label: 'All time' }, { value: 'custom', label: 'Custom dates' },
];

// -> { from, to, label } as ISO dates (null = unbounded)
export function periodRange(period, custom = {}) {
  const t = new Date(); const y = t.getFullYear(); const m = t.getMonth();
  switch (period) {
    case 'month': return { from: ymd(new Date(y, m, 1)), to: ymd(new Date(y, m + 1, 0)), label: 'this month' };
    case 'lastmonth': return { from: ymd(new Date(y, m - 1, 1)), to: ymd(new Date(y, m, 0)), label: 'last month' };
    case '3m': return { from: ymd(new Date(y, m - 2, 1)), to: ymd(new Date(y, m + 1, 0)), label: 'last 3 months' };
    case '12m': return { from: ymd(new Date(y, m - 11, 1)), to: ymd(new Date(y, m + 1, 0)), label: 'last 12 months' };
    case '6m': return { from: ymd(new Date(y, m - 5, 1)), to: ymd(new Date(y, m + 1, 0)), label: 'last 6 months' };
    case 'year': return { from: `${y}-01-01`, to: `${y}-12-31`, label: String(y) };
    case 'lastyear': return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31`, label: String(y - 1) };
    case '2y': return { from: `${y - 1}-01-01`, to: `${y}-12-31`, label: `${y - 1} – ${y}` };
    case 'custom': return { from: custom.from || null, to: custom.to || null, label: custom.from || custom.to ? `${custom.from || '…'} to ${custom.to || '…'}` : 'all time' };
    default: return { from: null, to: null, label: 'all time' };
  }
}

// the equal-length period just before this one (for "vs previous period"); null when the period is open-ended
export function previousRange({ from, to }) {
  if (!from || !to) return null;
  const a = new Date(`${from}T00:00:00`); const b = new Date(`${to}T00:00:00`);
  const days = Math.round((b - a) / 86400000) + 1;
  return { from: ymd(addD(a, -days)), to: ymd(addD(a, -1)) };
}

// revenue per day (period up to ~2 months) or per month, across the whole period
export function revenueSeries(bookings, { from, to }) {
  const live = bookings.filter((b) => b.status !== 'cancelled');
  const dates = live.map((b) => b.date).sort();
  const start = new Date(`${from || dates[0] || ymd(new Date())}T00:00:00`);
  const end = new Date(`${to || ymd(new Date())}T00:00:00`);
  const days = Math.max(1, Math.round((end - start) / 86400000) + 1);
  const total = (list) => list.filter(paid).reduce((a, b) => a + b.pricing.total, 0);
  if (days <= 62) {
    return Array.from({ length: days }, (_, i) => {
      const d = ymd(addD(start, i)); const day = live.filter((b) => b.date === d);
      return { month: new Date(`${d}T00:00:00`).toLocaleString('en-GB', { day: 'numeric', month: 'short' }), key: d, orders: day.length, revenue: total(day) };
    });
  }
  const out = []; const longSpan = days > 400;
  for (let d = new Date(start.getFullYear(), start.getMonth(), 1); d <= end && out.length < 120; d = new Date(d.getFullYear(), d.getMonth() + 1, 1)) {
    const k = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`; const inMonth = live.filter((b) => monthKey(b.date) === k);
    out.push({ month: d.toLocaleString('en-GB', longSpan ? { month: 'short', year: '2-digit' } : { month: 'short' }), key: k, orders: inMonth.length, revenue: total(inMonth) });
  }
  return out;
}
