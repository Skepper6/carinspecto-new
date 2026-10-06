import { useState } from 'react';
import { Link } from 'react-router-dom';
import Car3D from '../../components/3d/Car3D';
import { CarLine, CHECKS, ConceptSwitch, FAQ, NAV, Reveal, STATS, STEPS, go, useFont, usePlans, usePortalLink, useScrolled } from './shared';
import { money } from '../../lib/format';
import './landing-b.css';

// Concept 8 · Mission control: void black, star field, uppercase industrial type, telemetry readouts around a 3D car.
export default function LandingSpacex() {
  useFont('https://fonts.googleapis.com/css2?family=Barlow:wght@300;400;500;700&display=swap');
  const plans = usePlans();
  const { book, dash, dashLabel } = usePortalLink();
  const scrolled = useScrolled(20);
  const [open, setOpen] = useState(0);
  return (
    <div className="lps">
      <div className="lps-stars" aria-hidden="true" />
      <header className={`lps-nav ${scrolled ? 'is-s' : ''}`}>
        <Link to="/home-8" className="lps-logo">CAR INSPECTO</Link>
        <nav>{NAV.map(([id, l]) => <button key={id} onClick={() => go(id)}>{l}</button>)}</nav>
        <div className="lps-right"><Link to={dash}>{dashLabel}</Link><Link to={book} className="lps-btn">Book</Link></div>
      </header>

      <section className="lps-hero">
        <div className="lps-copy">
          <span className="lps-tag">Mission control · Dubai</span>
          <h1>Inspection<br />is go.</h1>
          <p>Certified inspectors launch to your location. Every system is scanned, logged and reported before you leave the driveway.</p>
          <Link to={book} className="lps-btn">Book inspection</Link>
        </div>
        <div className="lps-viewport">
          <Car3D color="#f0f0fa" glass="#050505" rim="#545457" mode="spin" speed={0.25} fov={30} className="lps-car" fallback={<CarLine className="lps-fb" />} />
          <div className="lps-hud h1"><small>HEALTH</small><b>92</b></div>
          <div className="lps-hud h2"><small>DEFECTS</small><b>14</b></div>
          <div className="lps-hud h3"><small>CHECKPOINTS</small><b>150</b></div>
          <div className="lps-hud h4"><small>T-MINUS</small><b>02:14</b></div>
        </div>
      </section>

      <section className="lps-stats">
        {STATS.map(([n, l]) => <Reveal key={l}><b>{n}</b><span>{l}</span></Reveal>)}
      </section>

      <section id="how" className="lps-sec">
        <Reveal><span className="lps-tag">Sequence</span><h2>How it works</h2></Reveal>
        <div className="lps-steps">
          {STEPS.map(([n, t, d], i) => <Reveal key={n} delay={i * 70} className="lps-step"><small>{n}</small><h3>{t}</h3><p>{d}</p></Reveal>)}
        </div>
      </section>

      <section id="checks" className="lps-sec">
        <Reveal><span className="lps-tag">Systems</span><h2>What we check</h2></Reveal>
        <div className="lps-grid">
          {CHECKS.map(([t, d], i) => <Reveal key={t} delay={(i % 3) * 60} className="lps-cell"><small>SYS {String(i + 1).padStart(2, '0')}</small><h3>{t}</h3><p>{d}</p></Reveal>)}
        </div>
      </section>

      <section id="plans" className="lps-sec">
        <Reveal><span className="lps-tag">Missions</span><h2>Plans</h2></Reveal>
        <div className="lps-plans">
          {plans.map((p, i) => (
            <Reveal key={p.id} delay={i * 70} className={`lps-plan ${p.popular ? 'is-pop' : ''}`}>
              <h3>{p.name}</h3>
              <p className="lps-price">{money(p.price)}<span> + VAT</span></p>
              <p className="lps-meta">{p.checkpoints} CHECKPOINTS · {p.duration}</p>
              <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <Link to={book} className="lps-btn lps-btn-block">Launch {p.name}</Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="faq" className="lps-sec lps-faq">
        <Reveal><span className="lps-tag">Briefing</span><h2>Questions</h2></Reveal>
        {FAQ.map(([q, a], i) => (
          <div key={q} className={open === i ? 'open' : ''}>
            <button onClick={() => setOpen(open === i ? -1 : i)}><span>{q}</span><i /></button>
            <div className="lps-faq-a"><p>{a}</p></div>
          </div>
        ))}
      </section>

      <section className="lps-end">
        <Reveal><h2>Ready for launch.</h2><Link to={book} className="lps-btn">Book inspection</Link></Reveal>
      </section>
      <footer className="lps-foot"><span>© {new Date().getFullYear()} CAR INSPECTO</span><span>+971 4 123 4567</span></footer>
      <ConceptSwitch />
    </div>
  );
}
