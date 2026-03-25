# AKPOS EAS Setup

## Before You Start

Use Node 18 from the repo root:

```bash
cd /Users/ethanhtoon/Documents/theo/projects/vopos
nvm use
```

## 1. Go To Mobile App

```bash
cd /Users/ethanhtoon/Documents/theo/projects/vopos/mobile
```

## 2. Install Mobile Dependencies

```bash
npm install
```

## 3. Create Mobile Env

Copy:

```bash
cp .env.example .env
```

Edit `mobile/.env`:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-api-domain.com
EXPO_PUBLIC_SHOP_ID=shop_1
EXPO_PUBLIC_ENV_NAME=preview
EXPO_PUBLIC_EAS_PROJECT_ID=
```

For local testing only:

```env
EXPO_PUBLIC_API_BASE_URL=http://localhost:4000
EXPO_PUBLIC_SHOP_ID=shop_1
EXPO_PUBLIC_ENV_NAME=development
EXPO_PUBLIC_EAS_PROJECT_ID=
```

## 4. Login To Expo And EAS

```bash
npx expo login
npx eas login
```

## 5. Initialize EAS Project

```bash
npx eas init
```

This will create or link an Expo project and show an EAS project id.

## 6. Update Expo EAS Project Id

Open:

- [`/Users/ethanhtoon/Documents/theo/projects/vopos/mobile/.env`](/Users/ethanhtoon/Documents/theo/projects/vopos/mobile/.env)

After `eas init`, add:

```env
EXPO_PUBLIC_EAS_PROJECT_ID=your-real-eas-project-id
```

## 7. Build First Preview APK

```bash
npx eas build --platform android --profile preview
```

This is the recommended first Android build for testing.

## 8. Build Development Client If Needed

If you want a development client build:

```bash
npx eas build --platform android --profile development
```

## 9. Build Production AAB

Later, for Play Store release:

```bash
npx eas build --platform android --profile production
```

## 10. Install APK

After preview build finishes:

1. download the APK from the EAS build page
2. move it to the Android device
3. allow install from trusted source
4. install AKPOS

## Notes

- Android Studio is optional
- EAS is enough for cloud Android builds
- use a real hosted backend URL before giving the APK to real users
- if backend is still local-only, the installed APK will not be able to sync outside your machine

## Recommended Next Real-World Order

1. deploy backend
2. create Postgres database
3. confirm backend health shows `postgres`
4. update `mobile/.env`
5. run `eas init`
6. build preview APK
7. test on one admin device
8. test on one staff device
