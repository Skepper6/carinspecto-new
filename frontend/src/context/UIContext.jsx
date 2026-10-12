import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

const Ctx = createContext(null);
const ICONS = { success: CheckCircle2, error: XCircle, info: Info, warn: AlertTriangle };

export function UIProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const [theme, setThemeState] = useState(() => document.documentElement.dataset.theme || 'light');
  const idRef = useRef(0);

  const dismiss = useCallback((id) => {
    setToasts((t) => t.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 260);
  }, []);

  const push = useCallback((type, message, title) => {
    const id = ++idRef.current;
    // colour follows the meaning of the message: red = removed/blocked, orange = pending/waiting, green = good outcome
    let tone = type;
    if (type === 'success' || type === 'info') {
      const m = String(message);
      if (/(suspended|removed|deleted|cancel+ed|refund(ed)?|rejected|blocked|discarded)/i.test(m)) tone = 'error';
      else if (/(pending|due on arrival|unavailable|not available|awaiting|waiting)/i.test(m)) tone = 'warn';
      else if (type === 'success' || /(reactivated|you are available|now active|is active)/i.test(m)) tone = 'success';
    }
    setToasts((t) => [...t.slice(-3), { id, type: tone, message, title }]);
    setTimeout(() => dismiss(id), 4200);
  }, [dismiss]);

  useEffect(() => {
    const onFull = () => push('error', 'Browser storage is full – try removing some photos.', 'Could not save');
    window.addEventListener('ci:storage-full', onFull);
    return () => window.removeEventListener('ci:storage-full', onFull);
  }, [push]);

  useEffect(() => {
    const onExpired = () => push('info', 'Your session has ended. Please sign in again.');
    window.addEventListener('ci:session-expired', onExpired);
    return () => window.removeEventListener('ci:session-expired', onExpired);
  }, [push]);

  const toast = useMemo(() => ({
    success: (m, t) => push('success', m, t),
    error: (m, t) => push('error', m, t),
    info: (m, t) => push('info', m, t),
    warn: (m, t) => push('warn', m, t),
  }), [push]);

  // Waits for a data change to be accepted by the server: shows the success message only then, or the server's reason if it fails.
  // Resolves with { data } on success and null on failure.
  const guard = useCallback(async (promise, successMessage, successTitle) => {
    try {
      const data = await promise;
      if (successMessage) push('success', successMessage, successTitle);
      return { data };
    } catch (e) {
      push('error', e?.message || 'Something went wrong. Please try again.');
      return null;
    }
  }, [push]);

  const confirm = useCallback((opts) => new Promise((resolve) => setConfirmState({ ...opts, resolve })), []);
  const closeConfirm = (val) => { confirmState?.resolve(val); setConfirmState(null); };

  const setTheme = useCallback((t) => {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('ci_theme', t); } catch { /* ignore */ }
    setThemeState(t);
  }, []);

  const value = useMemo(() => ({ toast, guard, confirm, theme, setTheme }), [toast, guard, confirm, theme, setTheme]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => {
          const Icon = ICONS[t.type];
          return (
            <div key={t.id} className={`toast toast-${t.type} ${t.leaving ? 'leaving' : ''}`} role="status">
              <Icon size={20} className="toast-icon" />
              <div className="toast-body">
                {t.title && <strong>{t.title}</strong>}
                <span>{t.message}</span>
              </div>
              <button className="icon-btn sm" onClick={() => dismiss(t.id)} aria-label="Dismiss"><X size={14} /></button>
              <i className="toast-bar" />
            </div>
          );
        })}
      </div>
      <Modal open={!!confirmState} onClose={() => closeConfirm(false)} size="sm" title={confirmState?.title}
        footer={(
          <>
            <Button variant="ghost" onClick={() => closeConfirm(false)}>{confirmState?.cancelText || 'Cancel'}</Button>
            <Button variant={confirmState?.danger ? 'danger' : 'primary'} onClick={() => closeConfirm(true)}>{confirmState?.confirmText || 'Confirm'}</Button>
          </>
        )}>
        <p className="muted">{confirmState?.message}</p>
      </Modal>
    </Ctx.Provider>
  );
}

export const useUI = () => useContext(Ctx);
