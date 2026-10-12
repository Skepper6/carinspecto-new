import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Eye, EyeOff, LinkIcon } from 'lucide-react';
import AuthShell from '../components/layout/AuthShell';
import { Input } from '../components/ui/kit';
import Button from '../components/ui/Button';
import { useUI } from '../context/UIContext';
import { resetPassword } from '../services/auth';
import { MIN_PASSWORD } from '../components/shared/ChangePasswordCard';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const nav = useNavigate();
  const { toast } = useUI();
  const [f, setF] = useState({ pw: '', again: '' });
  const [errs, setErrs] = useState({});
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [dead, setDead] = useState(!token);   // the link is missing or the server said it is no longer valid

  const submit = async (ev) => {
    ev.preventDefault();
    const e = {};
    if (f.pw.length < MIN_PASSWORD) e.pw = `Use at least ${MIN_PASSWORD} characters`;
    if (f.again !== f.pw) e.again = 'The two passwords do not match';
    setErrs(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try { await resetPassword(token, f.pw); setDone(true); setTimeout(() => nav('/login', { replace: true }), 2500); }
    catch (err) {
      if (err.status === 400 && /link/i.test(err.message)) setDead(true);
      else toast.error(err.message || 'Could not reset the password. Please try again.');
    }
    setBusy(false);
  };

  if (dead) {
    return (
      <AuthShell>
        <div className="auth-sent">
          <span className="success-icon warn"><LinkIcon size={30} /></span>
          <div className="auth-title"><h2>This link no longer works</h2><p className="muted">Reset links are valid for 1 hour and can be used once. Request a new one and we will email it right away.</p></div>
          <Link to="/forgot-password"><Button className="w-full" size="lg">Get a new link</Button></Link>
          <p className="center small muted"><Link to="/login" className="link-btn">Back to sign in</Link></p>
        </div>
      </AuthShell>
    );
  }
  if (done) {
    return (
      <AuthShell>
        <div className="auth-sent">
          <span className="success-icon"><CheckCircle2 size={30} /></span>
          <div className="auth-title"><h2>Password updated</h2><p className="muted">You can now sign in with your new password. Taking you to the sign-in page…</p></div>
          <Link to="/login"><Button className="w-full" size="lg">Go to sign in</Button></Link>
        </div>
      </AuthShell>
    );
  }
  return (
    <AuthShell>
      <form onSubmit={submit} noValidate>
        <div className="auth-title"><h2>Choose a new password</h2><p className="muted">Use at least {MIN_PASSWORD} characters. You will be signed out everywhere else.</p></div>
        <div className="pw-wrap">
          <Input label="New password" type={show ? 'text' : 'password'} value={f.pw} onChange={(e) => { setF({ ...f, pw: e.target.value }); setErrs({ ...errs, pw: undefined }); }} error={errs.pw} autoComplete="new-password" autoFocus />
          <button type="button" className="pw-eye" onClick={() => setShow((s) => !s)} aria-label="Toggle password">{show ? <EyeOff size={17} /> : <Eye size={17} />}</button>
        </div>
        <Input label="Repeat new password" type={show ? 'text' : 'password'} value={f.again} onChange={(e) => { setF({ ...f, again: e.target.value }); setErrs({ ...errs, again: undefined }); }} error={errs.again} autoComplete="new-password" />
        <Button type="submit" loading={busy} className="w-full" size="lg">Update password</Button>
      </form>
    </AuthShell>
  );
}
