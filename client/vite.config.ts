import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// VitePWA deliberately removed — it was configured with filename 'firebase-messaging-sw.js'
// which caused the build to OVERWRITE our Firebase messaging SW with a Workbox SW,
// silently discarding all background push messages.
// The firebase-messaging-sw.js in /public/ is served as-is by Vite and copied to /dist.

export default defineConfig({
  define: {
    global: 'window', // Required for amazon-cognito-identity-js
  },
  plugins: [
    react(),
  ],
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
