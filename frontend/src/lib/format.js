import { CURRENCY } from './constants';

export const money = (n = 0) => `${CURRENCY}${Math.round(n).toLocaleString('en-GB')}`;

export const fmtDate = (d, opts) => {
  if (!d) return '—';
  const date = typeof d === 'string' && d.length === 10 ? new Date(d + 'T00:00:00') : new Date(d);
  return date.toLocaleDateString('en-GB', opts || { day: '2-digit', month: 'short', year: 'numeric' });
};
export const fmtDateTime = (d) =>
  new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
export const fmtTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};
export const isoDate = (d = new Date()) => {
  const x = new Date(d);
  x.setMinutes(x.getMinutes() - x.getTimezoneOffset());
  return x.toISOString().slice(0, 10);
};
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const timeAgo = (iso) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)}d ago`;
  return fmtDate(iso);
};
export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('');
export const uid = (p = 'id') => `${p}_${Math.random().toString(36).slice(2, 9)}`;

export function downloadCSV(filename, rows) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => esc(r[k])).join(','))].join('\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  a.click();
  URL.revokeObjectURL(url);
}

export const carName = (car) => `${car.year} ${car.make} ${car.model}`;

// UAE phone: +971 5X XXX XXXX (9 national digits). Typing is restricted to digits and capped in length.
export function fmtPhone(raw = '') {
  let d = String(raw).replace(/\D/g, '');
  if (d.startsWith('00971')) d = d.slice(5);
  else if (d.startsWith('971')) d = d.slice(3);
  else if (d.startsWith('0')) d = d.slice(1);
  d = d.slice(0, 9);
  if (!d) return '';
  return `+971 ${[d.slice(0, 2), d.slice(2, 5), d.slice(5, 9)].filter(Boolean).join(' ')}`;
}
export const isValidPhone = (v = '') => {
  const d = String(v).replace(/\D/g, '').replace(/^971/, '');
  return (d.length === 9 && d[0] === '5') || d.length === 8;
};
