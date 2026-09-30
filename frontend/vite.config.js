import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-512.png', 'icon-192.png', 'favicon.ico'],
      manifest: {
        name: 'Rinci — Keuangan Keluarga',
        short_name: 'Rinci',
        description: 'Aplikasi Manajemen Keuangan Keluarga yang lengkap dan mudah digunakan',
        theme_color: '#10b981',
        background_color: '#030712',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        lang: 'id',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        shortcuts: [
          {
            name: 'Catat Transaksi',
            short_name: 'Catat',
            url: '/tambah',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }],
          },
          {
            name: 'Riwayat',
            short_name: 'Riwayat',
            url: '/riwayat',
            icons: [{ src: '/icon-192.png', sizes: '192x192' }],
          },
        ],
      },
      workbox: {
        // Cache strategi untuk assets & API
        runtimeCaching: [
          {
            // Cache halaman navigasi
            urlPattern: /^https:\/\/.+\/$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'pages-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 86400 },
            },
          },
          {
            // Cache API calls (stale-while-revalidate)
            urlPattern: /\/api\/(wallets|categories)/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-static-cache',
              expiration: { maxEntries: 20, maxAgeSeconds: 3600 },
            },
          },
          {
            // Cache assets statis (JS, CSS, images)
            urlPattern: /\.(?:js|css|woff2|png|jpg|svg|ico)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'static-assets',
              expiration: { maxEntries: 60, maxAgeSeconds: 604800 }, // 7 hari
            },
          },
        ],
        // Halaman offline fallback
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,svg,woff2}'],
      },
      devOptions: {
        enabled: true, // Aktifkan PWA di dev mode untuk testing
      },
    }),
  ],
  server: {
    port: 5173,
  },
})
