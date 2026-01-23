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
      rollupOptions: {
        // External packages that are dynamically imported at runtime (native only)
        external: [
          'capacitor-native-biometric',
          'capacitor-secure-storage-plugin'
        ],
        output: {
          manualChunks: {
            // Charting library (heavy, only used on InsightsPage)
            recharts: ['recharts'],
            // React core - small, cached well
            'vendor-react': ['react', 'react-dom'],
            // Animation library - large, used throughout
            'vendor-ui': ['framer-motion'],
            // Native mobile plugins - only needed on mobile
            'vendor-capacitor': [
              '@capacitor/core',
              '@capacitor/app',
              '@capacitor/haptics',
              '@capacitor/share',
              '@capacitor/filesystem',
              '@capacitor/local-notifications',
              '@capacitor-community/speech-recognition'
            ],
            // Backend/cloud services
            'vendor-services': [
              '@supabase/supabase-js',
              '@google/genai',
              '@revenuecat/purchases-capacitor'
            ]
          }
        }
      }
    }
  };
});
