// Card input helpers: typing is filtered as the user types, validation follows real card rules.

export const cardBrand = (digits) => (/^3[47]/.test(digits) ? 'Amex' : /^4/.test(digits) ? 'Visa' : /^(5[1-5]|2[2-7])/.test(digits) ? 'Mastercard' : '');

const maxLen = (digits) => (cardBrand(digits) === 'Amex' ? 15 : 16);

// digits only, capped at 16 (15 for Amex), grouped for readability
export const formatCardNumber = (v) => {
  const d = String(v).replace(/\D/g, '');
  const digits = d.slice(0, maxLen(d));
  const groups = cardBrand(digits) === 'Amex' ? [4, 6, 5] : [4, 4, 4, 4];
  const out = []; let i = 0;
  for (const g of groups) { if (i >= digits.length) break; out.push(digits.slice(i, i + g)); i += g; }
  return out.join(' ');
};

// typing 1234 gives 12/34; a first digit of 2-9 becomes 02-09; backspacing over the slash works
export const formatExpiry = (v, prev = '') => {
  let d = String(v).replace(/\D/g, '').slice(0, 4);
  if (d.length === 1 && Number(d) > 1) d = '0' + d;
  if (d.length >= 2 && Number(d.slice(0, 2)) > 12) d = '12' + d.slice(2);
  if (v.length < prev.length && d.length <= 2) return d;
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
};

export const formatCvv = (v, number = '') => String(v).replace(/\D/g, '').slice(0, cardBrand(number.replace(/\D/g, '')) === 'Amex' ? 4 : 3);

const luhn = (digits) => {
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let n = Number(digits[digits.length - 1 - i]);
    if (i % 2) { n *= 2; if (n > 9) n -= 9; }
    sum += n;
  }
  return sum % 10 === 0;
};

// length is always checked; the checksum only when `strict` (real payments), so demo numbers like 1234 5678 9900 8777 work in demo mode
export const validateCardNumber = (v, strict = true) => {
  const d = String(v).replace(/\D/g, '');
  if (d.length < maxLen(d)) return `Enter the full ${maxLen(d)}-digit card number`;
  if (strict && !luhn(d)) return 'This card number is not valid';
  return undefined;
};

export const validateExpiry = (v) => {
  const m = /^(\d{2})\/(\d{2})$/.exec(v);
  if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return 'Enter the expiry as MM/YY';
  const now = new Date();
  const year = 2000 + Number(m[2]);
  if (year < now.getFullYear() || (year === now.getFullYear() && Number(m[1]) < now.getMonth() + 1)) return 'This card has expired';
  if (year > now.getFullYear() + 20) return 'Check the expiry year';
  return undefined;
};

export const validateCvv = (v, number = '') => {
  const need = cardBrand(number.replace(/\D/g, '')) === 'Amex' ? 4 : 3;
  return String(v).length === need ? undefined : `Enter the ${need}-digit security code`;
};
