import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    // For Capacitor: use root path (assets loaded from local filesystem)
    base: '/',
    server: {
      port: 3001,
      host: '0.0.0.0',
    },
    plugins: [
      react(),
      // PWA removed - this is a native mobile app built with Capacitor
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
      // Target modern browsers for smaller bundles
      target: 'es2020',
      // Enable minification optimizations
      minify: 'esbuild',
      // CSS code splitting
      cssCodeSplit: true,
      // Increase chunk size warning limit (mobile apps bundle differently)
      chunkSizeWarningLimit: 600,
      rollupOptions: {
        // External packages that are dynamically imported at runtime (native only)
        external: [
          'capacitor-native-biometric',
          'capacitor-secure-storage-plugin'
        ],
        output: {
          // Optimize chunk file naming for better caching
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          manualChunks: (id) => {
            // React core - small, cached well
            if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
              return 'vendor-react';
            }
            // Charting library (heavy, only used on InsightsPage)
            // Includes d3 modules used by recharts
            if (id.includes('node_modules/recharts') || id.includes('node_modules/d3-')) {
              return 'vendor-recharts';
            }
            // Animation library - large, used throughout
            if (id.includes('node_modules/framer-motion')) {
              return 'vendor-framer';
            }
            // Supabase client (heavy, only needed for auth/sync)
            if (id.includes('node_modules/@supabase')) {
              return 'vendor-supabase';
            }
            // Google AI SDK (heavy, only needed for dream analysis)
            if (id.includes('node_modules/@google/genai')) {
              return 'vendor-genai';
            }
            // RevenueCat (only needed for premium features)
            if (id.includes('node_modules/@revenuecat')) {
              return 'vendor-revenuecat';
            }
            // Capacitor plugins - split by frequency of use
            if (id.includes('node_modules/@capacitor/core')) {
              return 'vendor-capacitor-core';
            }
            if (id.includes('node_modules/@capacitor') || id.includes('node_modules/@capacitor-community')) {
              return 'vendor-capacitor-plugins';
            }
            // Insights components (99+ components, only used on InsightsPage)
            if (id.includes('/components/insights/')) {
              return 'insights';
            }
            // Heavy modals - lazy loaded, group together for better caching
            if (id.includes('/components/modals/DreamChatModal') ||
                id.includes('/components/modals/DreamCompareModal') ||
                id.includes('/components/modals/ShareDreamModal') ||
                id.includes('/components/modals/GuidedRelaxationModal') ||
                id.includes('/components/modals/SoundscapeModal')) {
              return 'modals-heavy';
            }
          }
        }
      }
    },
    // Optimize dependencies pre-bundling
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: ['capacitor-native-biometric', 'capacitor-secure-storage-plugin']
    }
  };
});
