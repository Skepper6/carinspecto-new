import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight, CalendarCheck, MapPin, ClipboardCheck, FileText, ShieldCheck, Star, Check, Plus, UserRound, Wrench, Settings,
  Car, CircleDot, Cog, Settings2, Activity, Camera, BadgeCheck, Menu, X, Moon, Sun, Phone, Mail,
} from 'lucide-react';
import { Logo, Reveal, ScoreRing, useCountUp } from '../components/ui/kit';
import Button from '../components/ui/Button';
import { useDB } from '../lib/db';
import { useAuth } from '../context/AuthContext';
import { useUI } from '../context/UIContext';
import { PORTALS, COUNTRY, SERVICE_AREA, COMPANY, TAX_NAME } from '../lib/constants';
import { market } from '../lib/market';
import { money } from '../lib/format';
import PlanDetails from '../components/shared/PlanDetails';

const Counter = ({ to, suffix = '' }) => {
  const v = useCountUp(to, 1400);
  return <>{Math.round(v).toLocaleString('en-GB')}{suffix}</>;
};

const PORTAL_CARDS = [
  { role: 'customer', icon: UserRound, title: 'I want a car inspected', text: 'Book a certified inspector, track the visit and download your report.', cta: 'Book an inspection', tone: 'indigo' },
  { role: 'inspector', icon: Wrench, title: 'I am an inspector', text: 'Open your assignments, fill the digital checklist and upload photos.', cta: 'Open workspace', tone: 'orange' },
  { role: 'admin', icon: Settings, title: 'I manage operations', text: 'Orders, people, payments and analytics in one control centre.', cta: 'Admin sign in', tone: 'teal' },
];
const STEPS = [
  [CalendarCheck, 'Choose a plan & slot', 'Pick your car, an inspection plan and a time that suits you.'],
  [MapPin, 'We come to you', 'A certified inspector arrives at your chosen location.'],
  [ClipboardCheck, 'Detailed inspection', 'Up to 150+ checkpoints with photos and an OBD diagnostic scan.'],
  [FileText, 'Instant report', 'A branded PDF report lands in your dashboard within minutes.'],
];
const CATS = [
  [Car, 'Vehicle summary', 'Body, paint, documents & history'],
  [CircleDot, 'Tyres & brakes', 'Tread, rims, brakes & suspension'],
  [Cog, 'Engine', 'Fluids, leaks, belts, battery & noise'],
  [Settings2, 'Transmission', 'Clutch, gearbox & drivetrain'],
  [Activity, 'Diagnostics', 'Pre/post OBD scan & road test'],
  [Camera, 'Photo evidence', 'Auto-labelled interior, engine, tyres…'],
];
const REVIEWS = market.reviews;

export default function Home() {
  const plans = useDB((s) => s.plans);
  const faqs = useDB((s) => s.content.faqs);
  const { user } = useAuth();
  const { theme, setTheme } = useUI();
  const [menu, setMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, []);

  // the phone menu covers the page: lock the page behind it; it closes with the X, a link, or Escape
  useEffect(() => {
    if (!menu) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && setMenu(false);
    const onSize = () => window.innerWidth > 900 && setMenu(false);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onSize);
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey); window.removeEventListener('resize', onSize); };
  }, [menu]);

  const links = [['how','How it works'], ['checks', 'What we check'], ['plans', 'Plans'], ['faq', 'FAQ']];
  const nav = useNavigate();
  const scrollTo = (id) => { setMenu(false); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  return (
    <div className="home">
      <header className={`home-nav ${scrolled ? 'scrolled' : ''} ${menu ? 'menu-open' : ''}`}>
        <div className="wrap row">
          <Link to="/" className="logo-chip"><Logo height={58} /></Link>
          <nav className={menu ? 'open' : ''}>
            {links.map(([id, l]) => <button key={id} onClick={() => scrollTo(id)}>{l}</button>)}
            {!user && <Link to="/login" className="nav-signin" onClick={() => setMenu(false)}>Sign in</Link>}
          </nav>
          <div className="nav-actions">
            <button className="icon-btn" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label="Toggle theme">{theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}</button>
            {user ? (
              <Link to={PORTALS[user.role].home}><Button size="sm">My dashboard</Button></Link>
            ) : (
              <>
                <Link to="/login" className="hide-sm"><Button variant="ghost" size="sm">Sign in</Button></Link>
                <Link to="/signup"><Button size="sm">Get started</Button></Link>
              </>
            )}
            <button className="icon-btn menu-toggle" onClick={() => setMenu((m) => !m)} aria-label="Menu">{menu ? <X size={20} /> : <Menu size={20} />}</button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="hero">
        <i className="orb o1" /><i className="orb o2" />
        <div className="wrap hero-grid">
          <div className="hero-copy">
            <span className="eyebrow"><BadgeCheck size={16} /> Certified car inspections across {COUNTRY}</span>
            <h1>Know your car's <span className="grad">true condition</span> – anywhere in {COUNTRY}.</h1>
            <p>Book a certified Car InspectO inspector, get a full multi-point check at your home, office or parking spot in {SERVICE_AREA}, then receive a photo-backed report in minutes.</p>
            <div className="hero-cta">
              <Link to={user?.role === 'customer' ? '/app/book' : '/signup'}><Button size="lg" icon={CalendarCheck}>Book an inspection</Button></Link>
              <button className="btn btn-ghost btn-lg" onClick={() => scrollTo('portals')}><span>Choose your portal</span><ArrowRight size={16} /></button>
            </div>
            <ul className="hero-trust">
              <li><ShieldCheck size={16} /> Verified inspectors</li>
              <li><Star size={16} /> 4.8 average rating</li>
              <li><FileText size={16} /> Report in minutes</li>
            </ul>
          </div>
          <div className="hero-visual">
            <div className="report-card float">
              <header><span>Inspection report</span><em>CI-1002</em></header>
              <div className="rc-body">
                <ScoreRing score={92} size={104} />
                <div>
                  <b>2022 Hyundai Creta</b>
                  <span className="muted small">Petrol · {market.examples.plate}</span>
                  <div className="rc-tags"><i className="t g">Engine ✓</i><i className="t g">Brakes ✓</i><i className="t a">Tyres 4mm</i></div>
                </div>
              </div>
              <ul className="rc-rows">
                <li><span>Accident history</span><b className="ok">Clear</b></li>
                <li><span>Service history</span><b className="ok">Full</b></li>
                <li><span>OBD diagnostics</span><b className="ok">No faults</b></li>
              </ul>
            </div>
            <div className="chip-float c1"><Check size={16} /> Inspector assigned</div>
            <div className="chip-float c2"><FileText size={16} /> PDF ready</div>
          </div>
        </div>
      </section>

      {/* STATS */}
      <section className="wrap stats-strip">
        {[[12480, '+', 'Inspections done'], [150, '+', 'Checkpoints per car'], [8, '', 'Service areas'], [98, '%', 'Customer satisfaction']].map(([n, s, l]) => (
          <Reveal key={l} className="strip-item"><b><Counter to={n} suffix={s} /></b><span>{l}</span></Reveal>
        ))}
      </section>

      {/* PORTALS */}
      <section id="portals" className="section">
        <div className="wrap">
          <Reveal className="section-head"><span className="eyebrow">Get started</span><h2>Who are you today?</h2><p className="muted">Pick your portal – each one is built around exactly what you need to get done.</p></Reveal>
          <div className="grid-3">
            {PORTAL_CARDS.map((c, i) => (
              <Reveal key={c.role} delay={i * 80}>
                <Link to={user?.role === c.role ? PORTALS[c.role].home : `/login?role=${c.role}`} className={`portal-card pc-${c.tone}`}>
                  <span className="pc-icon"><c.icon size={26} /></span>
                  <h3>{c.title}</h3>
                  <p>{c.text}</p>
                  <span className="pc-cta">{c.cta} <ArrowRight size={16} /></span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* HOW */}
      <section id="how" className="section alt">
        <div className="wrap">
          <Reveal className="section-head"><span className="eyebrow">How it works</span><h2>From booking to report in four steps</h2></Reveal>
          <div className="grid-4">
            {STEPS.map(([Icon, t, d], i) => (
              <Reveal key={t} delay={i * 80} className="step">
                <span className="step-num">{i + 1}</span>
                <span className="step-icon"><Icon size={24} /></span>
                <h4>{t}</h4><p className="muted">{d}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* CHECKS */}
      <section id="checks" className="section">
        <div className="wrap">
          <Reveal className="section-head"><span className="eyebrow">What we check</span><h2>Every system, documented</h2><p className="muted">Our structured digital checklist leaves nothing to memory.</p></Reveal>
          <div className="grid-3">
            {CATS.map(([Icon, t, d], i) => (
              <Reveal key={t} delay={(i % 3) * 70} className="cat">
                <span><Icon size={22} /></span>
                <div><h4>{t}</h4><p className="muted">{d}</p></div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section id="plans" className="section alt">
        <div className="wrap">
          <Reveal className="section-head"><span className="eyebrow">Plans & pricing</span><h2>Simple, transparent pricing</h2><p className="muted">{TAX_NAME} and the small booking fee are shown before you pay – no surprises.</p></Reveal>
          <div className="grid-3 plans">
            {plans.map((p, i) => (
              <Reveal key={p.id} delay={i * 80} className={`plan ${p.popular ? 'popular' : ''}`}>
                {p.popular && <span className="plan-flag">Most popular</span>}
                <h3 style={{ color: p.color }}>{p.name}</h3>
                <p className="muted">{p.tagline}</p>
                <div className="plan-price"><b>{money(p.price)}</b><span>+ {TAX_NAME}</span></div>
                <p className="plan-meta">{p.checkpoints} checkpoints · {p.duration}</p>
                <PlanDetails plan={p} chooseLabel={`Choose ${p.name}`} onChoose={() => nav(user?.role === 'customer' ? `/app/book?plan=${p.id}` : '/signup')} />
                <Link to={user?.role === 'customer' ? `/app/book?plan=${p.id}` : '/signup'}><Button variant={p.popular ? 'primary' : 'outline'} className="w-full">Choose {p.name}</Button></Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* REVIEWS */}
      <section className="section">
        <div className="wrap">
          <Reveal className="section-head"><span className="eyebrow">Loved by drivers</span><h2>Real people, real savings</h2></Reveal>
          <div className="grid-3">
            {REVIEWS.map(([n, c, t], i) => (
              <Reveal key={n} delay={i * 80} className="review">
                <div className="review-stars">{[...Array(5)].map((_, k) => <Star key={k} size={16} fill="currentColor" />)}</div>
                <p>“{t}”</p>
                <footer><b>{n}</b><span className="muted small">{c}</span></footer>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="section alt">
        <div className="wrap narrow">
          <Reveal className="section-head"><span className="eyebrow">FAQ</span><h2>Questions, answered</h2></Reveal>
          <Reveal className="faq">
            {faqs.map((f, i) => (
              <div key={f.id} className={`faq-item ${openFaq === i ? 'open' : ''}`}>
                <button onClick={() => setOpenFaq(openFaq === i ? -1 : i)}><span>{f.q}</span><Plus size={18} /></button>
                <div className="faq-a"><p>{f.a}</p></div>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* CTA */}
      <section className="wrap">
        <Reveal className="cta-band">
          <div><h2>Ready for a worry-free car deal?</h2><p>Book your inspection in under two minutes.</p></div>
          <Link to={user?.role === 'customer' ? '/app/book' : '/signup'}><Button variant="accent" size="lg" icon={CalendarCheck}>Book now</Button></Link>
        </Reveal>
      </section>

      <footer className="home-foot">
        <div className="wrap foot-grid">
          <div><span className="logo-chip"><Logo height={52} /></span><p>Certified digital vehicle inspections across {COUNTRY}.</p></div>
          <div><h5>Portals</h5>{Object.entries(PORTALS).map(([r, p]) => <Link key={r} to={`/login?role=${r}`}>{p.label}</Link>)}</div>
          <div><h5>Company</h5><button onClick={() => scrollTo('how')}>How it works</button><button onClick={() => scrollTo('plans')}>Plans</button><button onClick={() => scrollTo('faq')}>FAQ</button><Link to="/terms">Terms</Link><Link to="/privacy">Privacy</Link></div>
          <div><h5>Contact</h5><span><Phone size={14} /> {COMPANY.phone}</span><span><Mail size={14} /> {COMPANY.email}</span></div>
        </div>
        <div className="wrap foot-base">© {new Date().getFullYear()} Car InspectO. All rights reserved.</div>
      </footer>
    </div>
  );
}
