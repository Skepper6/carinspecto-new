// Talks to the Express API. The login token lives in sessionStorage, so each browser tab has its own session
// (customer, inspector and admin can be open side by side) and closing the tab signs out.
export const API = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const TOKEN = 'ci_token';
const UID = 'ci_uid';

const read = (k) => { try { return sessionStorage.getItem(k); } catch { return null; } };
const write = (k, v) => { try { v ? sessionStorage.setItem(k, v) : sessionStorage.removeItem(k); } catch { /* storage unavailable */ } };

export const getToken = () => read(TOKEN);
export const getSessionUserId = () => read(UID);
export const saveSession = (token, userId) => { write(TOKEN, token); write(UID, userId); };
export const clearSession = () => { write(TOKEN, null); write(UID, null); };

let onExpired = () => {};
export const setExpiredHandler = (fn) => { onExpired = fn; };

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

// A request that never answers must not leave the app spinning forever: it fails after `timeout` ms with a clear message.
async function request(path, { method = 'GET', body, raw, type, timeout = 30000 } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (type) headers['Content-Type'] = type;
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    return await fetch(`${API}${path}`, { method, headers, signal: ctl.signal, body: raw ?? (body !== undefined ? JSON.stringify(body) : undefined) });
  } catch (e) {
    throw new ApiError(e?.name === 'AbortError' ? 'The server is taking too long to answer. Please try again.' : 'Cannot reach the server. Please check your connection and try again.', 0);
  } finally {
    clearTimeout(timer);
  }
}

export async function api(method, path, body) {
  const res = await request(path, { method, body });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // the session is over (expired token, or the account was suspended while signed in)
    const ended = res.status === 401 || (res.status === 403 && /suspended/i.test(data.error || ''));
    if (ended && getToken() && !path.startsWith('/auth/')) onExpired();
    throw new ApiError(data.error || 'Something went wrong. Please try again.', res.status);
  }
  return data;
}

export async function uploadFile(file) {
  const res = await request('/files', { method: 'POST', raw: file, type: file.type || 'application/octet-stream', timeout: 120000 });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || 'Could not upload the file.', res.status);
  return data.id;
}

export async function downloadBlob(path) {
  const res = await request(path);
  return res.ok ? res.blob() : null;
}
