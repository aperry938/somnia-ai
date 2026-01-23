import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'ai.somnia.app',
  appName: 'Somnia',
  webDir: 'dist',

  // Server configuration for deep linking
  server: {
    // Allow navigation to our custom URL scheme
    allowNavigation: ['somnia://*'],
  },

  // iOS-specific configuration
  ios: {
    // Scheme for deep links
    scheme: 'somnia',
    // Content inset for safe areas
    contentInset: 'automatic',
    // Allow mixed content for local development
    allowsLinkPreview: true,
    // Scroll to input when keyboard appears
    scrollEnabled: true,
    // Enable background audio
    backgroundColor: '#0F172A', // Matches night-bg-start for seamless loading
  },

  // Android-specific configuration
  android: {
    // Allow mixed content
    allowMixedContent: true,
    // Capture external links
    captureInput: true,
    // Background color while loading
    backgroundColor: '#0F172A', // Matches night-bg-start for seamless loading
    // Build options for release
    buildOptions: {
      keystorePath: undefined, // Set in CI/CD
      keystoreAlias: undefined,
    },
  },

  // Plugins configuration
  plugins: {
    // Status bar configuration
    StatusBar: {
      // Dark content for light backgrounds, light content for dark
      style: 'Dark',
      // Background color (matches app theme)
      backgroundColor: '#0F172A',
    },

    // Splash screen configuration
    SplashScreen: {
      // Duration to show splash screen
      launchShowDuration: 2000,
      // Automatically hide after duration
      launchAutoHide: true,
      // Fade out duration
      launchFadeOutDuration: 500,
      // Background color (matches night-bg-start)
      backgroundColor: '#0F172A',
      // Android-specific
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      // iOS-specific
      showSpinner: false,
      // Dark mode support
      splashFullScreen: true,
      splashImmersive: true,
    },

    // Local notifications configuration
    LocalNotifications: {
      // Icon for notifications (Android) - uses launcher icon as fallback
      // To customize, add ic_stat_notification.png to res/drawable-* folders
      smallIcon: 'ic_launcher',
      // Accent color for notifications
      iconColor: '#6366f1',
      // Sound file for notifications - use default system sound
      // To customize, add alarm.wav to android/app/src/main/res/raw/ and ios/App/App/
      sound: undefined,
    },

    // Keyboard configuration
    Keyboard: {
      // Resize content when keyboard appears
      resize: 'body',
      // Scroll assist
      scrollAssist: true,
      // Hide accessory bar
      hideNavigationBarOnFocus: false,
    },

    // App plugin for deep linking
    App: {
      // Handle app state changes
    },

    // Haptics configuration
    Haptics: {
      // Enable haptics
    },
  },
};

export default config;
