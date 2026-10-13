import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams, Navigate } from 'react-router-dom';
import { ShieldCheck, FileCheck2, Clock, Eye, EyeOff, Sparkles, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { Logo, Input, Tabs, PhoneInput } from '../components/ui/kit';
import { isValidPhone } from '../lib/format';
import Button from '../components/ui/Button';
import { PORTALS } from '../lib/constants';
import { googleEnabled } from '../services/auth';

// One-click test logins.
//  - on your own computer (npm run dev) they use the seeded demo accounts
//  - on the live site they only exist when VITE_SHOW_DEMO_LOGINS=true, and the accounts come from VITE_DEMO_* settings, so no
//    password is written into the website code unless you switch this on. Remove the settings (and redeploy) to hide it.
const DEMO = import.meta.env.DEV   // written as import.meta.env.DEV (not via a variable) so the build removes this branch from the live site
  ? {
    customer: { email: 'omar@example.com', pw: 'demo123' },
    inspector: { email: 'khalid@carinspecto.com', pw: 'demo123' },
    admin: { email: 'admin@carinspecto.com', pw: 'admin123' },
  }
  : import.meta.env.VITE_SHOW_DEMO_LOGINS === 'true'
    ? {
      customer: { email: import.meta.env.VITE_DEMO_CUSTOMER_EMAIL, pw: import.meta.env.VITE_DEMO_CUSTOMER_PW },
      inspector: { email: import.meta.env.VITE_DEMO_INSPECTOR_EMAIL, pw: import.meta.env.VITE_DEMO_INSPECTOR_PW },
      admin: { email: import.meta.env.VITE_DEMO_ADMIN_EMAIL, pw: import.meta.env.VITE_DEMO_ADMIN_PW },
    }
    : null;
const COPY = {
  customer: ['Welcome back', 'Book inspections, track them live and download reports.'],
  inspector: ['Inspector workspace', 'Open your assigned inspections and file digital reports.'],
  admin: ['Admin control centre', 'Run operations, people, payments and analytics.'],
};

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" /><path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.7c-.6 3-2.3 5.5-4.8 7.2l7.5 5.8c4.4-4.1 7.1-10.1 7.1-17.5z" /><path fill="#FBBC05" d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z" /><path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.5-5.8c-2.1 1.4-4.9 2.3-8.4 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z" /></svg>
);

export default function Login({ signup: signupMode = false }) {
  const [params] = useSearchParams();
  const [role, setRole] = useState(params.get('role') in PORTALS ? params.get('role') : 'customer');
  const [mode, setMode] = useState(signupMode ? 'signup' : 'login');
  const [f, setF] = useState({ name: '', email: '', phone: '', pw: '' });
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const { user, login, signup, google } = useAuth();
  const { toast } = useUI();
  const nav = useNavigate();
  const loc = useLocation();

  // already signed in (or just signed in): go where the user was heading, otherwise to their portal
  if (user) return <Navigate to={loc.state?.from?.startsWith(PORTALS[user.role].home) ? loc.state.from : PORTALS[user.role].home} replace />;

  const set = (k) => (e) => { setF({ ...f, [k]: e.target.value }); setErrors({ ...errors, [k]: undefined }); };
  const isSignup = mode === 'signup' && role === 'customer';

  const validate = () => {
    const e = {};
    if (isSignup && f.name.trim().length < 2) e.name = 'Please enter your full name';
    if (!/^\S+@\S+\.\S+$/.test(f.email)) e.email = 'Enter a valid email address';
    if (isSignup ? f.pw.length < 8 : f.pw.length < 1) e.pw = isSignup ? 'Password must be at least 8 characters' : 'Enter your password';
    if (isSignup && !accepted) e.terms = 'Please accept the Terms and Privacy Policy';
    if (isSignup && f.phone && !isValidPhone(f.phone)) e.phone = 'Enter a valid UAE number, e.g. +971 50 123 4567';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const go = (to) => nav(loc.state?.from && loc.state.from.startsWith(PORTALS[role].home) ? loc.state.from : to, { replace: true });

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setBusy(true);
    try {
      if (isSignup) {
        await signup({ name: f.name.trim(), email: f.email.trim(), password: f.pw, phone: f.phone, acceptTerms: true });
        toast.success('Your account is ready. Let\'s book your first inspection!', 'Welcome to Car InspectO');
      } else {
        await login(f.email.trim(), f.pw, role);
        toast.success('Signed in successfully.');
      }
      go(PORTALS[role].home);
    } catch (err) {
      toast.error(err.message || 'Something went wrong', isSignup ? 'Sign up failed' : 'Sign in failed');
    } finally { setBusy(false); }
  };

  const googleSignIn = async () => {
    setBusy(true);
    try { await google(); toast.success('Signed in with Google.'); go('/app'); }
    catch (err) { toast.error(err.message || 'Google sign-in failed'); }
    finally { setBusy(false); }
  };

  // click = fill the test account and sign straight in
  const demoLogin = async () => {
    const d = DEMO?.[role];
    if (!d?.email || !d?.pw) return;
    setF((x) => ({ ...x, ...d })); setErrors({}); setBusy(true);
    try { await login(d.email, d.pw, role); toast.success('Signed in with the test account.'); go(PORTALS[role].home); }
    catch (err) { toast.error(err.message || 'Could not sign in with the test account', 'Sign in failed'); }
    finally { setBusy(false); }
  };
  const [title, sub] = isSignup ? ['Create your account', "Know your car's true condition with a certified inspector."] : COPY[role];

  return (
    <div className="auth-page">
      <aside className="auth-hero">
        <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to website</Link>
        <div className="logo-chip big"><Logo height={50} /></div>
        <h1>Inspect smarter.<br />Drive with confidence.</h1>
        <p>Certified inspectors, a multi-point checklist and a branded report – delivered to your dashboard in minutes.</p>
        <ul>
          <li><ShieldCheck size={20} /> Verified, background-checked inspectors</li>
          <li><FileCheck2 size={20} /> Photo-backed PDF reports</li>
          <li><Clock size={20} /> Dubai & all emirates · 7 days a week</li>
        </ul>
        <i className="orb o1" /><i className="orb o2" />
      </aside>

      <section className="auth-panel">
        <form className="auth-card" onSubmit={submit} noValidate>
          <Tabs tabs={Object.entries(PORTALS).map(([value, p]) => ({ value, label: p.label }))} value={role}
            onChange={(r) => { setRole(r); setErrors({}); if (r !== 'customer') setMode('login'); }} />
          <div className="auth-title" key={title}>
            <h2>{title}</h2>
            <p className="muted">{sub}</p>
          </div>

          {role === 'customer' && googleEnabled && (
            <>
              <Button type="button" variant="outline" className="w-full" onClick={googleSignIn} disabled={busy}><GoogleIcon /> Continue with Google</Button>
              <div className="divider"><span>or use email</span></div>
            </>
          )}

          {isSignup && <Input label="Full name" value={f.name} onChange={set('name')} error={errors.name} placeholder="Aarav Sharma" autoComplete="name" />}
          <Input label="Email" type="email" value={f.email} onChange={set('email')} error={errors.email} placeholder="you@example.com" autoComplete="email" />
          {isSignup && <PhoneInput label="Phone (optional)" value={f.phone} onChange={(v) => { setF({ ...f, phone: v }); setErrors({ ...errors, phone: undefined }); }} error={errors.phone} />}
          <Input label="Password" type={showPw ? 'text' : 'password'} value={f.pw} onChange={set('pw')} error={errors.pw} placeholder="••••••••" autoComplete={isSignup ? 'new-password' : 'current-password'}
            end={<button type="button" className="input-end" onClick={() => setShowPw((s) => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}>{showPw ? <EyeOff size={18} /> : <Eye size={18} />}</button>} />

          {!isSignup && <div className="forgot-row"><Link to="/forgot-password" className="link-btn">Forgot password?</Link></div>}
          {isSignup && (
            <div>
              <label className="check consent"><input type="checkbox" checked={accepted} onChange={(e) => { setAccepted(e.target.checked); setErrors({ ...errors, terms: undefined }); }} /><span>I agree to the <Link to="/terms" target="_blank">Terms &amp; Conditions</Link> and <Link to="/privacy" target="_blank">Privacy Policy</Link></span></label>
              {errors.terms && <p className="field-error">{errors.terms}</p>}
            </div>
          )}

          <Button type="submit" loading={busy} className="w-full" size="lg">{isSignup ? 'Create account' : 'Sign in'}</Button>

          {role === 'customer' && (
            <p className="center small muted">
              {isSignup ? 'Already have an account? ' : 'New to Car InspectO? '}
              <button type="button" className="link-btn" onClick={() => setMode(isSignup ? 'login' : 'signup')}>{isSignup ? 'Sign in' : 'Create an account'}</button>
            </p>
          )}

          {DEMO?.[role]?.email && !isSignup && (
            <button type="button" className="demo-box" onClick={demoLogin} disabled={busy}>
              <Sparkles size={16} />
              <span><b>Test login</b> – click to sign in as the {PORTALS[role].label.toLowerCase()} test account<br /><em>{DEMO[role].email}</em></span>
            </button>
          )}
        </form>
      </section>
    </div>
  );
}
