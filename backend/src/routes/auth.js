import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { User } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { signToken } from '../utils/token.js';
import { bumpRev, fail, notify } from '../services/helpers.js';
import { clientUrl, mailEnabled } from '../services/mailer.js';
import { sendResetEmail, sendVerifyEmail } from '../services/emails.js';

const router = Router();
const msg = { error: 'Too many attempts. Please try again in a few minutes.' };
const base = { standardHeaders: true, legacyHeaders: false, message: msg };
const failedOnly = rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: 20, skipSuccessfulRequests: true });   // wrong passwords, bad tokens
const signupLimiter = rateLimit({ ...base, windowMs: 60 * 60 * 1000, limit: 15 });
const mailLimiter = rateLimit({ ...base, windowMs: 15 * 60 * 1000, limit: 6 });

const MIN_PW = 8;
const email = z.string().trim().toLowerCase().email('Enter a valid email.').max(120);
const newPassword = z.string().min(MIN_PW, `Password must be at least ${MIN_PW} characters.`).max(100);
const loginSchema = z.object({
  email, password: z.string().min(1, 'Enter your password.').max(200),
  role: z.enum(['customer', 'inspector', 'admin']).optional(),
});
const signupSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(80),
  email, password: newPassword,
  phone: z.string().trim().max(30).optional().default(''),
  acceptTerms: z.literal(true, { message: 'Please accept the Terms and Privacy Policy.' }),
});
const changeSchema = z.object({ currentPassword: z.string().min(1, 'Enter your current password.').max(200), newPassword });
const resetSchema = z.object({ token: z.string().min(20).max(200), password: newPassword });

export const parse = (schema, body) => {
  const r = schema.safeParse(body);
  if (!r.success) fail(400, r.error.issues[0].message);
  return r.data;
};
const session = (user) => ({ user: user.toJSON(), token: signToken(user) });

// one-time links: the user gets the random token, we only keep its hash
const makeToken = () => { const raw = randomBytes(32).toString('hex'); return { raw, hash: createHash('sha256').update(raw).digest('hex') }; };
const hashToken = (raw) => createHash('sha256').update(raw).digest('hex');
const HOUR = 60 * 60 * 1000;

async function issueVerification(user) {
  const t = makeToken();
  await User.updateOne({ _id: user._id }, { verifyTokenHash: t.hash, verifyExpires: new Date(Date.now() + 24 * HOUR) });
  return sendVerifyEmail(user, `${clientUrl()}/verify-email?token=${t.raw}`);
}

router.post('/login', failedOnly, async (req, res) => {
  const d = parse(loginSchema, req.body);
  const user = await User.findOne({ email: d.email }).select('+passwordHash');
  if (!user || !user.passwordHash || !(await bcrypt.compare(d.password, user.passwordHash))) fail(401, 'Incorrect email or password.');
  if (user.status === 'suspended') fail(403, 'This account has been suspended. Please contact support.');
  if (d.role && user.role !== d.role) fail(403, `This account is not a ${d.role} account. Use the correct portal tab.`);
  res.json(session(user));
});

router.post('/signup', signupLimiter, async (req, res) => {
  const d = parse(signupSchema, req.body);
  if (await User.exists({ email: d.email })) fail(409, 'An account with this email already exists. Try signing in.');
  const user = await User.create({ role: 'customer', name: d.name, email: d.email, phone: d.phone, passwordHash: await bcrypt.hash(d.password, 12) });
  await notify(user._id, 'Welcome to Car InspectO', 'Book your first certified inspection in under 2 minutes.');
  await bumpRev();
  issueVerification(user).catch((e) => console.error('Verification email failed:', e.message));
  res.status(201).json(session(user));
});

// Google sign-in: the browser obtains an access token with Google Identity Services; we confirm it was issued to OUR app.
router.post('/google', failedOnly, async (req, res) => {
  const { accessToken } = parse(z.object({ accessToken: z.string().min(10).max(4096) }), req.body);
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) fail(503, 'Google sign-in is not configured on the server.');
  const info = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!info || (info.aud !== clientId && info.azp !== clientId)) fail(401, 'Google sign-in failed. Please try again.');
  const profile = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${accessToken}` } }).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!profile?.email || profile.email_verified !== true) fail(401, 'Your Google email is not verified.');
  const mail = profile.email.toLowerCase();
  let user = await User.findOne({ email: mail });
  if (user) {
    if (user.role !== 'customer') fail(403, 'This account is not a customer account. Use the correct portal tab.');
    if (user.status === 'suspended') fail(403, 'This account has been suspended. Please contact support.');
  } else {
    user = await User.create({ role: 'customer', name: profile.name || mail.split('@')[0], email: mail, provider: 'google', emailVerified: true });
    await notify(user._id, 'Welcome to Car InspectO', 'Book your first certified inspection in under 2 minutes.');
    await bumpRev();
  }
  res.json(session(user));
});

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user.toJSON() }));

// Signed in: change the password. Every older session ends; this one continues with the fresh token returned here.
router.post('/change-password', requireAuth, failedOnly, async (req, res) => {
  const d = parse(changeSchema, req.body);
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!user.passwordHash) fail(400, 'This account signs in with Google and has no password yet. Use "Forgot password" to set one.');
  if (!(await bcrypt.compare(d.currentPassword, user.passwordHash))) fail(400, 'Your current password is incorrect.');
  if (d.currentPassword === d.newPassword) fail(400, 'Choose a password that is different from the current one.');
  user.passwordHash = await bcrypt.hash(d.newPassword, 12);
  user.passwordChangedAt = new Date();
  await user.save();
  res.json({ ok: true, token: signToken(user) });
});

// Forgot password: always answers the same way, so nobody can find out which emails have an account.
router.post('/forgot-password', mailLimiter, async (req, res) => {
  const { email: address } = parse(z.object({ email }), req.body);
  const user = await User.findOne({ email: address });
  if (user && user.status === 'active') {
    const t = makeToken();
    await User.updateOne({ _id: user._id }, { resetTokenHash: t.hash, resetExpires: new Date(Date.now() + HOUR) });
    sendResetEmail(user, `${clientUrl()}/reset-password?token=${t.raw}`).catch((e) => console.error('Reset email failed:', e.message));
  }
  res.json({ ok: true });
});

router.post('/reset-password', failedOnly, async (req, res) => {
  const d = parse(resetSchema, req.body);
  const user = await User.findOne({ resetTokenHash: hashToken(d.token), resetExpires: { $gt: new Date() } }).select('+resetTokenHash +resetExpires');
  if (!user) fail(400, 'This reset link is invalid or has expired. Please request a new one.');
  if (user.status === 'suspended') fail(403, 'This account has been suspended. Please contact support.');
  user.passwordHash = await bcrypt.hash(d.password, 12);
  user.passwordChangedAt = new Date();
  user.emailVerified = true;                       // they just proved they own the inbox
  user.resetTokenHash = undefined; user.resetExpires = undefined;
  await user.save();
  res.json({ ok: true });
});

router.post('/verify-email', failedOnly, async (req, res) => {
  const { token } = parse(z.object({ token: z.string().min(20).max(200) }), req.body);
  const user = await User.findOne({ verifyTokenHash: hashToken(token), verifyExpires: { $gt: new Date() } }).select('+verifyTokenHash +verifyExpires');
  if (!user) fail(400, 'This confirmation link is invalid or has expired. Sign in and request a new one from your profile.');
  user.emailVerified = true;
  user.verifyTokenHash = undefined; user.verifyExpires = undefined;
  await user.save();
  await bumpRev();
  res.json({ ok: true });
});

router.post('/resend-verification', requireAuth, mailLimiter, async (req, res) => {
  if (req.user.emailVerified) return res.json({ ok: true, alreadyVerified: true });
  await issueVerification(req.user);
  res.json({ ok: true, sent: mailEnabled });
});

export default router;
