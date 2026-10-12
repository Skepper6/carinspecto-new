// Moves photos and attachments that are still stored inside MongoDB to DigitalOcean Spaces. Safe to re-run.
//   npm run migrate:photos
import 'dotenv/config';
import mongoose from 'mongoose';
import { File, Inspection } from '../models/index.js';
import { connectDB } from '../config/db.js';
import { hasInline, offloadData, offloadPhotos } from '../services/photos.js';
import { putObject, storageEnabled } from '../services/storage.js';

if (!storageEnabled) { console.error('Set the DO_SPACES_* variables in backend/.env first.'); process.exit(1); }
if (!(await connectDB())) process.exit(1);

let moved = 0;
for (const ins of await Inspection.find()) {
  if (!hasInline(ins)) continue;
  ins.photos = await offloadPhotos(ins.bookingCode, ins.photos);
  ins.data = await offloadData(ins.bookingCode, ins.data);
  ins.markModified('photos'); ins.markModified('data');
  await ins.save();
  moved++;
}
console.log(`Inspections moved: ${moved}`);

let files = 0;
for (const f of await File.find({ stored: false, data: { $exists: true } })) {
  await putObject(`files/${f._id}`, f.data, f.contentType);
  f.stored = true; f.data = undefined;
  await f.save();
  files++;
}
console.log(`Attachments moved: ${files}`);
await mongoose.disconnect();
