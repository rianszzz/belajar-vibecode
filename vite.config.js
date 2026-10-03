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
        display: 'standalone',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
        ],
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
})
