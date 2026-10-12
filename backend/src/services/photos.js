import { createHash } from 'node:crypto';
import { getObject, putObject, storageEnabled } from './storage.js';

// Inspection photos arrive as compressed JPEG/PNG data URLs. With storage configured they are moved to Spaces and the
// database keeps a short reference ("spaces:<key>") instead. They are turned back into data URLs only when a full
// inspection is opened, so the browser and the PDF code work exactly as before.
const INLINE = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/;
const REF = 'spaces:';
const uploaded = new Set();   // keys already stored by this process (content-addressed, so re-saves cost nothing)

async function pool(items, size, fn) {
  const out = new Array(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, async () => {
    while (next < items.length) { const i = next++; out[i] = await fn(items[i], i); }
  }));
  return out;
}

async function offloadString(code, s, known) {
  const m = typeof s === 'string' ? INLINE.exec(s) : null;
  if (!m) return s;
  const body = Buffer.from(m[2], 'base64');
  const ext = m[1] === 'png' ? 'png' : 'jpg';
  const objectKey = `inspections/${code}/${createHash('sha256').update(body).digest('hex')}.${ext}`;
  if (!uploaded.has(objectKey) && !known?.has(objectKey)) { await putObject(objectKey, body, `image/${m[1]}`); uploaded.add(objectKey); }
  return REF + objectKey;
}

async function inflateString(s) {
  if (typeof s !== 'string' || !s.startsWith(REF)) return s;
  const obj = await getObject(s.slice(REF.length));
  return obj ? `data:${obj.contentType};base64,${obj.body.toString('base64')}` : '';
}

// the report-level photo list: [{ id, category, src }]
export async function offloadPhotos(code, photos, known) {
  if (!storageEnabled || !photos?.length) return photos;
  return pool(photos, 6, async (p) => ({ ...p, src: await offloadString(code, p.src, known) }));
}

// per-checkpoint photos live inside data[section][item].photos = [dataUrl, ...]
export async function offloadData(code, data, known) {
  if (!storageEnabled || !data) return data;
  const jobs = [];
  Object.values(data).forEach((items) => Object.values(items ?? {}).forEach((cell) => {
    if (Array.isArray(cell?.photos)) cell.photos.forEach((src, i) => jobs.push(async () => { cell.photos[i] = await offloadString(code, src, known); }));
  }));
  await pool(jobs, 6, (job) => job());
  return data;
}

// keys this inspection already has in storage – photos matching them are never uploaded again
export function storedKeys(ins) {
  const keys = new Set();
  const add = (v) => { if (typeof v === 'string' && v.startsWith(REF)) keys.add(v.slice(REF.length)); };
  (ins.photos ?? []).forEach((p) => add(p?.src));
  Object.values(ins.data ?? {}).forEach((items) => Object.values(items ?? {}).forEach((cell) => { if (Array.isArray(cell?.photos)) cell.photos.forEach(add); }));
  return keys;
}

// turns stored references back into data URLs (works on a plain inspection object)
export async function inflateInspection(ins) {
  const jobs = [];
  (ins.photos ?? []).forEach((p) => { if (p.src?.startsWith?.(REF)) jobs.push(async () => { p.src = await inflateString(p.src); }); });
  Object.values(ins.data ?? {}).forEach((items) => Object.values(items ?? {}).forEach((cell) => {
    if (Array.isArray(cell?.photos)) cell.photos.forEach((src, i) => { if (src?.startsWith?.(REF)) jobs.push(async () => { cell.photos[i] = await inflateString(src); }); });
  }));
  await pool(jobs, 6, (job) => job());
  return ins;
}

export const hasInline = (ins) => JSON.stringify([ins.photos, ins.data]).includes('data:image/jpeg') || JSON.stringify([ins.photos, ins.data]).includes('data:image/png');
