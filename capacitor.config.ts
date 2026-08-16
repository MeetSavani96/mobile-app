import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  // ─── Identity ────────────────────────────────────────────────────────────
  // appId must be a unique reverse-domain package name used in Play Store.
  appId: 'com.akvenergy.solar',
  appName: 'AKV Energy',

  // ─── Web Asset Directory ─────────────────────────────────────────────────
  // Vite outputs to 'dist' — this is where Capacitor copies the web bundle.
  webDir: 'dist',

  // ─── Android-specific configuration ─────────────────────────────────────
  android: {
    // Allow cleartext HTTP only for localhost during development.
    // Production API uses HTTPS so this is safe to enable.
    allowMixedContent: false,

    // Back button is handled manually via App.addListener('backButton')
    // in src/hooks/useCapacitor.ts
    captureInput: false,

    // Use the WebView's built-in dark mode support
    webContentsDebuggingEnabled: false, // set to true for debug builds only
  },

  // ─── Plugins ─────────────────────────────────────────────────────────────
  plugins: {
    // SplashScreen: keep splash visible until the React app is fully mounted.
    // The SplashLoader component calls SplashScreen.hide() after 2.5 s.
    SplashScreen: {
      launchAutoHide: false,
      backgroundColor: '#070d19',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },

    // Camera: used by ComplaintForm to capture issue evidence photos.
    Camera: {
      // No special overrides needed; permissions declared in AndroidManifest.xml
    },
  },
};

export default config;
