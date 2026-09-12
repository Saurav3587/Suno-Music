import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Read version from package.json so it's always in sync
const pkg = JSON.parse(readFileSync(resolve('./package.json'), 'utf-8'));

export default defineConfig({
  base: './',
  plugins: [react()],
  define: {
    // Injects the current app version as a global constant at build time
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  server: {
    port: 5173,
    host: true, // Allow access from local network / mobile devices
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true
      }
    }
  }
});
