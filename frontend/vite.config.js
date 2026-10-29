import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  server: { port: 5173 },
  cacheDir: mode === 'india' ? 'node_modules/.vite-india' : 'node_modules/.vite',   // each market has its own dependency cache, so running both dev servers never invalidates the other
  optimizeDeps: { include: ['jspdf'] },   // the PDF library is loaded on demand; pre-bundle it so the dev server never serves a stale copy
}));
