import { useState } from 'react';
import { Link } from 'react-router-dom';
import Car3D from '../../components/3d/Car3D';
import { CarLine, CHECKS, ConceptSwitch, FAQ, NAV, Reveal, STATS, STEPS, go, useFont, usePlans, usePortalLink, useScrolled } from './shared';
import { money } from '../../lib/format';
import './landing-b.css';

// Concept 5 · Serene gallery: sage canvas, vivid teal accent, rounded white containers and a 3D car you can drag.
export default function LandingZoox() {
  useFont('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap');
  const plans = usePlans();
  const { book, dash, dashLabel } = usePortalLink();
  const scrolled = useScrolled(20);
  const [open, setOpen] = useState(0);
  return (
    <div className="lpz">
      <header className={`lpz-nav ${scrolled ? 'is-s' : ''}`}>
        <Link to="/home-5" className="lpz-logo"><img src="/logo.png" alt="Car InspectO" /></Link>
        <nav>{NAV.map(([id, l]) => <button key={id} onClick={() => go(id)}>{l}</button>)}</nav>
        <div className="lpz-right"><Link to={dash} className="lpz-link">{dashLabel}</Link><Link to={book} className="lpz-dark-pill">Book</Link></div>
      </header>

      <section className="lpz-hero">
        <div className="lpz-wrap lpz-hero-in">
          <h1>A calmer way to<br />buy a used car.</h1>
          <p>Certified inspectors visit you, check the whole car and hand back a report you can actually read.</p>
          <Link to={book} className="lpz-teal">Book an inspection</Link>
        </div>
        <div className="lpz-pod">
          <div className="lpz-ring" aria-hidden="true" />
          <Car3D color="#f7f9f8" glass="#34484a" rim="#9aa3a5" mode="drag" speed={0.3} className="lpz-car" fallback={<CarLine className="lpz-fb" />} />
          <span className="lpz-hint">Drag to turn</span>
        </div>
      </section>

      <section className="lpz-stats lpz-wrap">
        {STATS.map(([n, l]) => <Reveal key={l} className="lpz-stat"><b>{n}</b><span>{l}</span></Reveal>)}
      </section>

      <section id="how" className="lpz-wrap lpz-sec">
        <Reveal className="lpz-head"><h2>How it works</h2></Reveal>
        <div className="lpz-steps">
          {STEPS.map(([n, t, d], i) => <Reveal key={n} delay={i * 80} className="lpz-card"><span>{n}</span><h3>{t}</h3><p>{d}</p></Reveal>)}
        </div>
      </section>

      <section id="checks" className="lpz-wrap lpz-sec">
        <Reveal className="lpz-head"><h2>What we check</h2></Reveal>
        <div className="lpz-grid">
          {CHECKS.map(([t, d], i) => <Reveal key={t} delay={(i % 3) * 60} className="lpz-tile"><h3>{t}</h3><p>{d}</p></Reveal>)}
        </div>
      </section>

      <section id="plans" className="lpz-wrap lpz-sec">
        <Reveal className="lpz-head"><h2>Plans</h2></Reveal>
        <div className="lpz-plans">
          {plans.map((p, i) => (
            <Reveal key={p.id} delay={i * 80} className={`lpz-card lpz-plan ${p.popular ? 'is-pop' : ''}`}>
              <h3>{p.name}</h3>
              <p className="lpz-price">{money(p.price)}<span> + VAT</span></p>
              <p className="lpz-meta">{p.checkpoints} checkpoints · {p.duration}</p>
              <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <Link to={book} className={p.popular ? 'lpz-teal block' : 'lpz-dark-pill block'}>Choose {p.name}</Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="faq" className="lpz-wrap lpz-sec lpz-faq">
        <Reveal className="lpz-head"><h2>Questions</h2></Reveal>
        {FAQ.map(([q, a], i) => (
          <div key={q} className={`lpz-q ${open === i ? 'open' : ''}`}>
            <button onClick={() => setOpen(open === i ? -1 : i)}><span>{q}</span><i /></button>
            <div className="lpz-q-a"><p>{a}</p></div>
          </div>
        ))}
      </section>

      <section className="lpz-wrap lpz-sec">
        <Reveal className="lpz-end"><h2>Ready when you are.</h2><Link to={book} className="lpz-teal">Book an inspection</Link></Reveal>
      </section>
      <footer className="lpz-foot"><span>© {new Date().getFullYear()} Car InspectO</span><span>hello@carinspecto.ae</span></footer>
      <ConceptSwitch />
    </div>
  );
}
