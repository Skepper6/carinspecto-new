import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Plus } from 'lucide-react';
import { CHECKS, ConceptSwitch, FAQ, NAV, Reveal, STATS, STEPS, go, useFont, usePlans, usePortalLink, useScrolled } from './shared';
import { money } from '../../lib/format';

// Concept 3 – "Industrial product gallery": gunmetal canvas, full-bleed photography / video, giant wordmark, ghost pills.
export default function Landing3() {
  useFont('https://fonts.googleapis.com/css2?family=Manrope:wght@400;500&display=swap');
  const plans = usePlans();
  const { book, dash, dashLabel } = usePortalLink();
  const scrolled = useScrolled(60);
  const [open, setOpen] = useState(0);

  return (
    <div className="lp lp3">
      <header className={`lp3-nav ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="lp3-nav-row">
          <Link to="/home-3" className="lp3-mark">Car InspectO<sup>®</sup></Link>
          <nav>{NAV.map(([id, l]) => <button key={id} onClick={() => go(id)}>{l}</button>)}</nav>
          <div className="lp3-nav-cta"><Link to={dash} className="lp3-text">{dashLabel}</Link><Link to={book} className="lp3-ghost">Book now</Link></div>
        </div>
      </header>

      <section className="lp3-hero">
        <div className="lp3-media" aria-hidden="true">
          <img src="/landing/hero.jpg" alt="" />
          <video autoPlay muted loop playsInline preload="auto" poster="/landing/hero.jpg"><source src="/landing/hero.mp4" type="video/mp4" /></video>
          <i />
        </div>
        <div className="lp3-hero-copy">
          <p>Receive the truth<br />about your car.</p>
          <Link to={book} className="lp3-ghost lg">Book an inspection <ArrowRight size={16} /></Link>
        </div>
        <h1 className="lp3-word">Car InspectO<sup>®</sup></h1>
        <span className="lp3-badge"><b>4.8★</b>12k+ inspections</span>
      </section>

      <section className="lp3-intro lp3-wrap">
        <Reveal><h2>Every car has a story.<br />We write it down.</h2></Reveal>
        <Reveal delay={80}><p>Certified inspectors visit your home, office or parking spot, check 150+ points and photograph every finding. You get a branded report with a clear health score – before you sign, pay or drive.</p><button className="lp3-link" onClick={() => go('how')}>See how it works <ArrowRight size={15} /></button></Reveal>
      </section>

      <section className="lp3-photos lp3-wrap">
        {[['/landing/suv.jpg', 'Exterior & paint'], ['/landing/interior.jpg', 'Interior & electrics'], ['/landing/engine.jpg', 'Engine & diagnostics']].map(([src, t], i) => (
          <Reveal key={t} delay={i * 80} className="lp3-photo"><img src={src} alt={t} loading="lazy" /><span>{t}</span></Reveal>
        ))}
      </section>

      <section id="how" className="lp3-rows lp3-wrap">
        {STEPS.map(([n, t, d], i) => (
          <Reveal key={n} className={`lp3-row ${i % 2 ? 'flip' : ''}`}>
            <div><em>{n}</em><h3>{t}</h3><p>{d}</p></div>
            <div className="lp3-row-fig"><span>{n}</span></div>
          </Reveal>
        ))}
      </section>

      <section id="checks" className="lp3-checks lp3-wrap">
        <Reveal><h2>What we check</h2></Reveal>
        <div>{CHECKS.map(([t, d], i) => <Reveal key={t} delay={(i % 3) * 60} className="lp3-check"><b>{t}</b><p>{d}</p></Reveal>)}</div>
      </section>

      <section className="lp3-stats">
        <div className="lp3-wrap">{STATS.map(([n, l]) => <Reveal key={l}><b>{n}</b><span>{l}</span></Reveal>)}</div>
      </section>

      <section id="plans" className="lp3-plans lp3-wrap">
        <Reveal><h2>Plans</h2><p className="lp3-lede">Prices in AED. VAT and the small booking fee are shown before you pay.</p></Reveal>
        <div>
          {plans.map((p, i) => (
            <Reveal key={p.id} delay={i * 70} className={`lp3-plan ${p.popular ? 'is-pop' : ''}`}>
              <h3>{p.name}{p.popular && <small>Most chosen</small>}</h3>
              <p className="lp3-price">{money(p.price)}<span> + VAT</span></p>
              <p className="lp3-meta">{p.checkpoints} checkpoints · {p.duration}</p>
              <ul>{p.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <Link to={book} className="lp3-ghost dark block">Choose {p.name}</Link>
            </Reveal>
          ))}
        </div>
      </section>

      <section id="faq" className="lp3-faq lp3-wrap">
        <Reveal><h2>FAQ</h2></Reveal>
        <div>
          {FAQ.map(([q, a], i) => (
            <div key={q} className={open === i ? 'open' : ''}>
              <button onClick={() => setOpen(open === i ? -1 : i)}><span>{q}</span><Plus size={18} /></button>
              <div className="lp3-faq-a"><p>{a}</p></div>
            </div>
          ))}
        </div>
      </section>

      <footer className="lp3-foot">
        <div className="lp3-wrap">
          <h2>Car InspectO<sup>®</sup></h2>
          <div><Link to={book} className="lp3-ghost">Book an inspection</Link><p>© {new Date().getFullYear()} · +971 4 123 4567 · hello@carinspecto.ae</p></div>
        </div>
      </footer>
      <ConceptSwitch dark />
    </div>
  );
}
