import { api, getSessionUserId, saveSession } from '../lib/api';
import { endSession, startSession } from '../lib/db';

export { getSessionUserId };

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
export const googleEnabled = Boolean(googleClientId);

// Signs in on the server, then loads the data this user is allowed to see.
async function begin({ user, token }) {
  await startSession(token, user.id);
  return user.id;
}

export const loginWithEmail = async (email, password, role) => begin(await api('POST', '/auth/login', { email, password, role }));
export const signupWithEmail = async ({ name, email, password, phone, acceptTerms }) => begin(await api('POST', '/auth/signup', { name, email, password, phone, acceptTerms }));

/* ---- Google sign-in (Google Identity Services). The server verifies the token was issued to this app. ---- */
function loadGoogle() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) return resolve();
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Could not load Google sign-in. Check your connection and try again.'));
    document.head.appendChild(s);
    return undefined;
  });
}
async function googleAccessToken() {
  if (!googleEnabled) throw new Error('Google sign-in is not set up yet.');
  await loadGoogle();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: googleClientId,
      scope: 'openid email profile',
      callback: (r) => (r.access_token ? resolve(r.access_token) : reject(new Error('Google sign-in was cancelled.'))),
      error_callback: (e) => reject(new Error(e?.type === 'popup_closed' ? 'Google sign-in was cancelled.' : 'Google sign-in failed. Please try again.')),
    });
    client.requestAccessToken();
  });
}
export async function loginWithGoogle() {
  const accessToken = await googleAccessToken();
  return begin(await api('POST', '/auth/google', { accessToken }));
}

export const logout = () => endSession();

// Changing the password ends every other session; this one keeps going with the fresh token the server returns.
export async function changePassword(currentPassword, newPassword) {
  const { token } = await api('POST', '/auth/change-password', { currentPassword, newPassword });
  saveSession(token, getSessionUserId());
}
export const forgotPassword = (email) => api('POST', '/auth/forgot-password', { email });
export const resetPassword = (token, password) => api('POST', '/auth/reset-password', { token, password });
export const verifyEmail = (token) => api('POST', '/auth/verify-email', { token });
export const resendVerification = () => api('POST', '/auth/resend-verification');
