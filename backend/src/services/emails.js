import { User } from '../models/index.js';
import { clientUrl, mailEnabled, sendMail } from './mailer.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function layout({ title, intro, button, link, outro }) {
  return `<!doctype html><html><body style="margin:0;background:#f5f4fb;font-family:Arial,Helvetica,sans-serif;color:#1b1740">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:14px;overflow:hidden">
<tr><td style="background:#33237f;color:#ffffff;padding:20px 28px;font-size:20px;font-weight:700">Car Inspect<span style="color:#f58220">O</span></td></tr>
<tr><td style="padding:28px">
<h2 style="margin:0 0 12px;font-size:20px">${esc(title)}</h2>
<p style="margin:0 0 20px;line-height:1.6;font-size:15px">${intro}</p>
${button ? `<p style="margin:0 0 20px"><a href="${esc(link)}" style="display:inline-block;background:#f58220;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px">${esc(button)}</a></p>
<p style="margin:0 0 20px;font-size:12px;color:#6b6a85;word-break:break-all">Or copy this link: ${esc(link)}</p>` : ''}
${outro ? `<p style="margin:0;font-size:13px;color:#6b6a85;line-height:1.6">${outro}</p>` : ''}
</td></tr></table></td></tr></table></body></html>`;
}

export function sendResetEmail(user, link) {
  return sendMail({
    to: user.email, subject: 'Reset your Car InspectO password',
    text: `Hi ${user.name},\n\nUse this link to choose a new password (valid for 1 hour):\n${link}\n\nIf you did not ask for this, you can ignore this email – your password stays the same.`,
    html: layout({ title: 'Reset your password', intro: `Hi ${esc(user.name)}, use the button below to choose a new password. The link is valid for 1 hour.`, button: 'Choose a new password', link, outro: 'If you did not ask for this, you can ignore this email – your password stays the same.' }),
  });
}

export function sendVerifyEmail(user, link) {
  return sendMail({
    to: user.email, subject: 'Confirm your email address',
    text: `Hi ${user.name},\n\nWelcome to Car InspectO. Please confirm your email address:\n${link}\n\nThe link is valid for 24 hours.`,
    html: layout({ title: 'Confirm your email', intro: `Hi ${esc(user.name)}, welcome to Car InspectO. Please confirm your email address so we can reach you about your inspections.`, button: 'Confirm my email', link, outro: 'The link is valid for 24 hours.' }),
  });
}

/* ---- optional notification emails (only when a mail provider is configured) ---- */
async function toUser(userId, build) {
  if (!mailEnabled) return;
  try {
    const u = await User.findById(userId).select('name email status');
    if (!u || u.status !== 'active') return;
    const m = build(u);
    await sendMail({ to: u.email, subject: m.subject, text: m.text, html: layout({ title: m.subject, intro: esc(m.text).replace(/\n/g, '<br>'), button: m.button, link: m.link }) });
  } catch (e) { console.error('Notification email failed:', e.message); }
}

export const mailBookingConfirmed = (userId, b) => toUser(userId, (u) => ({
  subject: `Booking ${b.code} confirmed`,
  text: `Hi ${u.name},\n\nYour ${b.car.make} ${b.car.model} inspection is booked for ${b.date} at ${b.time}. We will assign an inspector shortly.`,
  button: 'View my bookings', link: `${clientUrl()}/app/bookings`,
}));
export const mailReportReady = (userId, b) => toUser(userId, (u) => ({
  subject: `Your inspection report for ${b.code} is ready`,
  text: `Hi ${u.name},\n\nYour ${b.car.make} ${b.car.model} has been inspected and the report is ready to view and download.`,
  button: 'Open my report', link: `${clientUrl()}/app/reports?report=${encodeURIComponent(b.code)}`,
}));
export const mailSupportReply = (userId, t) => toUser(userId, (u) => ({
  subject: `Support replied to ${t.code}`,
  text: `Hi ${u.name},\n\nOur team replied to your ticket "${t.subject}".`,
  button: 'Open my tickets', link: `${clientUrl()}/app/support`,
}));
