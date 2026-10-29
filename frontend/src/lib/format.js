import { CURRENCY } from './constants';
import { market } from './market';

export const money = (n = 0) => `${CURRENCY}${Math.round(n).toLocaleString(market.locale)}`;

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

// National digits for the current market. Strips the country code and a leading trunk 0.
// An explicit "+code" or "00code" prefix is always stripped (the formatted value starts with it, so it must go on every
// keystroke). Without one, the code is only stripped when the input is longer than a national number (a pasted
// "9198765…"), so a national number that happens to start with the code is kept.
const nationalDigits = (raw) => {
  const p = market.phone;
  const s = String(raw).trim();
  let d = s.replace(/\D/g, '');
  if (s.startsWith('+') && d.startsWith(p.code)) d = d.slice(p.code.length);
  else if (d.startsWith(`00${p.code}`)) d = d.slice(p.code.length + 2);
  else if (d.length > p.nationalLength && d.startsWith(p.code)) d = d.slice(p.code.length);
  if (d.startsWith('0')) d = d.slice(1);
  return d;
};

export const PHONE_PLACEHOLDER = market.phone.example;
export const PHONE_HINT = `Mobile: ${market.phone.nationalLength} digits after +${market.phone.code}`;
export const PHONE_ERROR = `Enter a valid mobile number, e.g. ${market.phone.example}`;

// Typing is restricted to digits and capped at the market's national length.
export function fmtPhone(raw = '') {
  const p = market.phone;
  const d = nationalDigits(raw).slice(0, p.nationalLength);
  if (!d) return '';
  let i = 0;
  const grouped = p.groups.map((n) => { const part = d.slice(i, i + n); i += n; return part; }).filter(Boolean).join(' ');
  return `+${p.code} ${grouped}`;
}
export const isValidPhone = (v = '') => {
  const p = market.phone;
  const d = nationalDigits(v);
  return (d.length === p.nationalLength && p.startsWith.some((s) => d.startsWith(s))) || d.length === p.landlineLength;
};
