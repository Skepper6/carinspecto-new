import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck } from 'lucide-react';
import AuthShell from '../components/layout/AuthShell';
import { Input } from '../components/ui/kit';
import Button from '../components/ui/Button';
import { useUI } from '../context/UIContext';
import { forgotPassword } from '../services/auth';

export default function ForgotPassword() {
  const { toast } = useUI();
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (ev) => {
    ev.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setErr('Enter a valid email address');
    setBusy(true);
    try { await forgotPassword(email.trim()); setSent(true); }
    catch (e) { toast.error(e.message || 'Could not send the email. Please try again.'); }
    setBusy(false);
  };

  return (
    <AuthShell>
      {sent ? (
        <div className="auth-sent">
          <span className="success-icon"><MailCheck size={30} /></span>
          <div className="auth-title"><h2>Check your email</h2>
            <p className="muted">If there is an account for <b>{email.trim()}</b>, we have sent a link to choose a new password. It is valid for 1 hour.</p></div>
          <p className="small muted center">No email? Look in your spam folder, or <button type="button" className="link-btn" onClick={() => setSent(false)}>try again</button>.</p>
          <Link to="/login"><Button variant="outline" className="w-full">Back to sign in</Button></Link>
        </div>
      ) : (
        <form onSubmit={submit} noValidate>
          <div className="auth-title"><h2>Forgot your password?</h2><p className="muted">Enter your email and we will send you a link to choose a new one.</p></div>
          <Input label="Email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); setErr(''); }} error={err} placeholder="you@example.com" autoComplete="email" autoFocus />
          <Button type="submit" loading={busy} className="w-full" size="lg">Send reset link</Button>
          <p className="center small muted"><Link to="/login" className="link-btn">Back to sign in</Link></p>
        </form>
      )}
    </AuthShell>
  );
}
