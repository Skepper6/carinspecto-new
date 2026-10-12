import { useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import { useDB } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { useUI } from '../../context/UIContext';
import { Card, Input } from '../ui/kit';
import Button from '../ui/Button';
import { changePassword } from '../../services/auth';

export const MIN_PASSWORD = 8;

// Shared by the customer, inspector and admin profile pages.
export default function ChangePasswordCard() {
  const { user } = useAuth();
  const me = useDB((s) => s.users.find((u) => u.id === user.id));
  const { guard } = useUI();
  const [f, setF] = useState({ current: '', next: '', again: '' });
  const [errs, setErrs] = useState({});
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErrs({ ...errs, [k]: undefined }); };
  const googleOnly = me?.provider === 'google';

  const save = async () => {
    const e = {};
    if (!f.current) e.current = 'Enter your current password';
    if (f.next.length < MIN_PASSWORD) e.next = `Use at least ${MIN_PASSWORD} characters`;
    else if (f.next === f.current) e.next = 'Choose a password that is different from the current one';
    if (f.again !== f.next) e.again = 'The two passwords do not match';
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    const ok = await guard(changePassword(f.current, f.next), 'Password changed. You have been signed out on other devices.');
    setBusy(false);
    if (ok) { setF({ current: '', next: '', again: '' }); setShow(false); }
  };

  return (
    <Card title="Password">
      {googleOnly ? (
        <p className="muted small">You sign in with Google, so there is no password yet. Use “Forgot password” on the sign-in page if you also want to sign in with an email and password.</p>
      ) : (
        <>
          <div className="form-grid">
            <Input className="span-2" label="Current password" type={show ? 'text' : 'password'} value={f.current} onChange={set('current')} error={errs.current} autoComplete="current-password" />
            <Input label="New password" type={show ? 'text' : 'password'} value={f.next} onChange={set('next')} error={errs.next} hint={`At least ${MIN_PASSWORD} characters`} autoComplete="new-password" />
            <Input label="Repeat new password" type={show ? 'text' : 'password'} value={f.again} onChange={set('again')} error={errs.again} autoComplete="new-password" />
          </div>
          <div className="row-between">
            <button type="button" className="link-btn" onClick={() => setShow((s) => !s)}>{show ? <EyeOff size={14} /> : <Eye size={14} />} {show ? 'Hide' : 'Show'} passwords</button>
            <Button icon={KeyRound} loading={busy} onClick={save}>Change password</Button>
          </div>
        </>
      )}
    </Card>
  );
}
