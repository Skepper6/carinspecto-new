import { Link } from 'react-router-dom';

// Index of every home-page concept (preview only). The current home page is not part of this list.
const ITEMS = [
  ['/home-1', 'Concept 1 · Blueprint', 'Off-white canvas, huge tight headlines, one orange accent, a line-drawn car that draws itself.', '#fcfbf8', '#fd5321', '#001011'],
  ['/home-2', 'Concept 2 · Road-trip poster', 'Cream paper, electric blue, a thin editorial serif and a retro poster scene.', '#fff8f1', '#006eff', '#006eff'],
  ['/home-3', 'Concept 3 · Gallery', 'Gunmetal canvas, full-bleed photography and a looping hero video, with a giant wordmark.', '#9ea29f', '#ffffff', '#ffffff'],
  ['/home-4', 'Concept 4 · Electric monolith', 'Chalk concrete and black, one solar-yellow CTA, a rotating 3D car in solar yellow.', '#f2f2f2', '#ffac00', '#151515'],
  ['/home-5', 'Concept 5 · Serene gallery', 'Sage canvas, teal accent and rounded white containers, with a 3D car you can drag.', '#d3e4df', '#64d5b3', '#0d1212'],
  ['/home-6', 'Concept 6 · Expedition specimen', 'Near-black field, a slate product stage and zero-radius tiles. The car turns with the scroll.', '#121211', '#3a4a49', '#f8f7f3'],
  ['/home-7', 'Concept 7 · Monochrome showroom', 'A black car in a spotlight, a huge product name and drag to turn.', '#000000', '#222222', '#ffffff'],
  ['/home-8', 'Concept 8 · Mission control', 'Void black and a star field, uppercase industrial type, telemetry readouts around a 3D car.', '#000000', '#f0f0fa', '#f0f0fa'],
];

export default function Homes() {
  return (
    <div style={{ minHeight: '100vh', background: '#f4f4f2', fontFamily: 'system-ui, sans-serif', padding: '56px 24px' }}>
      <div style={{ maxWidth: 1120, margin: '0 auto' }}>
        <h1 style={{ fontSize: 32, margin: '0 0 8px', fontWeight: 600 }}>Home page concepts</h1>
        <p style={{ color: '#666', margin: '0 0 32px' }}>Eight designs for review. The current home page and all dashboards are unchanged.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20 }}>
          {ITEMS.map(([to, t, d, bg, accent, ink]) => (
            <Link key={to} to={to} style={{ textDecoration: 'none', color: '#111', background: '#fff', border: '1px solid #e6e6e2', borderRadius: 16, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div style={{ height: 160, background: bg, display: 'grid', placeItems: 'center', color: ink, fontSize: 26, letterSpacing: '-.04em', position: 'relative' }}>
                Car InspectO
                <i style={{ position: 'absolute', left: 18, bottom: 16, width: 38, height: 8, borderRadius: 8, background: accent }} />
              </div>
              <div style={{ padding: 20 }}>
                <b style={{ fontSize: 16 }}>{t}</b>
                <p style={{ color: '#666', margin: '8px 0 12px', fontSize: 14, lineHeight: 1.5 }}>{d}</p>
                <span style={{ fontWeight: 600, fontSize: 14 }}>Open {to} →</span>
              </div>
            </Link>
          ))}
        </div>
        <p style={{ marginTop: 28 }}><Link to="/" style={{ color: '#444' }}>← Current home page</Link></p>
      </div>
    </div>
  );
}
