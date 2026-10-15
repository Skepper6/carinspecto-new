import { sectionsForPlan, itemTotals, gradeItem, isGradedType, isAnswered, verdict, PANELS, DEFECTS, INTERIOR_PARTS, LEAK_DETAILS, findingLabel, findingDescription, carbonFootprint } from './inspectionSchema';
import { rasterize, carCoverArt, roundedThumb } from './image';
import { interiorDiagram, exteriorDiagram, chassisDiagram, wheelDiagram } from './carDiagrams';
import { carName, fmtDate, fmtTime, fmtDateTime } from './format';
import { COMPANY, COVER } from './constants';

const INDIGO = [51, 35, 127];
const ORANGE = [245, 130, 32];
const GREEN = [67, 160, 71];
const RED = [229, 25, 25];
const YELLOW = [255, 214, 51];
const PEACH = [255, 205, 160];
const GREY = [110, 110, 130];
const INK = [28, 28, 44];
const BAND = [224, 222, 230];
const CARD = [249, 249, 250];

// Headings have no body text. Wording is the company's own and should be reviewed by legal counsel.
const DISCLAIMER = [
  ['Inspection Accuracy Disclaimer', ''],
  ['1. Non-Guarantee of Condition:', '"Car InspectO provides inspection reports based on a visual, non-invasive evaluation of the vehicle\'s condition at the time of inspection. The report reflects the Inspector\'s findings to the best of their ability but does not serve as a definitive or exhaustive assessment of the vehicle\'s condition. Car InspectO shall not be held liable for any claims, disputes, or disagreements arising from differences in interpretation or undisclosed vehicle conditions."'],
  ['2. Seller\'s Acknowledgment of Inspection Process:', '"By allowing an inspection, the Seller acknowledges that Car InspectO\'s findings are based on the Inspector\'s professional judgment and that differences in opinion regarding the vehicle\'s condition may exist. Car InspectO assumes no liability for disputes regarding pre-existing damages or conditions not disclosed by the Seller."'],
  ['Limitation of Liability to Sellers', ''],
  ['3. Exclusion of Liability to Sellers:', '"Car InspectO does not have any contractual obligation or liability to the Seller, as the inspection is conducted on behalf of the Buyer. Any disputes regarding the findings must be resolved directly between the Buyer and Seller, and Car InspectO\'s role is limited to providing an unbiased, professional assessment."'],
  ['Seller Consent and Agreement', ''],
  ['4. Consent to Inspection Findings:', '"By allowing an inspection, the Seller agrees that they will not hold Car InspectO liable for any discrepancies, claims, or disputes arising from the findings in the inspection report. The Seller acknowledges that the report is an independent evaluation and does not guarantee or validate the Seller\'s representations about the vehicle\'s condition."'],
  ['Dispute Resolution with Sellers', ''],
  ['5. Mediation and Arbitration:', '"If the Seller disputes the findings of an inspection report and seeks to claim damages, the matter shall first be referred to good-faith negotiations between all parties (Buyer, Seller and Car InspectO). If unresolved, the dispute shall be subject to mediation or binding arbitration in accordance with the rules of the Dubai International Arbitration Centre (DIAC), with Car InspectO\'s liability limited to the fee paid for the inspection."'],
  ['Indemnification Clause', ''],
  ['6. Seller Indemnity:', '"The Seller agrees to indemnify and hold Car InspectO harmless from any claims, damages, or disputes arising from inaccuracies, misrepresentations, or omissions in the Seller\'s description of the vehicle or its condition prior to the inspection."'],
];

let logoCache;
async function loadLogo() {
  if (logoCache !== undefined) return logoCache;
  try {
    const blob = await (await fetch('/logo.png')).blob();
    const data = await new Promise((res) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.readAsDataURL(blob); });
    const dim = await new Promise((res) => { const i = new Image(); i.onload = () => res({ w: i.width, h: i.height }); i.onerror = () => res({ w: 3, h: 2 }); i.src = data; });
    logoCache = { data, ratio: dim.w / dim.h };
  } catch { logoCache = null; }
  return logoCache;
}

// a slot runs 90 minutes, e.g. 11:00 - 12:30
const slotRange = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const e = h * 60 + m + 90;
  return `${fmtTime(t)} - ${fmtTime(`${String(Math.floor(e / 60) % 24).padStart(2, '0')}:${String(e % 60).padStart(2, '0')}`)}`;
};

// tiny flag (16 x 11) for the regional spec shown beside the make and model
function drawFlag(doc, spec, x, y) {
  const w = 16; const h = 11;
  const box = (c, bx, by, bw, bh) => { doc.setFillColor(c[0], c[1], c[2]); doc.rect(bx, by, bw, bh, 'F'); };
  const RED = [206, 17, 38]; const WHITE = [255, 255, 255]; const BLUE = [0, 40, 104];
  box(WHITE, x, y, w, h);
  if (spec === 'Japanese') { doc.setFillColor(188, 0, 45); doc.circle(x + w / 2, y + h / 2, 3.2, 'F'); }
  else if (spec === 'GCC') { box([0, 115, 47], x, y, w, h / 3); box([0, 0, 0], x, y + (h * 2) / 3, w, h / 3); box(RED, x, y, 4.5, h); }
  else if (spec === 'American') { for (let i = 0; i < 4; i++) box(RED, x, y + i * (h / 4) * 1 + (i ? 0 : 0), w, h / 8); box(BLUE, x, y, 7, 5.5); }
  else if (spec === 'European') { box(BLUE, x, y, w, h); doc.setFillColor(255, 204, 0); for (let i = 0; i < 8; i++) doc.circle(x + w / 2 + Math.cos((i * Math.PI) / 4) * 3.6, y + h / 2 + Math.sin((i * Math.PI) / 4) * 3.6, 0.6, 'F'); }
  else if (spec === 'Canadian') { box(RED, x, y, 4, h); box(RED, x + w - 4, y, 4, h); box(RED, x + w / 2 - 1.5, y + 3, 3, 5); }
  else if (spec === 'Korean') { doc.setFillColor(205, 46, 58); doc.circle(x + w / 2, y + h / 2, 2.8, 'F'); doc.setFillColor(0, 71, 160); doc.circle(x + w / 2, y + h / 2 + 1.2, 1.6, 'F'); }
  else if (spec === 'Chinese') { box(RED, x, y, w, h); doc.setFillColor(255, 222, 0); doc.circle(x + 3.6, y + 3.4, 1.6, 'F'); }
  else { box([200, 200, 210], x, y, w, h); }
  doc.setDrawColor(200, 200, 210); doc.setLineWidth(0.4); doc.rect(x, y, w, h, 'S');
}

const textColor = (doc, c) => doc.setTextColor(c[0], c[1], c[2]);
const fill = (doc, c) => doc.setFillColor(c[0], c[1], c[2]);

export async function generateReportPDF({ booking, inspection, plan, customer, inspector }) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 36;
  const CW = W - M * 2;
  const logo = await loadLogo();
  const totals = itemTotals(plan, inspection.data);
  const v = verdict(totals.score);
  const sections = sectionsForPlan(plan);
  const data = inspection.data;
  const photos = inspection.photos ?? [];
  const cache = new Map();
  const prep = async (src, ratio = 1, maxW = 300) => {
    const key = `${src.length}:${src.slice(-40)}:${ratio}`;
    if (!cache.has(key)) cache.set(key, rasterize(src, maxW, ratio).catch(() => null));
    return cache.get(key);
  };
  let y = 0;

  /* ---------- page furniture ---------- */
  const header = () => {
    if (logo) doc.addImage(logo.data, 'PNG', M, 10, 54 * logo.ratio, 54);
    else { textColor(doc, INDIGO); doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text(COMPANY.name, M, 38); }
    textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11);
    doc.text('Pre-Purchase', W - M, 30, { align: 'right' });
    doc.text('Inspection Report', W - M, 46, { align: 'right' });
    y = 80;
  };
  const newPage = () => { doc.addPage(); header(); };
  const ensure = (h) => { if (y + h > H - 46) newPage(); };
  const band = (title) => {
    ensure(46);
    fill(doc, BAND); doc.roundedRect(M, y, CW, 30, 5, 5, 'F');
    textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5);
    doc.text(title, M + 12, y + 20);
    y += 44;
  };
  const sub = (title) => {
    ensure(34);
    fill(doc, BAND); doc.roundedRect(M, y, CW, 24, 4, 4, 'F');
    textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
    doc.text(title, M + 10, y + 16);
    y += 32;
  };
  const iconAt = (kind, cx, cy) => {
    if (kind === 'pass') {
      fill(doc, GREEN); doc.circle(cx, cy, 5.6, 'F');
      doc.setDrawColor(255, 255, 255); doc.setLineWidth(1.3); doc.line(cx - 2.6, cy, cx - 0.7, cy + 2); doc.line(cx - 0.7, cy + 2, cx + 2.8, cy - 2.2);
    } else {
      fill(doc, kind === 'fail' ? RED : GREY);
      doc.triangle(cx - 6, cy + 5, cx + 6, cy + 5, cx, cy - 6, 'F');
      doc.setFillColor(255, 255, 255); doc.rect(cx - 0.6, cy - 2.5, 1.2, 4, 'F'); doc.rect(cx - 0.6, cy + 2.2, 1.2, 1.2, 'F');
    }
  };
  const pill = (label, right, cy, color) => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const w = doc.getTextWidth(label) + 26;
    fill(doc, color); doc.roundedRect(right - w, cy - 9, w, 18, 9, 9, 'F');
    textColor(doc, [255, 255, 255]); doc.text(label, right - w / 2, cy + 3, { align: 'center' });
  };

  /* ---------- 1. cover ---------- */
  // Same layout as the reference cover: the photo fills the whole page, the logo sits top-left, a small mark top-right and
  // one rounded card near the bottom holds the title, the three contact columns and "Powered by". Positions are the
  // reference's, scaled to A4 (595 x 842 pt).
  const coverPhoto = photos.find((p) => p.category === COVER) ?? photos.find((p) => p.category === 'Exterior');
  const coverSrc = coverPhoto?.src ?? carCoverArt();
  const cover = await prep(coverSrc, W / H, 1100);
  fill(doc, [10, 10, 14]); doc.rect(0, 0, W, H, 'F');
  if (cover) doc.addImage(cover.data, 'JPEG', 0, 0, W, H);
  if (logo) {
    fill(doc, [255, 255, 255]); doc.roundedRect(30, 24, 30 * logo.ratio + 20, 46, 10, 10, 'F');
    doc.addImage(logo.data, 'PNG', 40, 31, 30 * logo.ratio, 30);
  }
  fill(doc, ORANGE); doc.roundedRect(W - 30 - 36, 28, 36, 36, 9, 9, 'F');                                   // brand mark, top-right
  doc.setDrawColor(INK[0], INK[1], INK[2]); doc.setLineWidth(2.4); doc.setLineCap('round');
  doc.line(W - 30 - 27, 55, W - 30 - 11, 37); doc.line(W - 30 - 22, 37, W - 30 - 11, 37); doc.line(W - 30 - 11, 37, W - 30 - 11, 48);
  doc.setLineCap('butt');
  const cx0 = W * 0.157; const cy0 = H * 0.678; const cw = W * 0.686; const ch = H * 0.247;
  fill(doc, ORANGE); doc.roundedRect(cx0, cy0, cw, ch, 15, 15, 'F');
  textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(16);
  doc.text('Pre-Purchase', W / 2, cy0 + 40, { align: 'center' }); doc.text('Inspection Report', W / 2, cy0 + 62, { align: 'center' });
  doc.setDrawColor(INK[0], INK[1], INK[2]); doc.setLineWidth(1);
  doc.line(cx0 + 18, cy0 + 83, cx0 + cw - 18, cy0 + 83);
  [['Telephone', COMPANY.phone, 0.163, false], ['Email', COMPANY.email, 0.483, true], ['Website', COMPANY.web, 0.80, true]].forEach(([k, val, f, link]) => {
    const tx = cx0 + cw * f;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text(k, tx, cy0 + 108, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.text(val, tx, cy0 + 128, { align: 'center' });
    if (link) { const w2 = doc.getTextWidth(val); doc.setLineWidth(0.6); doc.line(tx - w2 / 2, cy0 + 130, tx + w2 / 2, cy0 + 130); }
  });
  doc.setLineWidth(1); doc.line(cx0 + 18, cy0 + 155, cx0 + cw - 18, cy0 + 155);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11.5);
  const LOGO_H = 22;
  const pbw = doc.getTextWidth('Powered by ') + (logo ? LOGO_H * logo.ratio + 15 : doc.getTextWidth(COMPANY.name));
  const lx = W / 2 - pbw / 2 + doc.getTextWidth('Powered by ') + 9;
  doc.text('Powered by ', W / 2 - pbw / 2, cy0 + 183);
  if (logo) {
    // white badge behind the logo so the orange/navy wordmark stays readable on the orange card
    fill(doc, [255, 255, 255]); doc.roundedRect(lx - 6, cy0 + 168, LOGO_H * logo.ratio + 12, LOGO_H, 6, 6, 'F');
    doc.addImage(logo.data, 'PNG', lx, cy0 + 168, LOGO_H * logo.ratio, LOGO_H);
  }
  else doc.text(COMPANY.name, W / 2 - pbw / 2 + doc.getTextWidth('Powered by '), cy0 + 181);

  /* ---------- 2. vehicle summary ---------- */
  newPage();
  band('Vehicle Summary');
  const S = data.summary ?? {};
  const sv = (id) => (S[id]?.v === 'Other' && S[id]?.other ? S[id].other : S[id]?.v);
  const left = M + 10; const midX = M + CW / 2 + 12;
  const pw = CW / 2 - 28; const ph = pw * 0.68;
  if (cover) doc.addImage((await prep(coverSrc, pw / ph, 600)).data, 'JPEG', left, y, pw, ph);
  doc.setDrawColor(235, 235, 240); doc.setLineWidth(1); doc.line(M + CW / 2 - 4, y - 6, M + CW / 2 - 4, y + 470);
  let ly = y + ph + 26;
  textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5);
  doc.text(carName(booking.car), left + pw / 2 + 11, ly, { align: 'center' });
  if (sv('regionalSpecs')) drawFlag(doc, sv('regionalSpecs'), left + pw / 2 + 11 - doc.getTextWidth(carName(booking.car)) / 2 - 24, ly - 9);
  textColor(doc, GREY); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  doc.text(`Verified by ${COMPANY.name}`, left + pw / 2, ly + 14, { align: 'center' });
  ly += 44;
  [['Date', fmtDate(booking.date, { year: 'numeric', month: '2-digit', day: '2-digit' })], ['Time', slotRange(booking.time)], ['Inspection type', `${plan.name} (${plan.checkpoints} checkpoints)`], ['VIN number', sv('vin') || '—']].forEach(([k, val]) => {
    fill(doc, ORANGE); doc.roundedRect(left, ly - 9, 20, 20, 5, 5, 'F');
    textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text(k, left + 30, ly + 1);
    textColor(doc, GREY); doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(String(val), left + 30, ly + 14);
    ly += 38;
  });
  // overview donut
  fill(doc, BAND); doc.roundedRect(M, ly + 4, CW / 2 - 12, 26, 4, 4, 'F');
  textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Report Overview', M + 12, ly + 21);
  const segs = [['Defect', totals.fail, RED], ['Pass', totals.pass, GREEN], ['N/A', totals.na, [255, 152, 40]]];
  const sum = segs.reduce((a, s) => a + s[1], 0) || 1;
  const dcx = M + 78; const dcy = ly + 100; const dr = 46;
  let ang = -90;
  doc.setLineWidth(15);
  segs.forEach(([, n, col]) => {
    const sweep = (n / sum) * 360;
    doc.setDrawColor(col[0], col[1], col[2]);
    for (let a = 0; a < sweep; a += 2) {
      const a1 = ((ang + a) * Math.PI) / 180; const a2 = ((ang + Math.min(a + 2.6, sweep)) * Math.PI) / 180;
      doc.line(dcx + dr * Math.cos(a1), dcy + dr * Math.sin(a1), dcx + dr * Math.cos(a2), dcy + dr * Math.sin(a2));
    }
    ang += sweep;
  });
  textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(20); doc.text(String(totals.score), dcx, dcy + 5, { align: 'center' });
  doc.setFontSize(7); textColor(doc, GREY); doc.text('HEALTH SCORE', dcx, dcy + 15, { align: 'center' });
  segs.forEach(([k, n, col], i) => {
    fill(doc, col); doc.rect(M + 150, ly + 66 + i * 20, 9, 9, 'F');
    textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text(String(n), M + 165, ly + 74 + i * 20);
    doc.setFont('helvetica', 'normal'); doc.text(`${k} (${Math.round((n / sum) * 100)}%)`, M + 184, ly + 74 + i * 20);
  });

  // right column: highlights
  let ry = y + 6;
  textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(12.5);
  doc.text('Vehicle Highlights', midX + (CW / 2 - 28) / 2, ry + 8, { align: 'center' });
  fill(doc, [244, 244, 247]); doc.roundedRect(midX - 6, ry + 22, CW / 2 - 16, 54, 10, 10, 'F');
  [['Odometer Reading', sv('odometer') != null ? `${Number(sv('odometer')).toLocaleString('en-GB')} Kms` : '—'], ['Fuel Type', booking.car.fuel]].forEach(([k, val], i) => {
    const x = midX + 6 + i * 130;
    fill(doc, ORANGE); doc.roundedRect(x, ry + 36, 24, 24, 6, 6, 'F');
    textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(k, x + 32, ry + 46);
    textColor(doc, GREY); doc.setFont('helvetica', 'normal'); doc.text(String(val), x + 32, ry + 59);
  });
  ry += 88;
  const carbon = carbonFootprint(sv('odometer'), booking.car.fuel, sv('engineSize'));
  if (carbon) {
    const bw = CW / 2 - 16;
    fill(doc, [244, 244, 247]); doc.roundedRect(midX - 6, ry, bw, 92, 10, 10, 'F');
    fill(doc, ORANGE); doc.roundedRect(midX + 6, ry + 12, 24, 24, 6, 6, 'F');
    doc.setFillColor(255, 255, 255); doc.ellipse(midX + 18, ry + 24, 5.5, 3.2, 'F');
    textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('Carbon Footprint', midX + 38, ry + 22);
    textColor(doc, GREY); doc.setFont('helvetica', 'normal'); doc.text(`${carbon.tonnes} Tonnes Of CO2e`, midX + 38, ry + 35);
    const bx = midX + 6; const by = ry + 70; const barW = bw - 24;
    [[GREEN, 0.4], [[200, 220, 40], 0.2], [[255, 193, 7], 0.2], [RED, 0.2]].forEach(([c, f], i, arr) => {
      const x0 = bx + barW * arr.slice(0, i).reduce((a, b) => a + b[1], 0);
      doc.setFillColor(c[0], c[1], c[2]); doc.roundedRect(x0, by, barW * f - 2, 5, 2.5, 2.5, 'F');
    });
    doc.setFillColor(67, 160, 71); doc.ellipse(bx + 8, by - 13, 5, 8, 'F');                                  // leaf (low emissions end)
    const cx = bx + 14 + (barW - 28) * carbon.rating;                                                         // car marker
    doc.setFillColor(17, 17, 17); doc.roundedRect(cx - 9, by - 13, 18, 7, 2, 2, 'F'); doc.roundedRect(cx - 5, by - 18, 10, 6, 2, 2, 'F');
    doc.setFillColor(255, 255, 255); doc.circle(cx - 5, by - 5.5, 2.4, 'F'); doc.circle(cx + 5, by - 5.5, 2.4, 'F');
    doc.setFillColor(17, 17, 17); doc.circle(cx - 5, by - 5.5, 1.5, 'F'); doc.circle(cx + 5, by - 5.5, 1.5, 'F');
    ry += 108;
  } else ry += 24;
  const facts = [
    ['Make', booking.car.make], ['Model', booking.car.model], ['Model Year', booking.car.year], ['Regional Specs', sv('regionalSpecs')],
    ['Transmission', sv('transmissionType')], ['Engine Size', sv('engineSize')], ['Interior', sv('interiorType')], ['Spare Tyre', sv('spareTyre')],
    ['Number of Keys', sv('keys')], ['Vehicle Type', sv('vehicleType') ?? booking.car.type], ['External Colour', sv('colour')], ['Registration', booking.car.reg],
  ];
  facts.forEach(([k, val], i) => {
    const x = midX + (i % 2) * 130; const yy = ry + Math.floor(i / 2) * 46;
    textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text(k, x, yy);
    textColor(doc, GREY); doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(String(val ?? '—'), x, yy + 14, { maxWidth: 120 });
  });
  y = Math.max(ly + 190, ry + 6 * 46) + 6;

  /* ---------- helpers (reference-style) ---------- */
  const SLATE = [74, 78, 100];
  const wrapTxt = (text, w, size = 9, style = 'normal') => { doc.setFont('helvetica', style); doc.setFontSize(size); return doc.splitTextToSize(String(text), w); };
  const thumbCache = new Map();
  const thumb = (src, px = 240) => {
    const key = `${src.length}:${src.slice(-30)}`;
    if (!thumbCache.has(key)) thumbCache.set(key, roundedThumb(src, px).catch(() => null));
    return thumbCache.get(key);
  };
  const diagram = async (svgUrl, width) => {
    const r = await rasterize(await svgUrl, 1400, null, 0.95);   // the diagram functions return a promise of a PNG
    const h = (r.h / r.w) * width;
    return { data: r.data, w: width, h };
  };
  const startSection = (title, min = 230) => {
    if (y + min > H - 46) newPage(); else y += 8;
    band(title);
  };
  const fmtCell = (it, cell) => {
    const out = [];
    if (it.type === 'multi') (cell.v || []).forEach((o) => { const [t, d] = LEAK_DETAILS[o] ?? [`Leak from ${o.toLowerCase()}`, '']; out.push({ b: true, t, d }); });
    if (it.type === 'panel') {
      if (cell.v && cell.v !== 'Original') out.push({ b: true, t: cell.v });
      if (cell.defects?.length) out.push({ b: true, t: cell.defects.map((d) => DEFECTS.find((x) => x[0] === d)?.[1] ?? d).join(', ') });
      if (cell.micron) out.push({ b: false, t: `Paint thickness: ${cell.micron} µm` });
    }
    if (it.type === 'select' && gradeItem(it, cell) === 'fail') out.push({ b: true, t: String(cell.v) });
    const chosen = it.type === 'pf' || it.type === 'select' ? (cell.defects ?? []) : [];
    chosen.forEach((label) => { const def = (it.defects ?? []).find((d) => findingLabel(d) === label); out.push({ b: true, t: label, d: def ? findingDescription(def) : '' }); });
    if (cell.note) out.push(chosen.length ? { h: 'Additional comments', t: cell.note } : { b: true, t: cell.note });
    return out;
  };
  // 'pass' | 'na' | 'fail' pill on the right edge, its top at `top`
  const statusPill = (kind, top) => {
    const lab = kind === 'pass' ? 'Pass' : kind === 'fail' ? 'Defect' : 'N/A';
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const w = doc.getTextWidth(lab) + 38; const x0 = M + CW - 4 - w;
    fill(doc, kind === 'pass' ? [67, 160, 71] : kind === 'fail' ? RED : [110, 118, 120]); doc.roundedRect(x0, top, w, 22, 11, 11, 'F');
    doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.9); doc.circle(x0 + 13, top + 11, 5, 'S');
    if (kind === 'pass') { doc.line(x0 + 10.6, top + 11, x0 + 12.4, top + 13); doc.line(x0 + 12.4, top + 13, x0 + 15.6, top + 9); }
    else if (kind === 'fail') { doc.line(x0 + 13, top + 8, x0 + 13, top + 11.4); doc.setFillColor(255, 255, 255); doc.circle(x0 + 13, top + 13.2, 0.55, 'F'); }
    textColor(doc, [255, 255, 255]); doc.text(lab, x0 + 22, top + 14);
  };
  const passRow = (label, kind) => {
    ensure(36);
    iconAt(kind === 'pass' ? 'pass' : 'na', M + 10, y + 12);
    textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(label, M + 26, y + 16, { maxWidth: CW - 130 });
    statusPill(kind, y + 3);
    y += 36;
  };
  // stack-of-pages placeholder for an uploaded PDF
  const docIcon = (x, yy, size = 90) => {
    const k = size / 90;
    [[BAND, 0, 8], [[160, 180, 188], 10, 4], [[216, 230, 236], 22, 0]].forEach(([c, dx, dy]) => { fill(doc, c); doc.roundedRect(x + dx * k, yy + dy * k, 56 * k, 76 * k, 3, 3, 'F'); });
    doc.setDrawColor(150, 172, 180); doc.setLineWidth(2 * k); [22, 34, 46, 58].forEach((o) => doc.line(x + 36 * k, yy + o * k, x + 66 * k, yy + o * k));
  };
  // grey card: optional 3-col info grid, pass / defect rows, finding lines, rounded photos (PDFs show a document icon)
  const prepLine = (l) => {
    if (l.h) return { kind: 'h', head: l.h, body: wrapTxt(l.t, CW - 24, 8) };
    if (l.d) {
      doc.setFont('helvetica', 'bold'); doc.setFontSize(8);
      const title = `${l.t} - `; const tw = doc.getTextWidth(title);
      const first = wrapTxt(l.d, CW - 24 - tw, 8)[0] ?? '';
      const rest = l.d.slice(first.length).trim();
      return { kind: 'rich', title, first, rest: rest ? wrapTxt(rest, CW - 24, 8) : [] };
    }
    return { kind: 'plain', b: l.b, ls: wrapTxt(l.t, CW - 24, 8, l.b ? 'bold' : 'normal') };
  };
  const lineHeight = (p) => (p.kind === 'h' ? (1 + p.body.length) * 11 + 7 : p.kind === 'rich' ? (1 + p.rest.length) * 11 + 7 : p.ls.length * 11 + 7);
  const card = async ({ title, kind, info = [], rows = [], lines = [], pics = [], paren = false, pill = false, noIcon = false }) => {
    const prepped = (await Promise.all(pics.map((p) => (p.startsWith('data:application/pdf') ? { pdf: true } : thumb(p))))).filter(Boolean);
    const wrapped = lines.map(prepLine);
    const infoRows = Math.ceil(info.length / 3);
    const linesH = wrapped.reduce((a, l) => a + lineHeight(l), 0);
    const picRows = Math.ceil(prepped.length / 4);
    const hasBody = info.length || rows.length || wrapped.length || prepped.length;
    const bodyH = hasBody ? 12 + infoRows * 38 + rows.length * 34 + linesH + (picRows ? picRows * 121 + 2 : 0) + 6 : 0;
    ensure(30 + bodyH);
    if (!noIcon) iconAt(kind, M + 10, y + 10);
    textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(paren ? `(${title})` : title, noIcon ? M + 6 : M + 26, y + 14, { maxWidth: CW - 130 });
    if (pill && kind !== 'fail') statusPill(kind, y - 1);
    y += 26;
    if (!hasBody) { y += 8; return; }
    fill(doc, CARD); doc.roundedRect(M, y, CW, bodyH, 6, 6, 'F');
    let yy = y + 12;
    info.forEach((it, i) => {
      const x = M + 14 + (i % 3) * (CW / 3);
      const yr = yy + Math.floor(i / 3) * 38;
      textColor(doc, GREY); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.text(`${it.label}:`, x, yr + 9, { maxWidth: CW / 3 - 12 });
      textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text(String(it.value), x, yr + 24, { maxWidth: CW / 3 - 12 });
    });
    yy += infoRows * 38;
    rows.forEach((r) => {
      iconAt(r.kind === 'pass' ? 'pass' : r.kind === 'fail' ? 'fail' : 'na', M + 22, yy + 12);
      textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text(r.label, M + 38, yy + 16, { maxWidth: CW - 160 });
      statusPill(r.kind, yy + 1);
      yy += 34;
    });
    wrapped.forEach((l) => {
      if (l.kind === 'h') {
        textColor(doc, SLATE); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text(l.head, M + 14, yy + 8); yy += 11;
        doc.setFont('helvetica', 'normal'); l.body.forEach((ln) => { doc.text(ln, M + 14, yy + 8); yy += 11; });
      } else if (l.kind === 'rich') {
        textColor(doc, SLATE); doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.text(l.title, M + 14, yy + 8);
        const tw = doc.getTextWidth(l.title);
        textColor(doc, GREY); doc.setFont('helvetica', 'normal'); doc.text(l.first, M + 14 + tw, yy + 8); yy += 11;
        l.rest.forEach((ln) => { doc.text(ln, M + 14, yy + 8); yy += 11; });
      } else {
        textColor(doc, l.b ? SLATE : GREY); doc.setFont('helvetica', l.b ? 'bold' : 'normal'); doc.setFontSize(8);
        l.ls.forEach((ln) => { doc.text(ln, M + 14, yy + 8); yy += 11; });
      }
      yy += 7;
    });
    prepped.forEach((p, i) => {
      const px = M + 14 + (i % 4) * 121; const py = yy + 4 + Math.floor(i / 4) * 121;
      if (p.pdf) docIcon(px + 12, py + 10, 90); else doc.addImage(p.data, 'PNG', px, py, 113, 113);
    });
    y += bodyH + 14;
  };
  // titled grey block for uploaded reports (images and PDFs)
  const fileBlock = async (title, srcs) => {
    if (!srcs.length) return;
    textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
    ensure(40); doc.text(title, M + 6, y + 10); y += 18;
    const prepped = (await Promise.all(srcs.map((p) => (p.startsWith('data:application/pdf') ? { pdf: true } : thumb(p))))).filter(Boolean);
    const rowsN = Math.ceil(prepped.length / 4); const h = rowsN * 121 + 16;
    ensure(h + 8);
    fill(doc, CARD); doc.rect(M, y, CW, h, 'F');
    prepped.forEach((p, i) => { const px = M + 10 + (i % 4) * 121; const py = y + 8 + Math.floor(i / 4) * 121; if (p.pdf) docIcon(px + 4, py + 4, 100); else doc.addImage(p.data, 'PNG', px, py, 113, 113); });
    y += h + 14;
  };
  const gradeOf = (it, cell) => gradeItem(it, cell);
  const worst = (arr) => (arr.includes('fail') ? 'fail' : arr.includes('pass') ? 'pass' : arr.length ? 'na' : null);

  // one graded item: pass/N-A rows stay compact; defects become cards
  const itemRow = async (it, cell) => {
    const g = gradeOf(it, cell);
    if (!g) return;
    if (g === 'fail') await card({ title: it.label, kind: 'fail', lines: fmtCell(it, cell), pics: cell.photos ?? [] });
    else passRow(it.label, g);
  };

  // legend pills
  const legend = (entries, size = 8) => {
    ensure(40);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(size);
    const ws = entries.map(([l]) => doc.getTextWidth(l) + 22);
    const total = ws.reduce((a, b) => a + b, 0) + (entries.length - 1) * 7;
    let x = W / 2 - total / 2;
    entries.forEach(([l, col], i) => {
      fill(doc, col); doc.roundedRect(x, y, ws[i], 20, 10, 10, 'F');
      textColor(doc, col === YELLOW || col === PEACH ? INK : [255, 255, 255]); doc.text(l, x + ws[i] / 2, y + 13, { align: 'center' });
      x += ws[i] + 7;
    });
    y += 34;
  };
  // "n: name" in three columns
  const numbered = (items) => {
    doc.setFontSize(8.5);
    const per = Math.ceil(items.length / 3); const colW = CW / 3;
    ensure(per * 12 + 14);
    items.forEach((it, i) => {
      const x = M + 6 + Math.floor(i / per) * colW; const yy = y + (i % per) * 12;
      textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.text(String(it.no), x, yy + 8);
      textColor(doc, SLATE); doc.setFont('helvetica', 'normal'); doc.text(`: ${it.label}`, x + String(it.no).length * 5 + 1, yy + 8, { maxWidth: colW - 24 });
    });
    y += per * 12 + 14;
  };
  const place = async (svgUrl, maxW = 470) => {
    const d = await diagram(svgUrl, maxW);
    ensure(d.h + 10);
    doc.addImage(d.data, 'JPEG', W / 2 - d.w / 2, y, d.w, d.h);
    y += d.h + 12;
  };
  const infoItems = (its, cells) => its.filter((it) => !isGradedType(it) && isAnswered(cells[it.id])).map((it) => ({ label: it.label, value: cells[it.id].v === 'Other' && cells[it.id].other ? cells[it.id].other : cells[it.id].v }));

  const WHEEL_CODE = /\((\w\w)\)/;
  const renderGeneric = async (s) => {
    const cells = data[s.id] ?? {};
    const subs = [...new Set(s.items.map((i) => i.sub ?? ''))];
    for (const subName of subs) {
      const its = s.items.filter((i) => (i.sub ?? '') === subName);
      const groups = [...new Set(its.filter((i) => i.group).map((i) => i.group))];
      if (subName) {
        ensure(groups.length && ['Tyres', 'Rims', 'Brakes'].includes(subName) ? 190 : 60);
        fill(doc, BAND); doc.roundedRect(M, y, CW, 28, 5, 5, 'F');   // every heading bar spans the full content width
        textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text(subName, M + 12, y + 18);
        y += 36;
        if (groups.length && ['Tyres', 'Rims', 'Brakes'].includes(subName)) {
          const states = {};
          groups.forEach((g) => {
            const code = WHEEL_CODE.exec(g)?.[1]; if (!code) return;
            const gr = worst(its.filter((i) => i.group === g).map((i) => gradeOf(i, cells[i.id])).filter(Boolean));
            states[code] = gr === 'fail' ? 'bad' : gr === 'na' ? 'na' : 'ok';
          });
          const d = await diagram(wheelDiagram(states, groups.length > 4), 195);   // the reference draws this picture about 195pt wide
          ensure(d.h + 8);
          doc.addImage(d.data, 'JPEG', W / 2 - d.w / 2, y, d.w, d.h);
          y += d.h + 8;
        }
      }
      for (const g of groups) {
        const block = its.filter((i) => i.group === g);
        const gradedIts = block.filter(isGradedType);
        const gs = worst(gradedIts.map((i) => gradeOf(i, cells[i.id])).filter(Boolean));
        const lines = []; const pics = [];
        const asRows = subName === 'Brakes';   // pads and disc are listed inside the brake card, each with its own pill
        gradedIts.forEach((i) => {
          const c = cells[i.id];
          if (gradeOf(i, c) === 'fail') {
            const fl = fmtCell(i, c);
            if (asRows && fl[0]) fl[0] = { ...fl[0], t: `${i.label}: ${fl[0].t}` };
            fl.forEach((l) => lines.push(l)); (c.photos ?? []).forEach((p) => pics.push(p));
          }
        });
        const rows = asRows ? gradedIts.map((i) => ({ label: i.label.split(' / ')[0].toUpperCase(), kind: gradeOf(i, cells[i.id]) ?? 'na' })) : [];
        await card({ title: g, kind: gs === 'fail' ? 'fail' : gs === 'na' ? 'na' : 'pass', info: infoItems(block, cells), rows, lines, pics, pill: true });
      }
      const loose = its.filter((i) => !i.group);
      const looseInfo = infoItems(loose, cells);
      for (const it of loose) {
        if (it.type === 'files') await fileBlock(it.label, cells[it.id]?.photos ?? []);
        else if (isGradedType(it)) await itemRow(it, cells[it.id]);
      }
      if (looseInfo.length) {
        const rows = Math.ceil(looseInfo.length / 3);
        ensure(rows * 38 + 24);
        fill(doc, CARD); doc.roundedRect(M, y, CW, rows * 38 + 16, 6, 6, 'F');
        looseInfo.forEach((it, i) => {
          const x = M + 14 + (i % 3) * (CW / 3); const yr = y + 8 + Math.floor(i / 3) * 38;
          textColor(doc, GREY); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); doc.text(`${it.label}:`, x, yr + 9, { maxWidth: CW / 3 - 12 });
          textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text(String(it.value), x, yr + 24, { maxWidth: CW / 3 - 12 });
        });
        y += rows * 38 + 28;
      }
    }
  };

  /* ---------- sections ---------- */
  y += 0;
  for (const s of sections) {
    if (s.id === 'summary') continue;
    const cells = data[s.id] ?? {};
    if (s.id === 'interior') {
      startSection(s.title, 360);
      const items = s.items.map((it, i) => ({ ...it, no: i + 1 }));
      const states = {}; items.forEach((it) => { const g = gradeOf(it, cells[it.id]); states[it.no] = g === 'fail' ? 'bad' : g === 'na' ? 'na' : 'ok'; });
      await place(interiorDiagram(states), 270);     // sizes measured from the reference report
      numbered(items.map((it) => ({ no: it.no, label: INTERIOR_PARTS[it.no - 1] })));
      legend([['N/A', YELLOW], ['Damaged', RED], ['Checked', [17, 17, 17]]], 8.5);
      for (const it of items) { const c = cells[it.id]; if (gradeOf(it, c) === 'fail') await card({ title: it.label, kind: 'fail', paren: true, lines: fmtCell(it, c), pics: c.photos ?? [] }); }
    } else if (s.id === 'chassis') {
      startSection(s.title, 360);
      const states = {}; s.items.forEach((it, i) => { const v2 = cells[it.id]?.v; states[i + 1] = v2 === 'Damaged' ? 'bad' : v2 === 'Repaired' ? 'na' : 'ok'; });
      await place(chassisDiagram(states), 292);
      numbered(s.items.map((it, i) => ({ no: i + 1, label: it.label })));
      legend([['Repaired', YELLOW], ['Damaged', RED], ['Checked', [17, 17, 17]]], 8.5);
      for (const it of s.items) { const c = cells[it.id]; if (c?.v === 'Damaged' || c?.v === 'Repaired') await card({ title: it.label, kind: 'fail', paren: true, lines: fmtCell(it, c), pics: c.photos ?? [] }); }
    } else if (s.id === 'exterior') {
      startSection(s.title, 360);
      await place(exteriorDiagram(cells), 135);
      legend([['Accident Paint', RED], ['Cosmetic Paint', YELLOW], ['Faded Paint', PEACH], ['SH: Scratch', [17, 17, 17]], ['CP: Chip', [17, 17, 17]], ['DT: Dent', [17, 17, 17]], ['CK: Crack', [17, 17, 17]]], 7.5);
      for (const it of s.items) {
        const c = cells[it.id];
        if (!c?.photos?.length && !c?.note) continue;      // paint state and damage marks are on the diagram above
        const extra = [];
        if (c.micron) extra.push({ b: false, t: `Paint thickness: ${c.micron} µm` });
        if (c.note) extra.push({ h: 'Additional comments', t: c.note });
        await card({ title: it.label, kind: 'pass', noIcon: true, paren: true, lines: extra, pics: c.photos ?? [] });
      }
    } else {
      startSection(s.title, 200);
      await renderGeneric(s);
      if (s.id === 'diagnostics') {
        const dp = photos.filter((p) => p.category === 'Diagnostics');
        if (dp.length) await card({ title: 'Scan reports', kind: 'pass', pics: dp.map((p) => p.src) });
      }
    }
  }

  /* ---------- general photos ---------- */
  const gallery = ['Exterior', 'Interior', 'Engine Bay & Undercarriage'];
  if (gallery.some((c) => photos.some((p) => p.category === c))) {
    startSection('General Photos', 200);
    for (const cat of gallery) {
      const ps = photos.filter((p) => p.category === cat);
      if (!ps.length) continue;
      ensure(150);
      textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text(cat, M + 6, y + 10); y += 22;
      const prepped = (await Promise.all(ps.map((p) => thumb(p.src)))).filter(Boolean);
      for (let i = 0; i < prepped.length; i += 4) {
        ensure(125);
        prepped.slice(i, i + 4).forEach((p, k) => doc.addImage(p.data, 'PNG', M + 6 + k * 128, y, 120, 120));
        y += 128;
      }
      y += 8;
    }
  }

  /* ---------- summary of findings: verdict + every failed check ---------- */
  startSection('Summary of Findings', 160);
  {
    const TONE = { green: GREEN, blue: [46, 110, 200], amber: [245, 160, 0], red: RED };
    const vt = TONE[v.tone] ?? GREY;
    const vl = wrapTxt(v.text, CW - 40, 9.5);
    ensure(70);
    fill(doc, CARD); doc.roundedRect(M, y, CW, 58, 6, 6, 'F');
    fill(doc, vt); doc.roundedRect(M, y, 5, 58, 2, 2, 'F');
    textColor(doc, vt); doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.text(`Verdict: ${v.label}`, M + 16, y + 22);
    textColor(doc, SLATE); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5); vl.forEach((l, i) => doc.text(l, M + 16, y + 38 + i * 12));
    y += 58 + 12;

    const issues = [];
    for (const s of sections) {
      if (s.id === 'summary') continue;
      for (const it of s.items) {
        const c = data[s.id]?.[it.id];
        if (gradeOf(it, c) !== 'fail') continue;
        const detail = fmtCell(it, c).map((l) => l.t).filter(Boolean);
        issues.push(`${s.title}: ${it.group ? `${it.group} – ` : ''}${it.label}${detail.length ? ` (${detail.join('; ')})` : ''}`);
      }
    }
    if (!issues.length) {
      ensure(20); textColor(doc, GREEN); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('No defects found.', M + 6, y + 10); y += 24;
    } else {
      sub(`Key findings (${issues.length} defect${issues.length > 1 ? 's' : ''})`);
      const SHOW = 20;
      issues.slice(0, SHOW).forEach((t) => {
        const ls = wrapTxt(`•  ${t}`, CW - 28, 9);
        ls.forEach((l, i) => {
          ensure(14);
          textColor(doc, SLATE); doc.setFont('helvetica', i ? 'normal' : 'bold'); doc.setFontSize(9); doc.text(l, M + 14 + (i ? 9 : 0), y + 8);
          y += 12;
        });
        y += 3;
      });
      if (issues.length > SHOW) { ensure(16); textColor(doc, GREY); doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.text(`+ ${issues.length - SHOW} more defects – see the sections above.`, M + 14, y + 8); y += 16; }
    }
    y += 10;
  }

  /* ---------- inspector comment ---------- */
  startSection('Inspector Comment', 180);
  {
    const cl = wrapTxt(inspection.comment || 'No additional comments.', CW - 28, 9.5);
    const other = photos.filter((p) => p.category === 'Other');
    const op = (await Promise.all(other.map((p) => thumb(p.src)))).filter(Boolean);
    const h = 40 + cl.length * 13 + (op.length ? Math.ceil(op.length / 4) * 121 + 24 : 0);
    ensure(h);
    fill(doc, CARD); doc.roundedRect(M, y, CW, h, 6, 6, 'F');
    textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.text('Comment', M + 14, y + 22);
    textColor(doc, SLATE); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
    cl.forEach((l, i) => doc.text(l, M + 14, y + 40 + i * 13));
    let py = y + 46 + cl.length * 13;
    if (op.length) { textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text('Photos and Files', M + 14, py - 4); op.forEach((p, i) => doc.addImage(p.data, 'PNG', M + 14 + (i % 4) * 121, py + Math.floor(i / 4) * 121, 113, 113)); }
    y += h + 10;
    textColor(doc, INDIGO); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    ensure(20); doc.text(`Inspected by ${inspector?.name ?? '—'}  ·  ${fmtDateTime(inspection.completedAt ?? inspection.updatedAt)}  ·  Customer: ${customer?.name ?? '—'}`, M + 6, y + 8);
    y += 22;
  }

  /* ---------- disclaimer (full-width grey card, text wraps the whole width) ---------- */
  {
    const body = DISCLAIMER.map(([t, b]) => ({ t, ls: b ? wrapTxt(b, CW - 28, 8.5) : [] }));   // headings have no text lines
    const h = body.reduce((a, d) => a + (d.ls.length ? 24 + d.ls.length * 11.5 : 23), 0) + 22;
    if (y + 60 + h > H - 46) newPage(); else y += 8;
    band('Disclaimer');
    ensure(h);
    fill(doc, CARD); doc.roundedRect(M, y, CW, h, 6, 6, 'F');
    let dy = y + 22;
    body.forEach((d) => {
      if (!d.ls.length) dy += 8;                       // open space above a group heading, so it reads as the start of the next clause
      textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(d.t, M + 14, dy); dy += d.ls.length ? 13 : 15;
      if (!d.ls.length) return;
      textColor(doc, SLATE); doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
      d.ls.forEach((ln) => { doc.text(ln, M + 14, dy); dy += 11.5; });
      dy += 10;
    });
    y += h + 10;
  }

  /* ---------- footers ---------- */
  const pages = doc.getNumberOfPages();
  for (let i = 2; i <= pages; i++) {
    doc.setPage(i);
    fill(doc, ORANGE); doc.roundedRect(M, H - 38, 18, 18, 5, 5, 'F');
    textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5);
    doc.text('Get interactive report through our website', M + 26, H - 26);
    doc.text(`${i}/${pages}`, W - M, H - 26, { align: 'right' });
  }
  return doc;
}

export async function downloadReport(args) {
  const doc = await generateReportPDF(args);
  doc.save(`CarInspectO-Report-${args.booking.id}.pdf`);
}
