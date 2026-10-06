import { Link } from 'react-router-dom';
import Car3D from '../../components/3d/Car3D';
import { CarLine, CHECKS, ConceptSwitch, NAV, Reveal, STATS, STEPS, go, useFont, usePlans, usePortalLink, useScrolled } from './shared';
import { money } from '../../lib/format';
import './landing-b.css';

// Concept 6 · Expedition specimen: near-black field, slate product stage, zero radius, the car turns with the scroll.
export default function LandingAzak() {
  useFont('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&display=swap');
  const plans = usePlans();
  const { book, dash, dashLabel } = usePortalLink();
  const scrolled = useScrolled(20);
  return (
    <div className="lpa">
      <header className={`lpa-nav ${scrolled ? 'is-s' : ''}`}>
        <Link to="/home-6" className="lpa-logo">CAR INSPECTO</Link>
        <nav>{NAV.map(([id, l]) => <button key={id} onClick={() => go(id)}>{l}</button>)}</nav>
        <div className="lpa-right"><Link to={dash}>{dashLabel}</Link><Link to={book}>Book</Link></div>
      </header>

      <section className="lpa-hero">
        <div className="lpa-stage">
          <Car3D color="#f8f7f3" glass="#121211" rim="#85837e" mode="scroll" fov={40} className="lpa-car" fallback={<CarLine className="lpa-fb" />} />
          <span className="lpa-code">CI-150</span>
        </div>
        <div className="lpa-text">
          <span className="lpa-kick">Expedition-grade inspection</span>
          <h1>Inspected<br />in the field.</h1>
          <p>Certified inspectors. 150 checkpoints. A specimen-grade report with every finding photographed, measured and explained.</p>
          <Link to={book} className="lpa-link">Book an inspection →</Link>
          <div className="lpa-mini">
            {STATS.map(([n, l]) => <div key={l}><b>{n}</b><span>{l}</span></div>)}
          </div>
        </div>
      </section>

      <section id="how" className="lpa-light">
        <div className="lpa-wrap">
          <Reveal className="lpa-head"><span>01</span><h2>How it works</h2></Reveal>
          <div className="lpa-grid">
            {STEPS.map(([n, t, d], i) => <Reveal key={n} delay={i * 70} className="lpa-tile"><b>{n}</b><h3>{t}</h3><p>{d}</p></Reveal>)}
          </div>
        </div>
      </section>

      <section id="checks" className="lpa-dark">
        <div className="lpa-wrap">
          <Reveal className="lpa-head"><span>02</span><h2>What we check</h2></Reveal>
          <div className="lpa-list">
            {CHECKS.map(([t, d], i) => <Reveal key={t} delay={(i % 2) * 70} className="lpa-row"><em>{String(i + 1).padStart(2, '0')}</em><div><h3>{t}</h3><p>{d}</p></div></Reveal>)}
          </div>
        </div>
      </section>

      <section id="plans" className="lpa-light">
        <div className="lpa-wrap">
          <Reveal className="lpa-head"><span>03</span><h2>Plans</h2></Reveal>
          <div className="lpa-grid">
            {plans.map((p, i) => (
              <Reveal key={p.id} delay={i * 70} className={`lpa-tile lpa-plan ${p.popular ? 'is-pop' : ''}`}>
                <h3>{p.name}</h3>
                <p className="lpa-price">{money(p.price)}<span> + VAT</span></p>
                <p className="lpa-meta">{p.checkpoints} checkpoints · {p.duration}</p>
                <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
                <Link to={book} className="lpa-link">Choose {p.name} →</Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="lpa-dark lpa-end">
        <div className="lpa-wrap">
          <Reveal><h2>Know the specimen<br />before you buy it.</h2><Link to={book} className="lpa-link">Book an inspection →</Link></Reveal>
        </div>
      </section>
      <footer className="lpa-foot"><span>© {new Date().getFullYear()} Car InspectO</span><span>hello@carinspecto.ae · +971 4 123 4567</span></footer>
      <ConceptSwitch />
    </div>
  );
}
