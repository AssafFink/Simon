/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// Production lives at https://assaffink.github.io/Simon/ (case-sensitive); dev and preview use the same path.
const base = '/Simon/';

export default defineConfig({
  base,
  plugins: [
    react(),
    VitePWA({
      strategies: 'generateSW',
      // No skipWaiting/clientsClaim: a new version waits until the app is fully closed,
      // so an update never reloads or interrupts an active game.
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'סיימון',
        short_name: 'סיימון',
        description: 'משחק זיכרון של צבעים וצלילים – עשרה שלבים',
        lang: 'he',
        dir: 'rtl',
        display: 'standalone',
        start_url: base,
        scope: base,
        theme_color: '#0A1628',
        background_color: '#0A1628',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        cleanupOutdatedCaches: true,
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
