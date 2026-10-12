// Builds the demo dataset (src/lib/seed.js) and writes it as JSON, for `npm run seed` in the backend.
// Usage: node scripts/export-seed.mjs <output.json>
import { createServer } from 'vite';
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = process.argv[2];
if (!out) { console.error('Usage: node scripts/export-seed.mjs <output.json>'); process.exit(1); }

const vite = await createServer({ root, logLevel: 'error', server: { middlewareMode: true, hmr: false, watch: null }, appType: 'custom', optimizeDeps: { noDiscovery: true, include: [] } });
try {
  const { buildSeed } = await vite.ssrLoadModule('/src/lib/seed.js');
  writeFileSync(out, JSON.stringify(buildSeed()));
} finally {
  await vite.close();
}
