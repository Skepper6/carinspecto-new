import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useDB } from '../lib/db';
import { Logo } from '../components/ui/kit';

const PAGES = {
  terms: { title: 'Terms & Conditions', field: 'terms' },
  privacy: { title: 'Privacy Policy', field: 'privacy' },
};

// Public Terms / Privacy pages. The text is edited by the admin (Content & plans) and read from the API.
export default function Legal({ kind }) {
  const page = PAGES[kind];
  const text = useDB((s) => s.content[page.field]);
  const other = kind === 'terms' ? ['/privacy', 'Privacy Policy'] : ['/terms', 'Terms & Conditions'];
  return (
    <div className="legal">
      <header className="legal-bar">
        <Link to="/" className="logo-chip"><Logo height={50} /></Link>
        <Link to="/" className="back-link"><ArrowLeft size={16} /> Back to website</Link>
      </header>
      <main className="legal-body">
        <h1>{page.title}</h1>
        {text?.trim()
          ? text.trim().split(/\n{2,}/).map((para, i) => <p key={i}>{para}</p>)
          : <p className="muted">This page has not been published yet.</p>}
        <p className="legal-foot muted small">Questions? Contact us at hello@carinspecto.ae · <Link to={other[0]}>{other[1]}</Link></p>
      </main>
    </div>
  );
}
