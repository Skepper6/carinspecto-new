import { createUser, findUserByEmail } from '../lib/db';
import { firebaseEnabled, getFirebaseAuth } from './firebase';

const SESSION_KEY = 'ci_session';
const wait = (ms = 450) => new Promise((r) => setTimeout(r, ms));

// Each browser tab keeps its own login (sessionStorage), so customer / inspector / admin can be open side by side.
// (With Firebase enabled, persistent sign-in is handled by Firebase itself.)
export const getSessionUserId = () => {
  try { return sessionStorage.getItem(SESSION_KEY); } catch { return null; }
};
const setSession = (id) => {
  try { id ? sessionStorage.setItem(SESSION_KEY, id) : sessionStorage.removeItem(SESSION_KEY); } catch { /* storage unavailable */ }
};

function ensureAllowed(user, role) {
  if (!user) throw new Error('No account found with these details.');
  if (user.status === 'suspended') throw new Error('This account has been suspended. Please contact support.');
  if (role && user.role !== role) throw new Error(`This account is not a ${role} account. Use the correct portal tab.`);
}

export async function loginWithEmail(email, password, role) {
  await wait();
  if (firebaseEnabled) {
    const { auth, fa } = await getFirebaseAuth();
    await fa.signInWithEmailAndPassword(auth, email, password);
  }
  const user = findUserByEmail(email);
  ensureAllowed(user, role);
  if (!firebaseEnabled && user.pw !== password) throw new Error('Incorrect password.');
  setSession(user.id);
  return user.id;
}

export async function signupWithEmail({ name, email, password, phone }) {
  await wait();
  if (findUserByEmail(email)) throw new Error('An account with this email already exists. Try signing in.');
  if (firebaseEnabled) {
    const { auth, fa } = await getFirebaseAuth();
    await fa.createUserWithEmailAndPassword(auth, email, password);
  }
  const user = createUser({ role: 'customer', name, email, phone, pw: firebaseEnabled ? undefined : password });
  setSession(user.id);
  return user.id;
}

export async function loginWithGoogle() {
  await wait(700);
  let email;
  let name;
  if (firebaseEnabled) {
    const { auth, fa } = await getFirebaseAuth();
    const res = await fa.signInWithPopup(auth, new fa.GoogleAuthProvider());
    email = res.user.email;
    name = res.user.displayName || email.split('@')[0];
  } else {
    // demo mode: simulate a Google account
    email = 'google.user@gmail.com';
    name = 'Google User';
  }
  const user = findUserByEmail(email) ?? createUser({ role: 'customer', name, email, phone: '', provider: 'google' });
  ensureAllowed(user, 'customer');
  setSession(user.id);
  return user.id;
}

export async function logout() {
  if (firebaseEnabled) {
    const { auth, fa } = await getFirebaseAuth();
    await fa.signOut(auth);
  }
  setSession(null);
}
