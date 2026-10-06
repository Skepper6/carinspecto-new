import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CarLine, CHECKS, ConceptSwitch, FAQ, NAV, Reveal, STATS, STEPS, go, useFont, usePlans, usePortalLink } from './shared';
import { money } from '../../lib/format';

// Concept 2 – "Retro road-trip poster on warm paper": cream, one electric blue, whisper-thin serif, outlined pills.
export default function Landing2() {
  useFont('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,100;9..144,200;9..144,300&family=Hanken+Grotesk:wght@300;400&display=swap');
  const plans = usePlans();
  const { book, dash, dashLabel } = usePortalLink();
  const [open, setOpen] = useState(0);

  return (
    <div className="lp lp2">
      <header className="lp2-bar">
        <div className="lp2-bar-row">
          <Link to="/home-2" className="lp2-logo"><img src="/logo.png" alt="Car InspectO" /></Link>
          {NAV.map(([id, l]) => <button key={id} onClick={() => go(id)}>{l}</button>)}
          <Link to={dash}>{dashLabel}</Link>
          <Link to={book} className="lp2-bar-book">Book now</Link>
        </div>
      </header>

      <section className="lp2-hero">
        <div className="lp2-meta">
          <span>Open seven days<br />8 AM – 6 PM</span>
          <span>Dubai · Abu Dhabi<br />Sharjah & beyond</span>
        </div>
        <h1>Inspect before<br />you ride.</h1>
        <p className="lp2-sub">Certified inspectors, a 150-point checklist and a report you can trust – at your door, anywhere in the UAE.</p>
        <Link to={book} className="lp2-pill">Book an inspection</Link>

        <div className="lp2-poster" aria-hidden="true">
          <svg className="lp2-sun" viewBox="0 0 400 200" fill="none"><g className="lp2-rays">{Array.from({ length: 18 }, (_, i) => <path key={i} d="M200 200 L200 8" transform={`rotate(${-85 + i * 10} 200 200)`} />)}</g>{[190, 150, 112, 76].map((r) => <path key={r} d={`M${200 - r} 200 A${r} ${r} 0 0 1 ${200 + r} 200`} />)}</svg>
          <svg className="lp2-hills" viewBox="0 0 1200 160" preserveAspectRatio="none" fill="none"><path d="M0 150 L120 70 L210 120 L340 30 L470 128 L580 82 L700 138 L830 48 L960 124 L1080 74 L1200 130" /><path d="M0 158 L90 112 L180 146 L300 96 L420 150 L560 108 L690 152 L820 100 L960 150 L1100 112 L1200 150" /></svg>
          <svg className="lp2-cloud c1" viewBox="0 0 120 40" fill="none"><path d="M10 32 H104 M22 32 C22 16 44 12 52 24 C60 8 90 10 92 32" /></svg>
          <svg className="lp2-cloud c2" viewBox="0 0 120 40" fill="none"><path d="M10 32 H104 M22 32 C22 16 44 12 52 24 C60 8 90 10 92 32" /></svg>
          <div className="lp2-road"><i /></div>
          <CarLine className="lp2-car" />
        </div>
      </section>

      <section className="lp2-stats">
        {STATS.map(([n, l]) => <Reveal key={l}><b>{n}</b><span>{l}</span></Reveal>)}
      </section>

      <section id="how" className="lp2-sec">
        <Reveal><h2>How it works</h2><p className="lp2-lede">Four quiet steps between “I’m interested” and “I know exactly what I’m buying”.</p></Reveal>
        <ol className="lp2-list">
          {STEPS.map(([n, t, d], i) => <Reveal as="li" key={n} delay={i * 60}><span>{n}</span><div><h3>{t}</h3><p>{d}</p></div></Reveal>)}
        </ol>
      </section>

      <section id="checks" className="lp2-sec">
        <Reveal><h2>What we check</h2><p className="lp2-lede">A structured digital checklist leaves nothing to memory.</p></Reveal>
        <div className="lp2-grid">
          {CHECKS.map(([t, d], i) => <Reveal key={t} delay={(i % 2) * 70} className="lp2-card"><h3>{t}</h3><p>{d}</p></Reveal>)}
        </div>
      </section>

      <section id="plans" className="lp2-sec">
        <Reveal><h2>Plans & pricing</h2><p className="lp2-lede">VAT and the small booking fee are shown before you pay.</p></Reveal>
        <div className="lp2-plans">
          {plans.map((p, i) => (
            <Reveal key={p.id} delay={i * 70} className={`lp2-plan ${p.popular ? 'is-pop' : ''}`}>
              <small>{p.popular ? 'Most chosen' : `${p.checkpoints} checkpoints`}</small>
              <h3>{p.name}</h3>
              <p className="lp2-price">{money(p.price)}<span> + VAT</span></p>
              <p className="lp2-meta">{p.checkpoints} checkpoints · {p.duration}</p>
              <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <Link to={book} className="lp2-pill sm">Choose {p.name}</Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="faq" className="lp2-sec">
        <Reveal><h2>Good questions</h2></Reveal>
        <div className="lp2-faq">
          {FAQ.map(([q, a], i) => (
            <div key={q} className={open === i ? 'open' : ''}>
              <button onClick={() => setOpen(open === i ? -1 : i)}>{q}<i /></button>
              <div className="lp2-faq-a"><p>{a}</p></div>
            </div>
          ))}
        </div>
      </section>

      <section className="lp2-end">
        <Reveal><h2>See you<br />on the road.</h2><Link to={book} className="lp2-pill">Book an inspection</Link></Reveal>
      </section>
      <footer className="lp2-foot"><span>© {new Date().getFullYear()} Car InspectO</span><span>+971 4 123 4567</span><span>hello@carinspecto.ae</span></footer>
      <ConceptSwitch />
    </div>
  );
}
