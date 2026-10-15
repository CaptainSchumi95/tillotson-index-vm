import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  // NEXT_PUBLIC_* vytvára integrácia Supabase vo Verceli. Iba verejné kľúče –
  // nikdy sem nepridávať prefix SUPABASE_ (obsahuje aj tajný service_role kľúč).
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Tillotson Index',
        short_name: 'Tillotson',
        description: 'Tímová aplikácia pre prípravu motokár a pretekové víkendy.',
        lang: 'sk',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        // Android touto farbou vypĺňa okno pod aplikáciou (pás pri gestách) – tmavá splynie s tmavým režimom.
        background_color: '#0a0e16',
        theme_color: '#1d56e9',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        navigateFallback: '/index.html',
        // Obsluha push notifikácií (public/push-sw.js).
        importScripts: ['push-sw.js'],
      },
    }),
  ],
})
