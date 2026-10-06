// Image helpers: compression for uploads, placeholder art, rasterising for the PDF and number-plate masking.

const loadImg = (src) => new Promise((resolve, reject) => {
  const img = new Image();
  img.onload = () => resolve(img);
  img.onerror = () => reject(new Error('Could not read image'));
  img.src = src;
});

export function compressImage(file, max = 640, quality = 0.55) {
  const url = URL.createObjectURL(file);
  return loadImg(url).then((img) => {
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale);
    c.height = Math.round(img.height * scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    return c.toDataURL('image/jpeg', quality);
  });
}

export const placeholderPhoto = (rawLabel, hue = 250) => {
  const label = String(rawLabel).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="320"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(${hue},55%,38%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},70%,55%)"/></linearGradient></defs><rect width="480" height="320" fill="url(#g)"/><text x="240" y="170" font-family="sans-serif" font-size="26" font-weight="700" fill="white" text-anchor="middle" opacity=".92">${label}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// Front-view car illustration. The number plate carries the Car InspectO wordmark instead of a registration.
export const carCoverArt = (hue = 235) => {
  const body = `hsl(${hue},45%,92%)`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2a1d6b"/><stop offset="1" stop-color="#120b3a"/></linearGradient>
<linearGradient id="glass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fb4c9"/><stop offset="1" stop-color="#2b4b5f"/></linearGradient></defs>
<rect width="960" height="640" fill="url(#bg)"/>
<ellipse cx="480" cy="560" rx="360" ry="34" fill="#000" opacity=".35"/>
<rect x="150" y="470" width="90" height="120" rx="22" fill="#111"/><rect x="720" y="470" width="90" height="120" rx="22" fill="#111"/>
<path d="M200 330 Q215 190 330 160 L630 160 Q745 190 760 330 Z" fill="${body}"/>
<path d="M255 300 Q270 205 345 185 L615 185 Q690 205 705 300 Z" fill="url(#glass)"/>
<path d="M130 340 Q130 310 190 300 L770 300 Q830 310 830 340 L840 500 Q840 540 800 545 L160 545 Q120 540 120 500 Z" fill="${body}"/>
<ellipse cx="225" cy="380" rx="78" ry="34" fill="#fff"/><ellipse cx="735" cy="380" rx="78" ry="34" fill="#fff"/>
<ellipse cx="225" cy="380" rx="44" ry="20" fill="#dfe8ee"/><ellipse cx="735" cy="380" rx="44" ry="20" fill="#dfe8ee"/>
<rect x="340" y="345" width="280" height="80" rx="16" fill="#1d1d2b"/>
${Array.from({ length: 7 }, (_, i) => `<rect x="${356 + i * 38}" y="357" width="24" height="56" rx="5" fill="#3a3a52"/>`).join('')}
<rect x="170" y="470" width="620" height="60" rx="26" fill="#d6d9e6"/>
<rect x="340" y="448" width="280" height="64" rx="10" fill="#fff" stroke="#1d1d2b" stroke-width="4"/>
<text x="480" y="492" font-family="Georgia,serif" font-style="italic" font-weight="800" font-size="34" text-anchor="middle"><tspan fill="#f58220">Car</tspan><tspan fill="#33237f"> InspectO</tspan></text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

// Rasterise any image source (jpeg/png/svg) into a JPEG sized for the PDF, cropped to `ratio` (w/h) if given.
export async function rasterize(src, maxW = 700, ratio = null, quality = 0.78) {
  const img = await loadImg(src);
  const sw = img.naturalWidth || img.width;
  const sh = img.naturalHeight || img.height;
  let cx = 0; let cy = 0; let cw = sw; let ch = sh;
  if (ratio) {
    if (sw / sh > ratio) { cw = sh * ratio; cx = (sw - cw) / 2; } else { ch = sw / ratio; cy = (sh - ch) / 2; }
  }
  const scale = Math.min(1, maxW / cw);
  const c = document.createElement('canvas');
  c.width = Math.round(cw * scale);
  c.height = Math.round(ch * scale);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(img, cx, cy, cw, ch, 0, 0, c.width, c.height);
  return { data: c.toDataURL('image/jpeg', quality), w: c.width, h: c.height };
}

// Cover a number plate with the Car InspectO logo. rect is normalised (0-1) { x, y, w, h }.
export async function maskPlate(src, rect, logoSrc = '/logo.png') {
  const [img, logo] = await Promise.all([loadImg(src), loadImg(logoSrc).catch(() => null)]);
  const c = document.createElement('canvas');
  c.width = img.naturalWidth || img.width;
  c.height = img.naturalHeight || img.height;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, c.width, c.height);
  const x = rect.x * c.width; const y = rect.y * c.height; const w = rect.w * c.width; const h = rect.h * c.height;
  const r = Math.min(w, h) * 0.12;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();
  ctx.lineWidth = Math.max(2, h * 0.05);
  ctx.strokeStyle = '#1d1d2b';
  ctx.stroke();
  if (logo) {
    const pad = h * 0.12;
    const k = Math.min((w - pad * 2) / logo.width, (h - pad * 2) / logo.height);
    ctx.drawImage(logo, x + (w - logo.width * k) / 2, y + (h - logo.height * k) / 2, logo.width * k, logo.height * k);
  }
  return c.toDataURL('image/jpeg', 0.6);
}

// Square, rounded-corner PNG thumbnail (for report photo cards)
export async function roundedThumb(src, size = 240, radius = 28) {
  const img = await loadImg(src);
  const sw = img.naturalWidth || img.width; const sh = img.naturalHeight || img.height;
  const k = Math.min(sw, sh);
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const ctx = c.getContext('2d');
  ctx.beginPath(); ctx.roundRect(0, 0, size, size, radius); ctx.clip();
  ctx.drawImage(img, (sw - k) / 2, (sh - k) / 2, k, k, 0, 0, size, size);
  return { data: c.toDataURL('image/png'), w: size, h: size };
}
