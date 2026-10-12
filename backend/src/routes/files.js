import { Router } from 'express';
import express from 'express';
import mongoose from 'mongoose';
import { File, Ticket } from '../models/index.js';
import { requireAuth } from '../middleware/auth.js';
import { fail } from '../services/helpers.js';
import { getObject, putObject, storageEnabled } from '../services/storage.js';
import { FILE_TYPES, MAX_FILE_BYTES } from '../config/constants.js';

const router = Router();
router.use(requireAuth);

// Upload one attachment (jpg / png / pdf / doc / docx, max 5 MB). The server picks the id.
router.post('/', express.raw({ type: () => true, limit: MAX_FILE_BYTES + 1024 }), async (req, res) => {
  const type = String(req.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (!FILE_TYPES[type]) fail(400, 'Only JPG, PNG, PDF and DOC files are allowed.');
  if (!Buffer.isBuffer(req.body) || !req.body.length) fail(400, 'The file is empty.');
  if (req.body.length > MAX_FILE_BYTES) fail(413, 'The file is larger than 5 MB.');
  const _id = new mongoose.Types.ObjectId();
  if (storageEnabled) await putObject(`files/${_id}`, req.body, type);
  const f = await File.create({ _id, owner: req.user._id, contentType: type, size: req.body.length, stored: storageEnabled, ...(storageEnabled ? {} : { data: req.body }) });
  res.status(201).json({ id: String(f._id) });
});

// Readable by whoever uploaded it, admins, and the customer on a ticket that carries it.
router.get('/:id', async (req, res) => {
  const f = await File.findById(req.params.id).catch(() => null);
  if (!f) fail(404, 'File not found.');
  const u = req.user;
  const ok = u.role === 'admin' || String(f.owner) === String(u._id)
    || (u.role === 'customer' && await Ticket.exists({ customer: u._id, 'messages.attachments.id': String(f._id) }));
  if (!ok) fail(403, 'You do not have access to this.');
  const bytes = f.stored ? (await getObject(`files/${f._id}`))?.body : f.data;
  if (!bytes) fail(404, 'File not found.');
  res.set({ 'Content-Type': f.contentType, 'Content-Length': bytes.length, 'Cache-Control': 'private, max-age=3600', 'Content-Disposition': 'inline' }).send(bytes);
});

export default router;
