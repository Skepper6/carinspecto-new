// Creates an admin account (or resets its password) without touching any other data.
//   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-strong-password' npm run create-admin
// Uses the same database rules as the server: NODE_ENV=production -> MONGODB_URI (live), otherwise the local database.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { User } from '../models/index.js';
import { connectDB } from '../config/db.js';

const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;
if (!email || !password) { console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD first.'); process.exit(1); }
if (password.length < 8) { console.error('Use a password of at least 8 characters.'); process.exit(1); }

if (!(await connectDB())) process.exit(1);

const passwordHash = await bcrypt.hash(password, 12);
const existing = await User.findOne({ email });
if (existing && existing.role !== 'admin') { console.error(`${email} already exists as a ${existing.role}. Use a different email.`); process.exit(1); }

await User.updateOne(
  { email },
  { $set: { passwordHash, role: 'admin', status: 'active', emailVerified: true, passwordChangedAt: new Date() }, $setOnInsert: { name: process.env.ADMIN_NAME || 'Admin', provider: 'password' } },
  { upsert: true },
);
console.log(existing ? `Password reset for admin ${email}.` : `Admin ${email} created.`);
await mongoose.disconnect();
