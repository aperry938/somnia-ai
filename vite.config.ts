import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // For GitHub Pages: use repo name as base path in production
    base: mode === 'production' ? '/somnia-ai-wellness-app/' : '/',
    server: {
      port: 3001,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'icons/*.svg', 'apple-touch-icon.png'],
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,mp3,wav}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/storage\.googleapis\.com\/web-dev-assets\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'somnia-audio-cache',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
                },
                cacheableResponse: {
                  statuses: [0, 200]
                }
              }
            }
          ]
        },
        manifest: {
          name: 'Somnia.ai - Intelligent Dream Journal',
          short_name: 'Somnia.ai',
          description: 'Intelligent sleep and dream wellness application',
          theme_color: '#6366F1',
          background_color: '#0F172A',
          display: 'standalone',
          orientation: 'portrait-primary',
          icons: [
            {
              src: 'icons/icon-192.svg',
              sizes: '192x192',
              type: 'image/svg+xml'
            },
            {
              src: 'icons/icon-192.svg',
              sizes: '512x512',
              type: 'image/svg+xml'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate TensorFlow.js into its own chunk for lazy loading
            tensorflow: ['@tensorflow/tfjs', '@tensorflow-models/speech-commands'],
            // Keep recharts separate as it's also large
            recharts: ['recharts']
          }
        }
      }
    }
  };
});
