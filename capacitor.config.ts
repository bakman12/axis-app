import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.axis.intelligence',
  appName: 'Axis',
  webDir: 'dist',
  bundledWebRuntime: false,
  plugins: {
    Haptics: {},
    NativeBiometric: {
      // Prompt text is set per-call in BiometricGate.jsx
    },
    PrivacyScreen: {
      enable: true,
    },
  },
  android: {
    // FLAG_SECURE is set programmatically via PrivacyScreen.enable()
    allowMixedContent: false,
  },
  ios: {
    // App switcher screenshot is blurred via PrivacyScreen.enable()
    allowsLinkPreview: false,
  },
};

export default config;