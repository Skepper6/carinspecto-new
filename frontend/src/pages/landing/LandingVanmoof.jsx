import { useState } from 'react';
import { Link } from 'react-router-dom';
import Car3D from '../../components/3d/Car3D';
import { CarLine, CHECKS, ConceptSwitch, FAQ, NAV, Reveal, STATS, STEPS, go, useFont, usePlans, usePortalLink } from './shared';
import { money } from '../../lib/format';
import './landing-b.css';

// Concept 7 · Monochrome showroom: a black car in a spotlight, huge product name on the left, drag to turn the car.
export default function LandingVanmoof() {
  useFont('https://fonts.googleapis.com/css2?family=Archivo:wght@400;600;700;800&display=swap');
  const plans = usePlans();
  const { book, dash, dashLabel } = usePortalLink();
  const [open, setOpen] = useState(0);
  return (
    <div className="lpv">
      <header className="lpv-bar">
        <button className="lpv-menu" aria-label="Menu" onClick={() => go('how')}><i /><i /><i /></button>
        <Link to="/home-7" className="lpv-mark">Car InspectO</Link>
        <Link to={book} className="lpv-bag">Book</Link>
      </header>

      <section className="lpv-hero">
        <div className="lpv-spot" aria-hidden="true" />
        <h1 className="lpv-name" aria-hidden="true">INSPECT</h1>
        <div className="lpv-car">
          <Car3D color="#101010" glass="#1b1b1b" rim="#8a8a8a" mode="drag" fov={26} className="lpv-3d" fallback={<CarLine className="lpv-fb" />} />
          <span className="lpv-drag">Drag to rotate</span>
        </div>
        <div className="lpv-copy">
          <p>Certified inspection, at your door. 150 checkpoints. A report that explains every finding.</p>
          <Link to={book} className="lpv-ghost">Book an inspection <span>→</span></Link>
        </div>
      </section>

      <section className="lpv-stats">
        {STATS.map(([n, l]) => <Reveal key={l}><b>{n}</b><span>{l}</span></Reveal>)}
      </section>

      <section id="how" className="lpv-sec">
        <Reveal><h2>How it works</h2></Reveal>
        <div className="lpv-steps">
          {STEPS.map(([n, t, d], i) => <Reveal key={n} delay={i * 70}><b>{n}</b><h3>{t}</h3><p>{d}</p></Reveal>)}
        </div>
      </section>

      <section id="checks" className="lpv-sec lpv-alt">
        <Reveal><h2>What we check</h2></Reveal>
        <div className="lpv-checks">
          {CHECKS.map(([t, d], i) => <Reveal key={t} delay={(i % 3) * 60}><b>{String(i + 1).padStart(2, '0')}</b><h3>{t}</h3><p>{d}</p></Reveal>)}
        </div>
      </section>

      <section id="plans" className="lpv-sec">
        <Reveal><h2>Plans</h2></Reveal>
        <div className="lpv-plans">
          {plans.map((p, i) => (
            <Reveal key={p.id} delay={i * 70} className={`lpv-plan ${p.popular ? 'is-pop' : ''}`}>
              <h3>{p.name}</h3>
              <p className="lpv-price">{money(p.price)}<span> + VAT</span></p>
              <p className="lpv-meta">{p.checkpoints} checkpoints · {p.duration}</p>
              <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <Link to={book} className="lpv-ghost">Choose {p.name}</Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="faq" className="lpv-sec lpv-alt">
        <Reveal><h2>Questions</h2></Reveal>
        <div className="lpv-faq">
          {FAQ.map(([q, a], i) => (
            <div key={q} className={open === i ? 'open' : ''}>
              <button onClick={() => setOpen(open === i ? -1 : i)}><span>{q}</span><i /></button>
              <div className="lpv-faq-a"><p>{a}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="lpv-end">
        <Reveal><h2>Ride<br />sure.</h2><Link to={book} className="lpv-ghost">Book an inspection</Link></Reveal>
      </section>
      <footer className="lpv-foot"><span>© {new Date().getFullYear()} Car InspectO</span><span>+971 4 123 4567</span><span>{dashLabel}</span></footer>
      <ConceptSwitch />
    </div>
  );
}
