import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDB } from '../../lib/db';
import { useAuth } from '../../context/AuthContext';
import { PORTALS } from '../../lib/constants';
import './landing.css';

// Content shared by the three landing-page concepts (each one dresses it differently)
export const NAV = [['how', 'How it works'], ['checks', 'What we check'], ['plans', 'Plans'], ['faq', 'FAQ']];
export const STEPS = [
  ['01', 'Pick a plan & a slot', 'Choose your car, a plan and a time that suits you. Prices are shown up front.'],
  ['02', 'We come to you', 'A certified inspector arrives at your home, office or parking spot anywhere in the UAE.'],
  ['03', 'A full inspection', 'Up to 150+ checkpoints, an OBD scan, a road test and photographs of every finding.'],
  ['04', 'Your report, in minutes', 'A branded PDF with a health score lands in your dashboard before the inspector leaves.'],
];
export const CHECKS = [
  ['Vehicle summary', 'Body, paint depth, documents and service history.'],
  ['Tyres & brakes', 'Tread, age, rims, pads, discs and suspension – wheel by wheel.'],
  ['Engine bay', 'Fluids, leaks, belts, battery, mounts and noise.'],
  ['Transmission', 'Gear shifting, fluid condition, clutch and drivetrain.'],
  ['Electrical', '26 checks from lights and windows to cameras and sensors.'],
  ['Diagnostics', 'Pre and post test-drive OBD scans plus a road test.'],
];
export const STATS = [['12,480+', 'inspections completed'], ['150+', 'checkpoints per car'], ['8', 'emirates & cities'], ['4.8★', 'average rating']];
export const FAQ = [
  ['How long does an inspection take?', 'Between 60 minutes and 2 hours depending on the plan. The inspector comes to your location anywhere in the UAE.'],
  ['When do I get my report?', 'Your branded PDF report is in your dashboard minutes after the inspector finishes, and we email you a copy.'],
  ['Can I reschedule or cancel?', 'Yes – up to 4 hours before the slot, straight from My Bookings. Cancelled paid bookings are refunded.'],
  ['Are the inspectors verified?', 'Every inspector is background-checked, trained and certified before taking assignments.'],
];

export function useFont(href) {
  useEffect(() => {
    const link = Object.assign(document.createElement('link'), { rel: 'stylesheet', href });
    document.head.appendChild(link);
    return () => link.remove();
  }, [href]);
}

export function useScrolled(px = 24) {
  const [s, setS] = useState(false);
  useEffect(() => {
    const on = () => setS(window.scrollY > px);
    on(); window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [px]);
  return s;
}

export function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }) {
  const ref = useRef(null);
  useEffect(() => {
    const el = ref.current; if (!el) return undefined;
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.classList.add('in'); io.disconnect(); } }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <Tag ref={ref} className={`lp-reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>{children}</Tag>;
}

export const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export function usePortalLink() {
  const { user } = useAuth();
  return {
    user,
    book: user?.role === 'customer' ? '/app/book' : '/signup',
    dash: user ? PORTALS[user.role].home : '/login',
    dashLabel: user ? 'My dashboard' : 'Sign in',
  };
}
export const usePlans = () => useDB((s) => s.plans);

// the three concept pages, for the preview strip at the bottom of each one
export const CONCEPTS = [['/home-1', 'Concept 1 · Blueprint'], ['/home-2', 'Concept 2 · Road-trip poster'], ['/home-3', 'Concept 3 · Gallery']];
export const ConceptSwitch = () => (
  <div className="lp-switch" role="navigation" aria-label="Home page concepts">
    <span>Preview</span><Link to="/homes">All 8 concepts</Link><Link to="/">Current home</Link>
  </div>
);

// Side-view car line drawing. `className` decides the style (blueprint / poster).
export function CarLine({ className = '', idPrefix = 'car' }) {
  return (
    <svg className={`carline ${className}`} viewBox="0 0 1000 340" fill="none" role="img" aria-label="Car illustration">
      <g className="cl-body">
        <path className="cl-draw" pathLength="1" d="M70 258C70 236 84 222 112 216L214 196C262 150 330 118 420 110L600 106C690 108 752 150 790 200L892 214C930 220 944 238 944 258V262H812A52 52 0 0 0 708 262H302A52 52 0 0 0 198 262H70Z" />
        <path className="cl-draw" pathLength="1" d="M262 196C300 150 350 128 424 124L598 122C664 124 712 156 744 198Z" />
        <path className="cl-draw" pathLength="1" d="M500 124L504 198M360 140L340 198M345 200V258M604 200V258M366 214H394M624 214H652M900 226L936 230M78 234L102 238" />
      </g>
      {[250, 760].map((x) => (
        <g key={x} className="cl-wheel" transform={`translate(${x} 262)`}>
          <circle r="52" className="cl-tyre" /><circle r="31" />
          <g className="cl-spin"><circle r="8" />{[0, 45, 90, 135].map((a) => <path key={a} d="M0 -30V30" transform={`rotate(${a})`} />)}</g>
        </g>
      ))}
    </svg>
  );
}
