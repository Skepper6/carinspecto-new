import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { boot, useDB, useDBStatus } from '../lib/db';
import Button from '../components/ui/Button';
import * as auth from '../services/auth';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [uid, setUid] = useState(() => auth.getSessionUserId());
  const user = useDB((s) => s.users.find((u) => u.id === uid) ?? null);
  const status = useDBStatus();

  // the server ended this session (expired, or the account was suspended)
  useEffect(() => {
    const end = () => setUid(null);
    window.addEventListener('ci:session-expired', end);
    return () => window.removeEventListener('ci:session-expired', end);
  }, []);

  const run = useCallback(async (fn) => setUid(await fn()), []);
  const value = useMemo(() => ({
    user,
    login: (email, pw, role) => run(() => auth.loginWithEmail(email, pw, role)),
    signup: (data) => run(() => auth.signupWithEmail(data)),
    google: () => run(() => auth.loginWithGoogle()),
    logout: async () => { await auth.logout(); setUid(null); },
  }), [user, run]);

  if (!status.ready) {
    return status.error ? (
      <div className="boot" style={{ flexDirection: 'column', gap: 12, textAlign: 'center', padding: 24 }}>
        <b>We can’t reach Car InspectO right now</b>
        <span className="muted">{status.error}</span>
        <Button onClick={boot}>Try again</Button>
      </div>
    ) : <div className="boot"><i className="spinner" /></div>;
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
