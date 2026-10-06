// Firebase Auth wiring. Only active when VITE_FIREBASE_* env vars are present;
// otherwise the app runs in demo mode with the local mock accounts.
const cfg = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

export const firebaseEnabled = Boolean(cfg.apiKey && cfg.projectId);

let authPromise;
export function getFirebaseAuth() {
  if (!firebaseEnabled) return null;
  authPromise ??= (async () => {
    const [{ initializeApp }, fa] = await Promise.all([import('firebase/app'), import('firebase/auth')]);
    const app = initializeApp(cfg);
    return { auth: fa.getAuth(app), fa };
  })();
  return authPromise;
}
