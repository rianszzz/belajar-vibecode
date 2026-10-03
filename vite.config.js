import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'Mini POS',
        short_name: 'MiniPOS',
        description: 'Kasir & stok toko kecil, offline-first',
        theme_color: '#0f766e',
        background_color: '#f5f5f4',
      // ponytail: ikon PWA ditambahkan di T5 (W5 butuh 192/512 valid)
        display: 'standalone',
      },
      workbox: {
        // API sync tidak pernah di-cache; katalog GET via network-first di bawah
        navigateFallback: 'index.html',
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
  server: { proxy: { '/api': 'http://localhost:3001' } },
})
