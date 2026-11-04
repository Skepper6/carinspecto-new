// Sends email through SendGrid (SENDGRID_API_KEY) or Resend (RESEND_API_KEY). Both need MAIL_FROM, an address on a verified domain/sender.
// SendGrid wins if both keys are set. Without a key nothing is sent: in development the message is printed to the server console
// so links can still be used.
const { SENDGRID_API_KEY, RESEND_API_KEY, MAIL_FROM } = process.env;
const SENDGRID_URL = process.env.SENDGRID_API_URL || 'https://api.sendgrid.com/v3/mail/send';
const RESEND_URL = process.env.RESEND_API_URL || 'https://api.resend.com/emails';

const provider = MAIL_FROM && SENDGRID_API_KEY ? 'sendgrid' : MAIL_FROM && RESEND_API_KEY ? 'resend' : null;
export const mailEnabled = Boolean(provider);
export const clientUrl = () => (process.env.CLIENT_URL || process.env.CLIENT_ORIGIN?.split(',')[0] || 'http://localhost:5173').trim().replace(/\/$/, '');

// "Car InspectO <no-reply@x.com>" -> { name, email }
const parseFrom = (from) => {
  const m = /^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/.exec(from);
  return m ? { name: m[1].trim() || undefined, email: m[2].trim() } : { email: from.trim() };
};

const request = {
  sendgrid: ({ to, subject, text, html }) => ({
    url: SENDGRID_URL, headers: { Authorization: `Bearer ${SENDGRID_API_KEY}`, 'Content-Type': 'application/json' },
    body: { personalizations: [{ to: [{ email: to }] }], from: parseFrom(MAIL_FROM), subject, content: [{ type: 'text/plain', value: text }, { type: 'text/html', value: html }] },
  }),
  resend: ({ to, subject, text, html }) => ({
    url: RESEND_URL, headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: { from: MAIL_FROM, to: [to], subject, text, html },
  }),
};

// never throws: a mail problem must not break the request that triggered it
export async function sendMail({ to, subject, text, html }) {
  if (!mailEnabled) {
    if (process.env.NODE_ENV !== 'production') console.log(`\n[email not sent – no provider configured]\nTo: ${to}\nSubject: ${subject}\n${text}\n`);
    else console.warn(`Email "${subject}" not sent: set SENDGRID_API_KEY (or RESEND_API_KEY) and MAIL_FROM.`);
    return false;
  }
  try {
    const r = request[provider]({ to, subject, text, html });
    const res = await fetch(r.url, { method: 'POST', headers: r.headers, body: JSON.stringify(r.body) });
    if (!res.ok) { console.error(`Email provider error ${res.status}:`, (await res.text()).slice(0, 200)); return false; }
    return true;
  } catch (e) {
    console.error('Email send failed:', e.message);
    return false;
  }
}
