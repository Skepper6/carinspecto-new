import { sectionsForPlan, itemTotals, gradeItem, isGradedType, isAnswered, verdict, PANELS, DEFECTS, INTERIOR_PARTS } from './inspectionSchema';
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

const DISCLAIMER = [
  ['1. Nature of the inspection', 'This report is based on a visual, non-invasive assessment of the vehicle at the date and time of inspection, together with the diagnostic checks listed. It reflects the inspector\'s findings to the best of their ability and is not a guarantee, warranty or valuation of the vehicle.'],
  ['2. Limits of the report', 'Some conditions cannot be detected without dismantling the vehicle or may develop after the inspection. Car InspectO is not liable for defects that were concealed, not accessible, or not present at the time of inspection.'],
  ['3. Who may rely on this report', 'The report is prepared for the customer who booked the inspection. Any other person relying on it does so at their own risk. Differences in professional opinion about the condition of a vehicle may exist.'],
  ['4. Owner consent', 'The vehicle owner or their representative allowed the inspection and the inspector to test-drive the vehicle where applicable. Car InspectO has no contractual obligation to the seller or any third party.'],
  ['5. Disputes', 'Any disagreement about the findings should first be raised with Car InspectO support so that it can be reviewed in good faith. Liability, where established, is limited to the fee paid for the inspection.'],
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
    if (logo) doc.addImage(logo.data, 'PNG', M, 14, 34 * logo.ratio, 34);
    else { textColor(doc, INDIGO); doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.text(COMPANY.name, M, 38); }
    textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('Vehicle', W - M, 28, { align: 'right' });
    doc.text('Inspection Report', W - M, 39, { align: 'right' });
    y = 66;
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
    fill(doc, BAND); doc.roundedRect(M, y, 110, 24, 4, 4, 'F');
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
  const coverPhoto = photos.find((p) => p.category === COVER) ?? photos.find((p) => p.category === 'Exterior');
  const coverSrc = coverPhoto?.src ?? carCoverArt();
  const cover = await prep(coverSrc, W / 560, 900);
  fill(doc, [18, 11, 58]); doc.rect(0, 0, W, H, 'F');
  if (cover) doc.addImage(cover.data, 'JPEG', 0, 0, W + 1, 560);
  if (logo) {
    fill(doc, [255, 255, 255]); doc.roundedRect(30, 26, 34 * logo.ratio + 22, 52, 12, 12, 'F');
    doc.addImage(logo.data, 'PNG', 41, 34, 34 * logo.ratio, 34);
  }
  fill(doc, [255, 255, 255]); doc.roundedRect(60, 610, W - 120, 190, 16, 16, 'F');
  fill(doc, ORANGE); doc.rect(60, 610, W - 120, 5, 'F');
  textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(21);
  doc.text('Vehicle Inspection', W / 2, 655, { align: 'center' }); doc.text('Report', W / 2, 681, { align: 'center' });
  doc.setDrawColor(40, 40, 60); doc.setLineWidth(0.8); doc.line(84, 700, W - 84, 700);
  [['Telephone', COMPANY.phone], ['Email', COMPANY.email], ['Website', COMPANY.web]].forEach(([k, val], i) => {
    const cx = 60 + (W - 120) * (0.17 + i * 0.33);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(k, cx, 722, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.text(val, cx, 738, { align: 'center' });
  });
  doc.line(84, 752, W - 84, 752);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text(`Report ${booking.id}  ·  ${carName(booking.car)}`, W / 2, 773, { align: 'center' });
  textColor(doc, GREY); doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(`Powered by ${COMPANY.name}`, W / 2, 788, { align: 'center' });

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
  doc.text(carName(booking.car), left + pw / 2, ly, { align: 'center' });
  textColor(doc, GREY); doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5);
  doc.text(`Verified by ${COMPANY.name}`, left + pw / 2, ly + 14, { align: 'center' });
  ly += 44;
  [['Date', fmtDate(booking.date, { year: 'numeric', month: '2-digit', day: '2-digit' })], ['Time', fmtTime(booking.time)], ['Inspection type', `${plan.name} (${plan.checkpoints} checkpoints)`], ['VIN number', sv('vin') || '—']].forEach(([k, val]) => {
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
  ry += 112;
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
    const r = await rasterize(svgUrl, 1200, null, 0.95);
    const h = (r.h / r.w) * width;
    return { data: r.data, w: width, h };
  };
  const startSection = (title, min = 230) => {
    if (y + min > H - 46) newPage(); else y += 8;
    band(title);
  };
  const fmtCell = (it, cell) => {
    const out = [];
    if (it.type === 'multi') (cell.v || []).forEach((o) => out.push({ b: true, t: `Leak from ${o.toLowerCase()}` }));
    if (it.type === 'panel') {
      if (cell.v && cell.v !== 'Original') out.push({ b: true, t: cell.v });
      if (cell.defects?.length) out.push({ b: true, t: cell.defects.map((d) => DEFECTS.find((x) => x[0] === d)?.[1] ?? d).join(', ') });
      if (cell.micron) out.push({ b: false, t: `Paint thickness: ${cell.micron} µm` });
    }
    if (it.type === 'select' && gradeItem(it, cell) === 'fail') out.push({ b: true, t: String(cell.v) });
    if (cell.note) out.push({ b: true, t: cell.note });
    return out;
  };
  const passRow = (label, kind) => {
    ensure(36);
    iconAt(kind === 'pass' ? 'pass' : 'na', M + 10, y + 12);
    textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(label, M + 26, y + 16, { maxWidth: CW - 130 });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const lab = kind === 'pass' ? 'Pass' : 'N/A';
    const w = doc.getTextWidth(lab) + 38;
    fill(doc, kind === 'pass' ? [67, 160, 71] : [110, 118, 120]); doc.roundedRect(M + CW - 4 - w, y + 3, w, 22, 11, 11, 'F');
    doc.setDrawColor(255, 255, 255); doc.setLineWidth(0.9); doc.circle(M + CW - 4 - w + 13, y + 14, 5, 'S');
    if (kind === 'pass') { doc.line(M + CW - 4 - w + 10.6, y + 14, M + CW - 4 - w + 12.4, y + 16); doc.line(M + CW - 4 - w + 12.4, y + 16, M + CW - 4 - w + 15.6, y + 12); }
    textColor(doc, [255, 255, 255]); doc.text(lab, M + CW - 4 - w + 22, y + 17);
    y += 36;
  };
  // grey card: optional 3-col info grid, note lines, rounded photos
  const card = async ({ title, kind, info = [], lines = [], pics = [], paren = false }) => {
    const prepped = (await Promise.all(pics.map((p) => thumb(p)))).filter(Boolean);
    const wrapped = lines.map((l) => ({ b: l.b, ls: wrapTxt(l.t, CW - 24, 8, l.b ? 'bold' : 'normal') }));
    const infoRows = Math.ceil(info.length / 3);
    const linesH = wrapped.reduce((a, l) => a + l.ls.length * 11 + 7, 0);
    const picRows = Math.ceil(prepped.length / 4);
    const hasBody = info.length || wrapped.length || prepped.length;
    const bodyH = hasBody ? 12 + infoRows * 38 + linesH + (picRows ? picRows * 121 + 2 : 0) + 6 : 0;
    ensure(30 + bodyH);
    iconAt(kind, M + 10, y + 10);
    textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.text(paren ? `(${title})` : title, M + 26, y + 14, { maxWidth: CW - 40 });
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
    wrapped.forEach((l) => {
      textColor(doc, l.b ? SLATE : GREY); doc.setFont('helvetica', l.b ? 'bold' : 'normal'); doc.setFontSize(8);
      l.ls.forEach((ln) => { doc.text(ln, M + 14, yy + 8); yy += 11; });
      yy += 7;
    });
    prepped.forEach((p, i) => doc.addImage(p.data, 'PNG', M + 14 + (i % 4) * 121, yy + 4 + Math.floor(i / 4) * 121, 113, 113));
    y += bodyH + 14;
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
        fill(doc, BAND); doc.roundedRect(M, y, 78, 28, 5, 5, 'F');
        textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5); doc.text(subName, M + 12, y + 18);
        if (groups.length && ['Tyres', 'Rims', 'Brakes'].includes(subName)) {
          const states = {};
          groups.forEach((g) => {
            const code = WHEEL_CODE.exec(g)?.[1]; if (!code) return;
            const gr = worst(its.filter((i) => i.group === g).map((i) => gradeOf(i, cells[i.id])).filter(Boolean));
            states[code] = gr === 'fail' ? 'bad' : gr === 'na' ? 'na' : 'ok';
          });
          const d = await diagram(wheelDiagram(states, groups.length > 4), 270);
          doc.addImage(d.data, 'JPEG', W / 2 - 135, y - 4, d.w, d.h);
          y += d.h + 6;
        } else y += 40;
      }
      for (const g of groups) {
        const block = its.filter((i) => i.group === g);
        const gradedIts = block.filter(isGradedType);
        const gs = worst(gradedIts.map((i) => gradeOf(i, cells[i.id])).filter(Boolean));
        const lines = []; const pics = [];
        gradedIts.forEach((i) => { const c = cells[i.id]; if (gradeOf(i, c) === 'fail') { fmtCell(i, c).forEach((l) => lines.push(l)); (c.photos ?? []).forEach((p) => pics.push(p)); } });
        await card({ title: g, kind: gs === 'fail' ? 'fail' : gs === 'na' ? 'na' : 'pass', info: infoItems(block, cells), lines, pics });
      }
      const loose = its.filter((i) => !i.group);
      const looseInfo = infoItems(loose, cells);
      for (const it of loose.filter(isGradedType)) await itemRow(it, cells[it.id]);
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
      await place(interiorDiagram(states), 480);
      numbered(items.map((it) => ({ no: it.no, label: INTERIOR_PARTS[it.no - 1] })));
      legend([['N/A', YELLOW], ['Damaged', RED], ['Checked', [17, 17, 17]]], 8.5);
      for (const it of items) { const c = cells[it.id]; if (gradeOf(it, c) === 'fail') await card({ title: it.label, kind: 'fail', paren: true, lines: fmtCell(it, c), pics: c.photos ?? [] }); }
    } else if (s.id === 'chassis') {
      startSection(s.title, 360);
      const states = {}; s.items.forEach((it, i) => { const v2 = cells[it.id]?.v; states[i + 1] = v2 === 'Damaged' ? 'bad' : v2 === 'Repaired' ? 'na' : 'ok'; });
      await place(chassisDiagram(states), 480);
      numbered(s.items.map((it, i) => ({ no: i + 1, label: it.label })));
      legend([['Repaired', YELLOW], ['Damaged', RED], ['Checked', [17, 17, 17]]], 8.5);
      for (const it of s.items) { const c = cells[it.id]; if (c?.v === 'Damaged' || c?.v === 'Repaired') await card({ title: it.label, kind: 'fail', paren: true, lines: c.note ? [{ b: true, t: c.note }] : [{ b: true, t: String(c.v) }], pics: c.photos ?? [] }); }
    } else if (s.id === 'exterior') {
      startSection(s.title, 360);
      await place(exteriorDiagram(cells), 440);
      legend([['Accident Paint', RED], ['Cosmetic Paint', YELLOW], ['Faded Paint', PEACH], ['SH: Scratch', [17, 17, 17]], ['CP: Chip', [17, 17, 17]], ['DT: Dent', [17, 17, 17]], ['CK: Crack', [17, 17, 17]]], 7.5);
      for (const it of s.items) { const c = cells[it.id]; if (gradeOf(it, c) === 'fail' || c?.photos?.length) await card({ title: it.label, kind: 'fail', paren: true, lines: fmtCell(it, c), pics: c.photos ?? [] }); }
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
    const body = DISCLAIMER.map(([t, b]) => ({ t, ls: wrapTxt(b, CW - 28, 8.5) }));
    const h = body.reduce((a, d) => a + 24 + d.ls.length * 11.5, 0) + 22;
    if (y + 60 + h > H - 46) newPage(); else y += 8;
    band('Disclaimer');
    ensure(h);
    fill(doc, CARD); doc.roundedRect(M, y, CW, h, 6, 6, 'F');
    let dy = y + 22;
    body.forEach((d) => {
      textColor(doc, INK); doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5); doc.text(d.t, M + 14, dy); dy += 13;
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
    doc.text(`Get your interactive report at ${COMPANY.web}`, M + 26, H - 26);
    doc.text(`${i}/${pages}`, W - M, H - 26, { align: 'right' });
  }
  return doc;
}

export async function downloadReport(args) {
  const doc = await generateReportPDF(args);
  doc.save(`CarInspectO-Report-${args.booking.id}.pdf`);
}
