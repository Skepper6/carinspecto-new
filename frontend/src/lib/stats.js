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

export function packagePerformance(bookings, plans) {
  return plans.map((p) => {
    const bs = bookings.filter((b) => b.planId === p.id && b.status !== 'cancelled');
    return { name: p.name, color: p.color, orders: bs.length, revenue: bs.filter(paid).reduce((a, b) => a + b.pricing.total, 0) };
  });
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
      rating: rated.length ? +(rated.reduce((a, b) => a + b.rating, 0) / rated.length).toFixed(1) : u.rating ?? 0,
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
