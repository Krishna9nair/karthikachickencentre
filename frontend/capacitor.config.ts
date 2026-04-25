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
    backgroundColor: '#FAF4EC',
  },
};

export default config;
