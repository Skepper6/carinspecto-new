// Attachment storage. Files live in IndexedDB (localStorage cannot hold 5 MB files); only metadata is kept in the app data.
import { uid } from './format';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES = 5;
export const ACCEPT = '.jpg,.jpeg,.png,.pdf,.doc,.docx';
const OK_EXT = ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'];

export const fmtSize = (b) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
export const fileKind = (name = '') => {
  const e = name.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png'].includes(e) ? 'image' : e === 'pdf' ? 'pdf' : 'doc';
};

export function validateFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!OK_EXT.includes(ext)) return `${file.name}: only JPG, PNG, PDF and DOC files are allowed.`;
  if (file.size > MAX_FILE_BYTES) return `${file.name} is ${fmtSize(file.size)} – the limit is 5 MB.`;
  if (file.size === 0) return `${file.name} is empty.`;
  return null;
}

let dbp;
function open() {
  dbp ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('ci_files', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('f', { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbp;
}
const run = async (mode, fn) => {
  const db = await open();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('f', mode);
    const r = fn(tx.objectStore('f'));
    tx.oncomplete = () => resolve(r?.result);
    tx.onerror = () => reject(tx.error);
  });
};

const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
export async function saveFile(file) {
  const id = uid('f');
  await run('readwrite', (s) => s.put({ id, blob: file }));
  // also keep a copy on the server (when it is running) so the other side can open it from any browser
  try { await fetch(`${API}/files/${id}`, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file }); } catch { /* offline: local copy only */ }
  return { id, name: file.name, size: file.size, type: file.type };
}
export async function getFileBlob(id) {
  const rec = await run('readonly', (s) => s.get(id));
  if (rec?.blob) return rec.blob;
  try {
    const r = await fetch(`${API}/files/${id}`);
    if (!r.ok) return null;
    const blob = await r.blob();
    run('readwrite', (s) => s.put({ id, blob })).catch(() => {});
    return blob;
  } catch { return null; }
}
