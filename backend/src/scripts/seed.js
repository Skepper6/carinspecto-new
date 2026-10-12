// Loads the demo dataset (the same one the frontend used to build in the browser) into MongoDB.
//   npm run seed            wipes the app collections and re-creates the demo data
// Needs the frontend dependencies installed (the dataset generator lives in frontend/src/lib/seed.js).
import 'dotenv/config';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { Booking, Content, Counter, File, Inspection, Notification, Payment, Plan, Ticket, User } from '../models/index.js';
import { connectDB } from '../config/db.js';

if (process.env.NODE_ENV === 'production' && !process.argv.includes('--force')) {
  console.error('Refusing to wipe a production database. Pass --force if you really mean it.');
  process.exit(1);
}

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), '../../../frontend');
const dir = mkdtempSync(join(tmpdir(), 'ci-seed-'));
const out = join(dir, 'seed.json');
execFileSync(process.execPath, [join(frontend, 'scripts/export-seed.mjs'), out], { cwd: frontend, stdio: 'inherit' });
const seed = JSON.parse(readFileSync(out, 'utf8'));
rmSync(dir, { recursive: true, force: true });

if (!(await connectDB())) { console.error('Set MONGODB_URI in backend/.env first.'); process.exit(1); }

const d = (v) => (v ? new Date(v) : null);
const ids = new Map();   // seed id (u_c1 …) -> real ObjectId
seed.users.forEach((u) => ids.set(u.id, new mongoose.Types.ObjectId()));
const uid = (old) => ids.get(old) ?? null;

console.log('Clearing old data…');
await Promise.all([User, Plan, Booking, Payment, Inspection, Ticket, Notification, Content, Counter, File].map((m) => m.deleteMany({})));

console.log('Hashing passwords…');
const users = await Promise.all(seed.users.map(async ({ id, pw, joinedAt, ...u }) => ({
  ...u, _id: uid(id), joinedAt: d(joinedAt), emailVerified: true, passwordHash: await bcrypt.hash(pw, 12),
})));
await User.insertMany(users);

await Plan.insertMany(seed.plans.map(({ id, ...p }, i) => ({ ...p, key: id, order: i })));

await Booking.insertMany(seed.bookings.map(({ id, customerId, inspectorId, createdAt, timeline, ...b }) => ({
  ...b, code: id, customer: uid(customerId), inspector: uid(inspectorId), createdAt: d(createdAt),
  timeline: timeline.map((t) => ({ ...t, at: d(t.at) })),
})));

await Payment.insertMany(seed.payments.map(({ id, bookingId, customerId, at, ...p }) => ({ ...p, bookingCode: bookingId, customer: uid(customerId), at: d(at) })));

await Inspection.insertMany(Object.values(seed.inspections).map(({ bookingId, updatedAt, completedAt, ...i }) => ({
  ...i, bookingCode: bookingId, updatedAt: d(updatedAt), completedAt: d(completedAt),
})));

await Ticket.insertMany(seed.tickets.map(({ id, customerId, createdAt, messages, ...t }) => ({
  ...t, code: id, customer: uid(customerId), createdAt: d(createdAt), seen: {},
  messages: messages.map((m) => ({ ...m, at: d(m.at), attachments: m.attachments ?? [] })),
})));

await Notification.insertMany(seed.notifications.map(({ id, userId, at, ...n }) => ({ ...n, user: uid(userId), at: d(at) })));
await Content.create({ _id: 'main', ...seed.content });

const maxNum = (list, prefix) => Math.max(0, ...list.map((x) => Number(String(x).replace(prefix, '')) || 0));
await Counter.insertMany([
  { _id: 'booking', seq: maxNum(seed.bookings.map((b) => b.id), 'CI-') },
  { _id: 'ticket', seq: maxNum(seed.tickets.map((t) => t.id), 'T-') },
  { _id: 'rev', seq: 1 },
]);

console.log(`Seeded ${seed.users.length} users, ${seed.bookings.length} bookings, ${Object.keys(seed.inspections).length} inspections, ${seed.tickets.length} tickets.`);
console.log('Demo logins: omar@example.com / demo123 (customer), khalid@carinspecto.com / demo123 (inspector), admin@carinspecto.com / admin123');
await mongoose.disconnect();
