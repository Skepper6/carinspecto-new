import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useDB } from '../lib/db';
import * as auth from '../services/auth';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [uid, setUid] = useState(() => auth.getSessionUserId());
  const user = useDB((s) => s.users.find((u) => u.id === uid) ?? null);

  const run = useCallback(async (fn) => setUid(await fn()), []);
  const value = useMemo(() => ({
    user,
    login: (email, pw, role) => run(() => auth.loginWithEmail(email, pw, role)),
    signup: (data) => run(() => auth.signupWithEmail(data)),
    google: () => run(() => auth.loginWithGoogle()),
    logout: async () => { await auth.logout(); setUid(null); },
  }), [user, run]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
