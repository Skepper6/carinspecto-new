// Sends email through Resend (https://resend.com). Needs RESEND_API_KEY and MAIL_FROM (an address on a verified domain).
// Without them nothing is sent: in development the message is printed to the server console so links can still be used.
const { RESEND_API_KEY, MAIL_FROM } = process.env;
const API_URL = process.env.RESEND_API_URL || 'https://api.resend.com/emails';

export const mailEnabled = Boolean(RESEND_API_KEY && MAIL_FROM);
export const clientUrl = () => (process.env.CLIENT_URL || process.env.CLIENT_ORIGIN?.split(',')[0] || 'http://localhost:5173').trim().replace(/\/$/, '');

// never throws: a mail problem must not break the request that triggered it
export async function sendMail({ to, subject, text, html }) {
  if (!mailEnabled) {
    if (process.env.NODE_ENV !== 'production') console.log(`\n[email not sent – no provider configured]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    else console.warn(`Email "${subject}" not sent: set RESEND_API_KEY and MAIL_FROM.`);
    return false;
  }
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: MAIL_FROM, to: [to], subject, text, html }),
    });
    if (!res.ok) { console.error(`Email provider error ${res.status}:`, (await res.text()).slice(0, 200)); return false; }
    return true;
  } catch (e) {
    console.error('Email send failed:', e.message);
    return false;
  }
}
