import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.png', 'favicon.svg', 'icon.png'],
      manifest: {
        name: 'Minha Loja de Carro',
        short_name: 'LojaDeCarro',
        description: 'Plataforma para revenda e gestão de veículos',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        start_url: '/',
        icons: [
          {
            src: '/icon.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any maskable'
          },
          {
            src: '/icon.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
  base: '/',
  server: {
    port: 5174,
    open: true,
    proxy: {
      '/api-fipe': {
        target: 'https://parallelum.com.br/fipe/api/v1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-fipe/, ''),
      },
    },
  },
});