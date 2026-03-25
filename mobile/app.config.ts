import type { ExpoConfig } from 'expo/config';

const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

const config: ExpoConfig = {
  name: 'AKPOS',
  slug: 'akpos',
  version: '0.1.0',
  orientation: 'default',
  icon: './assets/icon.png',
  scheme: 'akpos',
  userInterfaceStyle: 'light',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff',
  },
  assetBundlePatterns: ['**/*'],
  ios: {
    supportsTablet: true,
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/icon.png',
      backgroundColor: '#ffffff',
    },
    package: 'com.akpos.mobile',
  },
  web: {
    bundler: 'metro',
  },
  plugins: ['expo-router', 'expo-sqlite', 'expo-secure-store'],
  extra: {
    eas: projectId
      ? {
          projectId,
        }
      : undefined,
  },
};

export default config;
