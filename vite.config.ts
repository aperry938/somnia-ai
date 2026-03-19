import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(() => {
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
    // API keys accessed via import.meta.env.VITE_GEMINI_API_KEY (not embedded in bundle)
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
            // Insights tab-based sub-chunks (lazy loaded per tab in InsightsGrid)
            if (id.includes('/components/insights/tabs/QuickStatsTab') ||
                id.includes('/components/insights/RecentDreamSummary') ||
                id.includes('/components/insights/AvgSleepQuality') ||
                id.includes('/components/insights/DreamGrowth') ||
                id.includes('/components/insights/AchievementsUnlocked') ||
                id.includes('/components/insights/TopTags') ||
                id.includes('/components/insights/DreamConsistency') ||
                id.includes('/components/insights/LongestShortestDream') ||
                id.includes('/components/insights/FirstDreamLastDream') ||
                id.includes('/components/insights/SleepQualityVsDreams') ||
                id.includes('/components/insights/TelemetryScatterPlot')) {
              return 'insights-quick';
            }
            if (id.includes('/components/insights/tabs/ContentTab') ||
                id.includes('/components/insights/AnimalDreams') ||
                id.includes('/components/insights/VehicleDreams') ||
                id.includes('/components/insights/FoodDreams') ||
                id.includes('/components/insights/MusicDreams') ||
                id.includes('/components/insights/DreamColorAnalysis')) {
              return 'insights-content';
            }
            if (id.includes('/components/insights/tabs/EmotionsTab') ||
                id.includes('/components/insights/MoodTracker') ||
                id.includes('/components/insights/JoyDreams') ||
                id.includes('/components/insights/FearDreams') ||
                id.includes('/components/insights/AngerDreams') ||
                id.includes('/components/insights/SadnessDreams') ||
                id.includes('/components/insights/AnxietyDreams') ||
                id.includes('/components/insights/HopeDreams') ||
                id.includes('/components/insights/PeacefulDreams') ||
                id.includes('/components/insights/ConfusionDreams') ||
                id.includes('/components/insights/SuccessDreams') ||
                id.includes('/components/insights/ConflictDreams') ||
                id.includes('/components/insights/RomanticDreams')) {
              return 'insights-emotions';
            }
            if (id.includes('/components/insights/tabs/TemporalTab') ||
                id.includes('/components/insights/MoonPhaseInsight') ||
                id.includes('/components/insights/SeasonalPattern') ||
                id.includes('/components/insights/DayOfWeekAnalysis') ||
                id.includes('/components/insights/WeekdayVsWeekend') ||
                id.includes('/components/insights/JournalingGaps') ||
                id.includes('/components/insights/DreamLengthTrend')) {
              return 'insights-temporal';
            }
            if (id.includes('/components/insights/tabs/ThemesTab') ||
                id.includes('/components/insights/AdventureDreams') ||
                id.includes('/components/insights/MysteryDreams') ||
                id.includes('/components/insights/NatureDreams') ||
                id.includes('/components/insights/TechnologyDreams') ||
                id.includes('/components/insights/WorkDreams') ||
                id.includes('/components/insights/SchoolDreams') ||
                id.includes('/components/insights/PowerDreams') ||
                id.includes('/components/insights/TransformationDreams') ||
                id.includes('/components/insights/SpiritualDreams') ||
                id.includes('/components/insights/CreativityDreams') ||
                id.includes('/components/insights/MoneyDreams') ||
                id.includes('/components/insights/HealthDreams') ||
                id.includes('/components/insights/ChildhoodDreams') ||
                id.includes('/components/insights/DeathDreams') ||
                id.includes('/components/insights/TimeTravelDreams')) {
              return 'insights-themes';
            }
            // Remaining insight components (People, Settings tabs, shared components)
            if (id.includes('/components/insights/')) {
              return 'insights-shared';
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
    },
  };
});
