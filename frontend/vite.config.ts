import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Base path for GitHub Pages deployment
  // For user/org pages: base: '/'
  // For project pages: base: '/repository-name/'
  base: process.env.VITE_BASE || '/',
  
  plugins: [
    react(),
    // PWA plugin configuration
    VitePWA({
      registerType: 'prompt',  // User controls when to update (T006)
      includeAssets: ['favicon.ico', 'robots.txt', 'icons/*.png', 'wasm/*'],
      manifest: {
        name: 'Musicore - Intelligent Music Stand',
        short_name: 'Musicore',
        description: 'Tablet-native intelligent music stand for practice sessions. Display scores, add annotations, control tempo, and practice with confidence - even offline.',
        theme_color: '#6366f1',
        background_color: '#1a1a1a',
        display: 'standalone',
        orientation: 'any',
        // scope and start_url are automatically set by vite-plugin-pwa based on base path
        icons: [
          {
            src: 'icons/icon-192x192.png',  // Relative path (no leading /)
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable',
          },
          {
            src: 'icons/icon-512x512.png',  // Relative path (no leading /)
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
        categories: ['music', 'education', 'productivity'],
      },
      workbox: {
        // Precache all static assets (T008)
        globPatterns: ['**/*.{js,css,html,wasm,png,svg,ico}'],
        
        // Runtime caching strategies (T007)
        runtimeCaching: [
          {
            // Network-first for score data
            urlPattern: /\/api\/scores\/.*/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'musicore-scores-v1',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 7 * 24 * 60 * 60, // 7 days
                purgeOnQuotaError: true,  // Auto-evict if quota exceeded
              },
            },
          },
          {
            // Stale-while-revalidate for images
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'musicore-images-v1',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
            },
          },
          {
            // Cache-first for fonts
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'musicore-fonts-v1',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
              },
            },
          },
        ],
        
        // Clean up old caches (T009)
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,  // Disable in dev mode - use Vite HMR instead (T010)
      },
    }),
    // Note: WASM files are copied manually in Dockerfile for Docker builds
    // For local development, run `npm run build:wasm` first
  ],
  // Enable top-level await for WASM initialization
  build: {
    target: 'esnext'
  },
  server: {
    https: {}  // Required for PWA service workers (enables self-signed cert)
  }
})
