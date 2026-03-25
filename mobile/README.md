# AKPOS Mobile

Expo React Native app for the offline-first Android POS client.

## Planned responsibilities

- offline SQLite data storage
- product grid and cart flow
- customer credit and supplier payment workflows
- background sync to central server
- APK and AAB builds through EAS

## First setup

```bash
npm install
npm run dev
```

## Planned environment

- `EXPO_PUBLIC_API_BASE_URL`
- `EXPO_PUBLIC_SHOP_ID`
- `EXPO_PUBLIC_ENV_NAME`

## Build path

For Android builds, use Expo EAS:

```bash
npx eas init
npx eas build --platform android --profile preview
```

See:

- [`/Users/ethanhtoon/Documents/theo/projects/vopos/DEPLOYMENT.md`](/Users/ethanhtoon/Documents/theo/projects/vopos/DEPLOYMENT.md)
