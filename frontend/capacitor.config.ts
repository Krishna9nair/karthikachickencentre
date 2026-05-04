import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'shop.chickencrew.app',
  appName: 'ChickenCrew',
  webDir: 'build',
  server: {
    // Live-URL APK: the app loads the production Vercel site instead of the
    // bundled web assets. UI/feature changes pushed to Vercel are live in
    // the APK instantly — no rebuild / reinstall needed.
    url: 'https://karthikachickencentre.shop',
    androidScheme: 'https',
    cleartext: false,
  },
  android: {
    // Match the splash video's red background so the logo appears
    // seamlessly without a coloured frame around it.
    backgroundColor: '#E50A12',
  },
};

export default config;
