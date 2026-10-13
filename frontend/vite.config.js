import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173 },
  optimizeDeps: { include: ['jspdf'] },   // the PDF library is loaded on demand; pre-bundle it so the dev server never serves a stale copy
});
