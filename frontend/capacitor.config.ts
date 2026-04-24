import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'shop.chickencrew.app',
  appName: 'ChickenCrew',
  webDir: 'build',
  server: {
    androidScheme: 'https',
  },
  android: {
    backgroundColor: '#FAF4EC',
  },
};

export default config;
