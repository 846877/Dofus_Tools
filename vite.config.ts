import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// `base: './'` permet de déployer le build n'importe où (GitHub Pages, dossier local…).
export default defineConfig({
  plugins: [react()],
  base: './',
  test: { environment: 'node' },
});
