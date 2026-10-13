// Attachment helpers. Only metadata is kept in the app data; the file itself lives on the server.
import { downloadBlob, uploadFile } from './api';

export const MAX_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_FILES = 5;
export const ACCEPT = '.jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf';
const OK_EXT = ['jpg', 'jpeg', 'png', 'pdf'];

export const fmtSize = (b) => (b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toFixed(1)} MB`);
export const fileKind = (name = '') => {
  const e = name.split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png'].includes(e) ? 'image' : e === 'pdf' ? 'pdf' : 'doc';
};

export function validateFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  if (!OK_EXT.includes(ext)) return `${file.name}: only JPG, PNG or PDF files are allowed.`;
  if (file.size > MAX_FILE_BYTES) return `${file.name} is ${fmtSize(file.size)} – the limit is 5 MB.`;
  if (file.size === 0) return `${file.name} is empty.`;
  return null;
}

// Files are stored by the API (only the owner, the ticket's customer and admins can open them).
export async function saveFile(file) {
  const id = await uploadFile(file);
  return { id, name: file.name, size: file.size, type: file.type };
}
export const getFileBlob = (id) => downloadBlob(`/files/${id}`);
