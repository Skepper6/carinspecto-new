import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, Plus } from 'lucide-react';
import { CarLine, CHECKS, ConceptSwitch, FAQ, NAV, Reveal, STATS, STEPS, go, useFont, usePlans, usePortalLink, useScrolled } from './shared';
import { money } from '../../lib/format';

// Concept 1 – "Swiss blueprint with a single ember": bone canvas, huge tight type, hairline borders, one orange accent.
export default function Landing1() {
  useFont('https://fonts.googleapis.com/css2?family=Inter+Tight:wght@400;500&display=swap');
  const plans = usePlans();
  const { book, dash, dashLabel } = usePortalLink();
  const scrolled = useScrolled();
  const [open, setOpen] = useState(0);

  return (
    <div className="lp lp1">
      <header className={`lp1-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="lp-wrap lp1-nav-row">
          <Link to="/home-1" className="lp1-logo"><img src="/logo.png" alt="Car InspectO" /></Link>
          <nav>{NAV.map(([id, l]) => <button key={id} onClick={() => go(id)}>{l}</button>)}</nav>
          <div className="lp1-nav-cta">
            <Link to={dash} className="lp1-link">{dashLabel}</Link>
            <Link to={book} className="lp1-ember">Book inspection</Link>
          </div>
        </div>
      </header>

      <section className="lp1-hero">
        <div className="lp-wrap">
          <p className="lp1-kicker"><i /> Certified car inspections · Dubai & all emirates</p>
          <h1>Know the car<br />before you trust it.</h1>
          <p className="lp1-sub">A certified inspector comes to you, checks 150+ points and sends a photo-backed report in minutes.</p>
          <Link to={book} className="lp1-pill"><span className="lp1-pill-ic"><ArrowUpRight size={18} /></span>Book an inspection</Link>
        </div>
        <div className="lp1-stage" aria-hidden="true">
          <div className="lp1-grid" />
          <CarLine className="lp1-car" />
          <i className="lp1-scan" />
          <span className="lp1-tag t1"><b>01</b> Paint depth · 118 µm</span>
          <span className="lp1-tag t2"><b>02</b> OBD scan · 0 faults</span>
          <span className="lp1-tag t3"><b>03</b> Tyre tread · 6.4 mm</span>
          <span className="lp1-dim"><i />4 940 mm</span>
        </div>
      </section>

      <section className="lp1-stats lp-wrap">
        {STATS.map(([n, l]) => <Reveal key={l}><b>{n}</b><span>{l}</span></Reveal>)}
      </section>

      <section id="how" className="lp1-section lp-wrap">
        <Reveal className="lp1-head"><span className="lp1-eyebrow">How it works</span><h2>Four steps from booking to a decision you can trust.</h2></Reveal>
        <div className="lp1-steps">
          {STEPS.map(([n, t, d], i) => <Reveal key={n} delay={i * 70} className="lp1-step"><em>{n}</em><h3>{t}</h3><p>{d}</p></Reveal>)}
        </div>
      </section>

      <section id="checks" className="lp1-section lp-wrap">
        <Reveal className="lp1-head"><span className="lp1-eyebrow">What we check</span><h2>Every system, documented.</h2></Reveal>
        <div className="lp1-cards">
          {CHECKS.map(([t, d], i) => <Reveal key={t} delay={(i % 3) * 70} className="lp1-card"><span>{String(i + 1).padStart(2, '0')}</span><h3>{t}</h3><p>{d}</p></Reveal>)}
        </div>
      </section>

      <section id="plans" className="lp1-section lp-wrap">
        <Reveal className="lp1-head"><span className="lp1-eyebrow">Plans</span><h2>Transparent pricing. VAT shown before you pay.</h2></Reveal>
        <div className="lp1-plans">
          {plans.map((p, i) => (
            <Reveal key={p.id} delay={i * 70} className={`lp1-plan ${p.popular ? 'is-pop' : ''}`}>
              {p.popular && <em>Most chosen</em>}
              <h3>{p.name}</h3>
              <p className="lp1-price"><b>{money(p.price)}</b><span>+ VAT</span></p>
              <p className="lp1-meta">{p.checkpoints} checkpoints · {p.duration}</p>
              <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <Link to={book} className={p.popular ? 'lp1-ember block' : 'lp1-ghost block'}>Choose {p.name}</Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="faq" className="lp1-section lp-wrap lp1-faq-wrap">
        <Reveal className="lp1-head"><span className="lp1-eyebrow">FAQ</span><h2>Questions, answered.</h2></Reveal>
        <div className="lp1-faq">
          {FAQ.map(([q, a], i) => (
            <div key={q} className={open === i ? 'open' : ''}>
              <button onClick={() => setOpen(open === i ? -1 : i)}><span>{q}</span><Plus size={20} /></button>
              <div className="lp1-faq-a"><p>{a}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp1-cta lp-wrap">
        <Reveal><h2>Ready for a<br />worry-free car deal?</h2><Link to={book} className="lp1-ember big">Book your inspection</Link></Reveal>
      </section>

      <footer className="lp1-foot">
        <div className="lp-wrap lp1-foot-row">
          <img src="/logo.png" alt="Car InspectO" />
          <p>© {new Date().getFullYear()} Car InspectO · +971 4 123 4567 · hello@carinspecto.ae</p>
        </div>
      </footer>
      <ConceptSwitch />
    </div>
  );
}
