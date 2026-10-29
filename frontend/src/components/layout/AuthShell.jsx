import { Link } from 'react-router-dom';
import { ShieldCheck, FileCheck2, Clock, ArrowLeft } from 'lucide-react';
import { Logo } from '../ui/kit';
import { SERVICE_AREA } from '../../lib/constants';

// The same two-column frame as the sign-in page, for the password and email pages.
export default function AuthShell({ children }) {
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
          <li><Clock size={20} /> {SERVICE_AREA} · 7 days a week</li>
        </ul>
        <i className="orb o1" /><i className="orb o2" />
      </aside>
      <section className="auth-panel">
        <div className="auth-card">{children}</div>
      </section>
    </div>
  );
}
