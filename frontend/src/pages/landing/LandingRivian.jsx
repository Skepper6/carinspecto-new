import { useState } from 'react';
import { Link } from 'react-router-dom';
import Car3D from '../../components/3d/Car3D';
import { CarLine, CHECKS, ConceptSwitch, FAQ, NAV, Reveal, STATS, STEPS, go, useFont, usePlans, usePortalLink, useScrolled } from './shared';
import { money } from '../../lib/format';
import './landing-b.css';

// Concept 4 · Electric monolith on a concrete gallery wall: chalk concrete, one solar-yellow CTA, a rotating 3D car.
export default function LandingRivian() {
  useFont('https://fonts.googleapis.com/css2?family=Archivo:wght@300;400;500;600;800&display=swap');
  const plans = usePlans();
  const { book, dash, dashLabel } = usePortalLink();
  const scrolled = useScrolled(20);
  const [open, setOpen] = useState(0);
  return (
    <div className="lpr">
      <header className={`lpr-nav ${scrolled ? 'is-s' : ''}`}>
        <Link to="/home-4" className="lpr-logo"><img src="/logo.png" alt="Car InspectO" /></Link>
        <nav>{NAV.map(([id, l]) => <button key={id} onClick={() => go(id)}>{l}</button>)}</nav>
        <div className="lpr-right"><Link to={dash}>{dashLabel}</Link><Link to={book} className="lpr-cta">Book inspection</Link></div>
      </header>

      <section className="lpr-hero">
        <div className="lpr-copy">
          <span className="lpr-eyebrow">Certified inspection · Dubai &amp; every emirate</span>
          <h1>Every panel.<br />Every system.</h1>
          <p>A certified inspector comes to your car, runs 150+ checkpoints and an OBD scan, and sends a photo report in minutes.</p>
          <div className="lpr-row">
            <Link to={book} className="lpr-cta lg">Book inspection</Link>
            <button className="lpr-ghost" onClick={() => go('how')}>How it works</button>
          </div>
        </div>
        <div className="lpr-stage">
          <Car3D color="#ffac00" glass="#0b0b0b" rim="#c9ccd0" mode="spin" speed={0.4} className="lpr-car" fallback={<CarLine className="lpr-fb" />} />
          <div className="lpr-floor" />
        </div>
        <div className="lpr-stats">
          {STATS.map(([n, l]) => <div key={l}><b>{n}</b><span>{l}</span></div>)}
        </div>
      </section>

      <section id="how" className="lpr-dark">
        <div className="lpr-wrap">
          <Reveal><span className="lpr-kick">How it works</span><h2>Four steps.<br />One clear answer.</h2></Reveal>
          <div className="lpr-steps">
            {STEPS.map(([n, t, d], i) => <Reveal key={n} delay={i * 80} className="lpr-step"><em>{n}</em><h3>{t}</h3><p>{d}</p></Reveal>)}
          </div>
        </div>
      </section>

      <section id="checks" className="lpr-light">
        <div className="lpr-wrap">
          <Reveal><span className="lpr-kick">What we check</span><h2>Documented to the bolt.</h2></Reveal>
          <div className="lpr-cards">
            {CHECKS.map(([t, d], i) => <Reveal key={t} delay={(i % 3) * 70} className="lpr-card"><span>{String(i + 1).padStart(2, '0')}</span><h3>{t}</h3><p>{d}</p></Reveal>)}
          </div>
        </div>
      </section>

      <section id="plans" className="lpr-light">
        <div className="lpr-wrap">
          <Reveal><span className="lpr-kick">Plans</span><h2>Pick your depth.</h2></Reveal>
          <div className="lpr-plans">
            {plans.map((p, i) => (
              <Reveal key={p.id} delay={i * 80} className={`lpr-plan ${p.popular ? 'is-pop' : ''}`}>
                {p.popular && <em>Most chosen</em>}
                <h3>{p.name}</h3>
                <p className="lpr-price">{money(p.price)}<span> + VAT</span></p>
                <p className="lpr-meta">{p.checkpoints} checkpoints · {p.duration}</p>
                <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
                <Link to={book} className={p.popular ? 'lpr-cta block' : 'lpr-ghost block'}>Choose {p.name}</Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="faq" className="lpr-light">
        <div className="lpr-wrap lpr-faq">
          <Reveal><span className="lpr-kick">FAQ</span><h2>Questions.</h2></Reveal>
          {FAQ.map(([q, a], i) => (
            <div key={q} className={`lpr-q ${open === i ? 'open' : ''}`}>
              <button onClick={() => setOpen(open === i ? -1 : i)}><span>{q}</span><i /></button>
              <div className="lpr-q-a"><p>{a}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="lpr-end">
        <div className="lpr-wrap">
          <Reveal><h2>Know it before<br />you own it.</h2><Link to={book} className="lpr-cta lg">Book inspection</Link></Reveal>
        </div>
      </section>
      <footer className="lpr-foot"><span>© {new Date().getFullYear()} Car InspectO</span><span>+971 4 123 4567 · hello@carinspecto.ae</span></footer>
      <ConceptSwitch />
    </div>
  );
}
