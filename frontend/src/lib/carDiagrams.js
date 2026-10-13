// Report diagrams (wheels, interior, body paint, chassis). The line art is the reference report's own artwork stored in
// /public/diagrams (clean: no markers, no paint); the numbered markers, paint colours and damage codes are drawn on top
// from each inspection's data. Every function resolves to a PNG data URL that the PDF embeds.

const DIR = '/diagrams/';
const imgCache = new Map();
const loadImage = (name) => {
  if (!imgCache.has(name)) {
    imgCache.set(name, new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Could not load diagram ${name}`));
      img.src = `${DIR}${name}.png`;
    }));
  }
  return imgCache.get(name);
};

const FONT = 'Helvetica, Arial, sans-serif';
const MARK = { ok: '#111111', bad: '#e51919', na: '#ffd633' };
const PAINT = { Original: null, 'Cosmetic paint': '#ffd633', 'Faded paint': '#ffcda0', 'Accident paint': '#e51919' };

async function canvasFor(name) {
  const img = await loadImage(name);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
  return { c, ctx, img };
}

function disc(ctx, x, y, r, fill, label, ink = '#fff', size = r * 1.05) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  ctx.fillStyle = ink; ctx.font = `600 ${size}px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(String(label), x, y + size * 0.04);
}

/* ---------------- interior (14 parts, top view; front of the car points right) ---------------- */
const INTERIOR_AT = {
  1: [124, 74], 2: [428, 440], 3: [320, 436], 4: [329, 94], 5: [362, 54], 6: [26, 94], 7: [291, 74],
  8: [475, 75], 9: [414, 64], 10: [201, 74], 11: [541, 94], 12: [22, 444], 13: [255, 94], 14: [190, 426],
};
export async function interiorDiagram(states) {
  const { c, ctx, img } = await canvasFor('interior');
  ctx.drawImage(img, 0, 0);
  Object.entries(INTERIOR_AT).forEach(([n, [x, y]]) => {
    const st = states[n] ?? 'ok';
    disc(ctx, x, y, 20, MARK[st] ?? MARK.ok, n, st === 'na' ? '#1d1d2b' : '#fff');
  });
  return c.toDataURL('image/png');
}

/* ---------------- chassis (22 points) ---------------- */
const CHASSIS_AT = {
  1: [16, 285], 2: [96, 161], 3: [17, 220], 4: [47, 185], 5: [116, 94], 6: [200, 356], 7: [270, 356], 8: [330, 346],
  9: [375, 325], 10: [429, 326], 11: [471, 306], 12: [509, 276], 13: [575, 159], 14: [569, 256], 15: [489, 64],
  16: [559, 84], 17: [440, 65], 18: [369, 44], 19: [270, 64], 20: [210, 64], 21: [325, 64], 22: [182, 130],
};
export async function chassisDiagram(states) {
  const { c, ctx, img } = await canvasFor('chassis');
  ctx.drawImage(img, 0, 0);
  Object.entries(CHASSIS_AT).forEach(([n, [x, y]]) => {
    const st = states[n] ?? 'ok';
    disc(ctx, x, y, 20, MARK[st] ?? MARK.ok, n, st === 'na' ? '#1d1d2b' : '#fff', 21);
  });
  return c.toDataURL('image/png');
}

/* ---------------- wheels (RR, RL, FR, FL and the spare) ---------------- */
const WHEEL_AT = { RL: [249, 31], ST: [128, 70], RR: [31, 160], FL: [489, 220], FR: [309, 359] };
const WHEEL_FILL = { ok: '#43a047', bad: '#e51919', na: '#8a8f98' };
export async function wheelDiagram(states, withSpare = true) {
  const { c, ctx, img } = await canvasFor('wheels');
  ctx.drawImage(img, 0, 0);
  Object.entries(WHEEL_AT).forEach(([code, [x, y]]) => {
    // the spare has no brakes or suspension: shown grey (n/a) there, so no blank patch is left in the drawing
    const st = code === 'ST' && !withSpare ? 'na' : states[code] ?? 'ok';
    disc(ctx, x, y, 26, WHEEL_FILL[st] ?? WHEEL_FILL.ok, code, '#fff', 25);
  });
  return c.toDataURL('image/png');
}

/* ---------------- exterior (paint state per panel + damage codes) ---------------- */
// The sheet is the car opened out, front at the bottom. The left of the sheet is the car's RIGHT side.
const mirror = (pts) => pts.map(([x, y]) => [600 - x, y]);
const SIDE = {
  RearFender: [[30, 178], [105, 168], [138, 330], [140, 357], [40, 357]],
  RearDoor: [[40, 357], [140, 357], [143, 508], [40, 508]],
  FrontDoor: [[40, 508], [143, 508], [147, 645], [40, 610]],
  Fender: [[40, 640], [140, 650], [150, 790], [38, 800]],
};
const PANEL_SHAPE = {
  rearBumper: [[180, 97], [418, 97], [440, 122], [440, 175], [160, 175], [160, 124]],
  trunk: [[232, 176], [368, 176], [425, 335], [172, 335]],
  roof: [[205, 423], [395, 423], [402, 655], [198, 655]],
  bonnet: [[183, 720], [417, 720], [415, 792], [185, 792]],
  frontGrill: [[173, 796], [427, 796], [427, 872], [173, 872]],
  frontBumper: [[173, 873], [427, 873], [427, 905], [173, 905]],
  rRearFender: SIDE.RearFender, rRearDoor: SIDE.RearDoor, rFrontDoor: SIDE.FrontDoor, rFender: SIDE.Fender,
  lRearFender: mirror(SIDE.RearFender), lRearDoor: mirror(SIDE.RearDoor), lFrontDoor: mirror(SIDE.FrontDoor), lFender: mirror(SIDE.Fender),
};
const PANEL_AT = {
  rearBumper: [300, 136], trunk: [300, 255], roof: [300, 540], bonnet: [300, 756], frontGrill: [300, 835], frontBumper: [300, 889],
  rRearFender: [76, 262], rRearDoor: [90, 432], rFrontDoor: [90, 575], rFender: [90, 725],
  lRearFender: [524, 262], lRearDoor: [510, 432], lFrontDoor: [510, 575], lFender: [510, 725],
};
export async function exteriorDiagram(panels) {
  const { c, ctx, img } = await canvasFor('exterior');
  // paint first, then the line art on top (multiply keeps the black lines over any colour)
  Object.entries(PANEL_SHAPE).forEach(([key, pts]) => {
    const colour = PAINT[panels[key]?.v];
    if (!colour) return;
    ctx.beginPath(); pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath();
    ctx.fillStyle = colour; ctx.fill();
  });
  ctx.globalCompositeOperation = 'multiply'; ctx.drawImage(img, 0, 0); ctx.globalCompositeOperation = 'source-over';
  Object.entries(PANEL_AT).forEach(([key, [x, y]]) => {
    const codes = panels[key]?.defects ?? [];
    codes.forEach((code, i) => disc(ctx, x + (i - (codes.length - 1) / 2) * 38, y, 18, '#111', code, '#fff', 17));
  });
  return c.toDataURL('image/png');
}
