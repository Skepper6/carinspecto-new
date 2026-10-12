import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { BadgeCheck, LinkIcon } from 'lucide-react';
import AuthShell from '../components/layout/AuthShell';
import Button from '../components/ui/Button';
import { useAuth } from '../context/AuthContext';
import { PORTALS } from '../lib/constants';
import { verifyEmail } from '../services/auth';

// Opened from the link in the confirmation email: confirms the address as soon as the page loads.
export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { user } = useAuth();
  const [state, setState] = useState(token ? 'working' : 'failed');   // working | done | failed
  const [message, setMessage] = useState('');
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true;
    verifyEmail(token).then(() => setState('done')).catch((e) => { setMessage(e.message); setState('failed'); });
  }, [token]);

  return (
    <AuthShell>
      <div className="auth-sent">
        {state === 'working' && <><i className="spinner" /><div className="auth-title"><h2>Confirming your email…</h2></div></>}
        {state === 'done' && (
          <>
            <span className="success-icon"><BadgeCheck size={30} /></span>
            <div className="auth-title"><h2>Email confirmed</h2><p className="muted">Thank you – your email address is verified.</p></div>
            <Link to={user ? PORTALS[user.role].home : '/login'}><Button className="w-full" size="lg">{user ? 'Go to my dashboard' : 'Sign in'}</Button></Link>
          </>
        )}
        {state === 'failed' && (
          <>
            <span className="success-icon warn"><LinkIcon size={30} /></span>
            <div className="auth-title"><h2>This link no longer works</h2><p className="muted">{message || 'The confirmation link is missing or has expired.'} Sign in and use “Resend verification email” on your profile.</p></div>
            <Link to={user ? PORTALS[user.role].home : '/login'}><Button className="w-full" size="lg">{user ? 'Go to my dashboard' : 'Sign in'}</Button></Link>
          </>
        )}
      </div>
    </AuthShell>
  );
}
