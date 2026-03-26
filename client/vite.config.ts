import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
const pwaOptions: any = {
  // FIXED: Was 'injectManifest' which requires a self.__WB_MANIFEST token in sw.js.
  // Our sw.js is a plain static file — no token → Workbox build warning.
  // 'generateSW' means Vite generates its own SW for precaching, we keep ours for push.
  registerType: 'prompt',
  injectRegister: null,        // We register our own SW manually in index.tsx
  strategies: 'generateSW',
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,json,wav}'],
    // Exclude OneSignal worker files — OneSignal manages its own SW scope
    navigateFallbackDenylist: [/OneSignal/],
  },
  manifest: {
    name: 'MCM Alerts',
    short_name: 'MCM Alerts',
    description: 'A reliable notification system for monitoring website uptime, service status, and critical system events.',
    start_url: '/',
    display: 'standalone',
    background_color: '#0d1117',
    theme_color: '#161b22',
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' }
    ],
  },
  devOptions: {
    // FIXED: Was 'true' — caused conflicts with HMR (Hot Module Reload) in dev mode.
    // Disabled in dev; PWA features only active in production builds.
    enabled: false,
  },
};
export default defineConfig({
  define: {
    global: 'window', // Required for amazon-cognito-identity-js
  },
  plugins: [
    react(),
    VitePWA(pwaOptions)
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