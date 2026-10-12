/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  // The container loads the module in a browser, where process does not exist.
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    lib: { entry: 'src/index.ts', formats: ['es'], fileName: 'portal' },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['src/test-setup.ts'],
    // Lets the theme test read theme.css as text; other CSS stays unprocessed.
    css: { include: [/\.css\?raw$/] },
  },
});
