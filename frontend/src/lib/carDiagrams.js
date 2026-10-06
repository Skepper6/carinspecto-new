// SVG diagrams for the PDF report (interior, exterior, chassis, wheels). Front of the car points right.
// Each returns a data-URL SVG; the PDF rasterises it. States: 'ok' | 'bad' | 'na' (markers) or paint states (exterior).
const INK = '#1d1d2b';
const LINE = '#9a9aa8';
const MARK = { ok: '#111111', bad: '#e51919', na: '#ffd633' };
const PAINT = { Original: '#ffffff', 'Cosmetic paint': '#ffd633', 'Faded paint': '#ffcda0', 'Accident paint': '#e51919' };

const url = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
const wrap = (w, h, body) => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Helvetica, Arial, sans-serif">${body}</svg>`;

const BODY = 'M80 66 L340 62 Q440 62 490 92 Q506 104 506 115 Q506 126 490 138 Q440 168 340 168 L80 164 Q58 160 58 115 Q58 70 80 66 Z';

function wheels(xs, top, bottom, w = 44, h = 13) {
  return xs.map((x) => `<rect x="${x}" y="${top}" width="${w}" height="${h}" rx="5" fill="#222"/><rect x="${x}" y="${bottom}" width="${w}" height="${h}" rx="5" fill="#222"/>`).join('');
}
function marker(n, x, y, ax, ay, state) {
  const fillc = MARK[state] ?? MARK.ok;
  const tc = state === 'na' ? INK : '#fff';
  return `<line x1="${ax}" y1="${ay}" x2="${x}" y2="${y}" stroke="${LINE}" stroke-width="1"/><circle cx="${ax}" cy="${ay}" r="2.2" fill="${LINE}"/>`
    + `<circle cx="${x}" cy="${y}" r="12" fill="${fillc}"/><text x="${x}" y="${y + 4}" font-size="${String(n).length > 1 ? 11 : 12}" font-weight="700" fill="${tc}" text-anchor="middle">${n}</text>`;
}
// markers evenly spaced along the top / bottom edge, ordered by anchor x so leader lines do not cross
function layout(points, W, H, pad = 34) {
  const top = points.filter((p) => p.ay < H / 2).sort((a, b) => a.ax - b.ax);
  const bot = points.filter((p) => p.ay >= H / 2).sort((a, b) => a.ax - b.ax);
  const place = (arr, y) => arr.map((p, i) => ({ ...p, mx: pad + ((W - pad * 2) * (i + 0.5)) / arr.length, my: y }));
  return [...place(top, 18), ...place(bot, H - 18)];
}
const markers = (pts, W, H, pad) => layout(pts, W, H, pad).map((p) => marker(p.n, p.mx, p.my, p.ax, p.ay, p.state)).join('');

/* ---------------- interior (top view) ---------------- */
const INTERIOR_ANCHORS = [
  [100, 115], [240, 100], [348, 115], [300, 132], [262, 78], [322, 130], [348, 78], [345, 112], [336, 146], [290, 164], [364, 115], [176, 115], [352, 100], [230, 160],
];
const INTERIOR_ORDER = [6, 1, 2, 4, 7, 3, 13, 8, 9, 10, 11, 12, 5, 14]; // not used – anchors below are by part number
const IA = { 1: [240, 100], 2: [338, 112], 3: [322, 132], 4: [296, 98], 5: [304, 115], 6: [100, 115], 7: [262, 70], 8: [346, 128], 9: [330, 148], 10: [290, 164], 11: [364, 115], 12: [176, 115], 13: [352, 92], 14: [228, 162] };
export function interiorDiagram(states) {
  const W = 560; const H = 250;
  const pts = Object.entries(IA).map(([n, [ax, ay]]) => ({ n: Number(n), ax: ax + 20, ay: ay + 35, state: states[n] ?? 'ok' }));
  const body = `<g transform="translate(20 35)">
    ${wheels([108, 392], 48, 169)}
    <path d="${BODY}" fill="#fafafc" stroke="${LINE}" stroke-width="1.4"/>
    <path d="M150 82 L330 76 L376 96 L376 134 L330 154 L150 148 Z" fill="#f1f1f6" stroke="${LINE}"/>
    <path d="M330 78 L378 96 L378 134 L330 152 Z" fill="#dfe9ef" stroke="${LINE}"/>
    <path d="M148 84 L162 84 L162 146 L148 146 Z" fill="#dfe9ef" stroke="${LINE}"/>
    <rect x="258" y="86" width="30" height="24" rx="8" fill="#ececf3" stroke="${LINE}"/><rect x="258" y="120" width="30" height="24" rx="8" fill="#ececf3" stroke="${LINE}"/>
    <rect x="214" y="86" width="30" height="58" rx="8" fill="#ececf3" stroke="${LINE}"/>
    <rect x="296" y="86" width="28" height="24" rx="8" fill="#e3e3ec" stroke="${LINE}"/><rect x="296" y="120" width="28" height="24" rx="8" fill="#e3e3ec" stroke="${LINE}"/>
    <circle cx="326" cy="132" r="8" fill="none" stroke="${INK}" stroke-width="1.6"/><rect x="302" y="112" width="12" height="6" rx="3" fill="#cfcfda" stroke="${LINE}"/>
    <path d="M340 80 L340 150" stroke="${LINE}" stroke-width="1.2"/>
    <path d="M214 62 L214 76 M290 62 L290 76 M214 154 L214 168 M290 154 L290 168" stroke="${LINE}" stroke-width="1.2"/>
    <path d="M345 58 L360 50 L370 58" fill="#e8e8ef" stroke="${LINE}"/><path d="M345 172 L360 180 L370 172" fill="#e8e8ef" stroke="${LINE}"/>
    <rect x="76" y="78" width="70" height="74" rx="10" fill="#f4f4f8" stroke="${LINE}" stroke-dasharray="3 3"/>
  </g>`;
  return url(wrap(W, H, body + markers(pts, W, H)));
}

/* ---------------- exterior (top view with paint panels) ---------------- */
const EX_PANELS = {
  rearBumper: 'M50 55 H92 V185 H50 Z', trunk: 'M92 85 H185 V155 H92 Z', roof: 'M185 85 H300 V155 H185 Z', bonnet: 'M300 85 H430 V155 H300 Z', frontBumper: 'M430 55 H520 V185 H430 Z',
  frontGrill: 'M486 100 H520 V140 H486 Z',
  rRearFender: 'M92 55 H172 V85 H92 Z', rRearDoor: 'M172 55 H236 V85 H172 Z', rFrontDoor: 'M236 55 H300 V85 H236 Z', rFender: 'M300 55 H430 V85 H300 Z',
  lRearFender: 'M92 155 H172 V185 H92 Z', lRearDoor: 'M172 155 H236 V185 H172 Z', lFrontDoor: 'M236 155 H300 V185 H236 Z', lFender: 'M300 155 H430 V185 H300 Z',
};
const EX_CENTRE = {
  rearBumper: [70, 120], trunk: [138, 120], roof: [242, 120], bonnet: [365, 120], frontBumper: [458, 90], frontGrill: [503, 120],
  rRearFender: [132, 70], rRearDoor: [204, 70], rFrontDoor: [268, 70], rFender: [365, 70], lRearFender: [132, 170], lRearDoor: [204, 170], lFrontDoor: [268, 170], lFender: [365, 170],
};
export function exteriorDiagram(panels) {
  const W = 560; const H = 240;
  const BODYX = 'M92 52 L340 48 Q450 48 508 84 Q526 98 526 120 Q526 142 508 156 Q450 192 340 192 L92 188 Q46 184 46 120 Q46 56 92 52 Z';
  const parts = Object.entries(EX_PANELS).map(([id, d]) => {
    const st = panels[id]; const f = PAINT[st?.v] ?? '#fff';
    return `<path d="${d}" fill="${f}" stroke="${LINE}" stroke-width="1"/>`;
  }).join('');
  const tags = Object.entries(EX_CENTRE).map(([id, [cx, cy]]) => {
    const d = panels[id]?.defects ?? [];
    return d.map((code, i) => `<circle cx="${cx + i * 20 - (d.length - 1) * 10}" cy="${cy}" r="10" fill="#111"/><text x="${cx + i * 20 - (d.length - 1) * 10}" y="${cy + 3.5}" font-size="9" font-weight="700" fill="#fff" text-anchor="middle">${code}</text>`).join('');
  }).join('');
  const body = `<defs><clipPath id="b"><path d="${BODYX}"/></clipPath></defs>
    ${wheels([120, 420], 36, 191, 52, 14)}
    <g clip-path="url(#b)">${parts}</g>
    <path d="${BODYX}" fill="none" stroke="${INK}" stroke-width="1.6" opacity=".55"/>
    <path d="M188 86 H300 V154 H188 Z" fill="none" stroke="${INK}" stroke-width="1" opacity=".35"/>
    <path d="M300 86 L330 98 V142 L300 154" fill="none" stroke="${INK}" stroke-width="1" opacity=".35"/>
    <path d="M345 44 L362 34 L374 44" fill="#e8e8ef" stroke="${LINE}"/><path d="M345 196 L362 206 L374 196" fill="#e8e8ef" stroke="${LINE}"/>
    ${tags}`;
  return url(wrap(W, H, body));
}

/* ---------------- chassis / subframe ---------------- */
const CA = { 1: [468, 120], 2: [408, 92], 3: [418, 62], 4: [372, 74], 5: [392, 102], 6: [456, 96], 7: [372, 168], 8: [344, 150], 9: [310, 120], 10: [260, 180], 11: [240, 150], 12: [220, 120], 13: [124, 176], 14: [168, 160], 15: [276, 128], 16: [108, 120], 17: [244, 170], 18: [334, 168], 19: [280, 104], 20: [244, 68], 21: [260, 60], 22: [338, 72] };
export function chassisDiagram(states) {
  const W = 560; const H = 250;
  const pts = Object.entries(CA).map(([n, [ax, ay]]) => ({ n: Number(n), ax: ax + 10, ay: ay + 30, state: states[n] ?? 'ok' }));
  const body = `<g transform="translate(10 30)" fill="none" stroke="${INK}" stroke-width="1.5" opacity=".75">
    <path d="M60 60 L470 60 Q490 60 490 80 L490 160 Q490 180 470 180 L60 180 Q48 180 48 160 L48 80 Q48 60 60 60 Z" stroke="${LINE}"/>
    <path d="M70 92 L460 92 M70 148 L460 148" stroke-width="2.4"/>
    <path d="M455 70 V170 M72 76 V164 M180 92 V148 M330 92 V148" stroke-width="2"/>
    <circle cx="410" cy="64" r="26" stroke="${LINE}"/><circle cx="410" cy="176" r="26" stroke="${LINE}"/><circle cx="125" cy="64" r="26" stroke="${LINE}"/><circle cx="125" cy="176" r="26" stroke="${LINE}"/>
    <path d="M340 66 L300 62 M340 174 L300 178 M236 62 L236 178 M170 70 L166 170" stroke-width="2.2"/>
    <rect x="262" y="104" width="30" height="32" rx="6" stroke="${LINE}"/><rect x="206" y="104" width="46" height="32" rx="6" stroke="${LINE}"/>
    <path d="M372 96 L398 96 M372 144 L398 144" stroke-width="3"/>
  </g>`;
  return url(wrap(W, H, body + markers(pts, W, H)));
}

/* ---------------- wheels (tyres / rims / brakes) ---------------- */
export function wheelDiagram(states, withSpare = true) {
  const W = 360; const H = 170;
  const c = (k) => (states[k] === 'bad' ? '#e51919' : states[k] === 'na' ? '#9a9aa8' : '#43a047');
  const tag = (k, x, y) => `<circle cx="${x}" cy="${y}" r="15" fill="${c(k)}"/><text x="${x}" y="${y + 4}" font-size="11" font-weight="700" fill="#fff" text-anchor="middle">${k}</text>`;
  const body = `<rect x="90" y="52" width="190" height="68" rx="14" fill="#f4f4f8" stroke="${LINE}" stroke-width="1.5"/>
    ${[[76, 38], [76, 112], [250, 38], [250, 112]].map(([x, y]) => `<rect x="${x}" y="${y}" width="34" height="20" rx="6" fill="#222"/>`).join('')}
    <rect x="130" y="64" width="110" height="44" rx="8" fill="#e8e8ef" stroke="${LINE}"/>
    <text x="40" y="92" font-size="10" fill="#75738f" text-anchor="middle">Back</text><text x="328" y="92" font-size="10" fill="#75738f" text-anchor="middle">Front</text>
    ${tag('RL', 62, 30)}${tag('RR', 62, 146)}${tag('FL', 296, 30)}${tag('FR', 296, 146)}${withSpare ? tag('ST', 112, 86) : ''}`;
  return url(wrap(W, H, body));
}
