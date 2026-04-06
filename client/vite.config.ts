import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

const pwaOptions: any = {
  strategies: 'generateSW',
  registerType: 'autoUpdate',
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
    enabled: true, // Enable in dev for testing
  },
  workbox: {
    // This will be injected into the service worker
    globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
    runtimeCaching: [
        {
            urlPattern: /^https?:\/\/.*\/api\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 3600 // 1 hour
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
        }
    ]
  }
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
