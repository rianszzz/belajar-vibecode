import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' agar banner "versi baru tersedia" tampil (AC W5); bukan autoUpdate diam-diam
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Mini POS',
        short_name: 'MiniPOS',
        description: 'Kasir & stok toko kecil, offline-first',
        theme_color: '#0f766e',
        background_color: '#f5f5f4',
        display: 'standalone',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          // maskable: pakai file sama (lingkaran tengah sudah ada safe-zone-nya)
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // API sync tidak pernah di-cache; katalog GET via network-first di bawah
        navigateFallback: 'index.html',
        clientsClaim: true, // SW mengontrol page sejak first load (audit "controls page")
        runtimeCaching: [
          {
            urlPattern: /\/api\/v1\/products\/changes/,
            handler: 'NetworkFirst',
            options: { cacheName: 'catalog', networkTimeoutSeconds: 5 },
          },
        ],
      },
    }),
  ],
  // dev only: API di wrangler dev :8787 — produksi satu origin via ASSETS (tanpa proxy)
  server: { proxy: { '/api': 'http://localhost:8787' } },
})
