# AKPOS Deployment Guide

## Goal

This guide explains how to move AKPOS from local development to:

- hosted backend API
- hosted PostgreSQL database
- Expo/EAS Android builds
- installable APK for testing
- AAB for Play Store release later

## Current Project Parts

- web reference app: [`/Users/ethanhtoon/Documents/theo/projects/vopos/app`](/Users/ethanhtoon/Documents/theo/projects/vopos/app)
- mobile app: [`/Users/ethanhtoon/Documents/theo/projects/vopos/mobile`](/Users/ethanhtoon/Documents/theo/projects/vopos/mobile)
- backend server: [`/Users/ethanhtoon/Documents/theo/projects/vopos/server`](/Users/ethanhtoon/Documents/theo/projects/vopos/server)

## Recommended Services

### Database

Use one of:

- Neon
- Supabase Postgres
- Railway Postgres
- Render Postgres

### Backend hosting

Use one of:

- Railway
- Render
- Fly.io
- VPS

### Android builds

Use:

- Expo EAS Build

## Node Version

This repo is pinned to:

- `18.20.8`

Use:

```bash
nvm use
```

The repo root includes [`/Users/ethanhtoon/Documents/theo/projects/vopos/.nvmrc`](/Users/ethanhtoon/Documents/theo/projects/vopos/.nvmrc).

## Step 1: Create PostgreSQL Database

Create a Postgres database and copy the connection string.

Example:

```env
DATABASE_URL=postgres://username:password@host:5432/akpos
```

The current server will automatically switch from memory mode to Postgres mode when `DATABASE_URL` is set.

## Step 2: Configure Backend Environment

Copy:

- [`/Users/ethanhtoon/Documents/theo/projects/vopos/server/.env.example`](/Users/ethanhtoon/Documents/theo/projects/vopos/server/.env.example)
- [`/Users/ethanhtoon/Documents/theo/projects/vopos/server/.env.production.example`](/Users/ethanhtoon/Documents/theo/projects/vopos/server/.env.production.example)

into:

- `server/.env`

Example:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=postgres://username:password@host:5432/akpos
JWT_SECRET=replace-with-long-random-secret
CORS_ORIGIN=https://your-app-domain.com,https://expo.dev
```

## Step 3: Run Backend Locally

```bash
cd /Users/ethanhtoon/Documents/theo/projects/vopos
nvm use
cd server
npm install
npm run dev
```

Check:

- [http://localhost:4000/health](http://localhost:4000/health)
- [http://localhost:4000/ready](http://localhost:4000/ready)

Expected health payload includes:

- `service`
- `timestamp`
- `persistence`

`persistence` should be:

- `memory` if no database is configured
- `postgres` if `DATABASE_URL` is configured and reachable

## Step 4: Deploy Backend

### Recommended production path: Render

Use this exact guide:

- [`/Users/ethanhtoon/Documents/theo/projects/vopos/RENDER_SETUP.md`](/Users/ethanhtoon/Documents/theo/projects/vopos/RENDER_SETUP.md)

### Generic hosted deployment

Deploy folder:

- [`/Users/ethanhtoon/Documents/theo/projects/vopos/server`](/Users/ethanhtoon/Documents/theo/projects/vopos/server)

Build command:

```bash
npm install && npm run build
```

Start command:

```bash
npm run start
```

Required environment variables:

- `NODE_ENV`
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN`

Server-specific setup guide:

- [`/Users/ethanhtoon/Documents/theo/projects/vopos/server/SETUP.md`](/Users/ethanhtoon/Documents/theo/projects/vopos/server/SETUP.md)
- [`/Users/ethanhtoon/Documents/theo/projects/vopos/RENDER_SETUP.md`](/Users/ethanhtoon/Documents/theo/projects/vopos/RENDER_SETUP.md)

After deploy, note the public backend URL.

Example:

```text
https://api.akpos.example.com
```

You should verify both:

- `/health` for liveness
- `/ready` for database readiness

## Step 5: Configure Mobile Environment

Copy:

- [`/Users/ethanhtoon/Documents/theo/projects/vopos/mobile/.env.example`](/Users/ethanhtoon/Documents/theo/projects/vopos/mobile/.env.example)
- [`/Users/ethanhtoon/Documents/theo/projects/vopos/mobile/.env.production.example`](/Users/ethanhtoon/Documents/theo/projects/vopos/mobile/.env.production.example)

into:

- `mobile/.env`

Example:

```env
EXPO_PUBLIC_API_BASE_URL=https://api.akpos.example.com
EXPO_PUBLIC_SHOP_ID=shop_1
EXPO_PUBLIC_ENV_NAME=production
EXPO_PUBLIC_EAS_PROJECT_ID=replace-with-real-eas-project-id
```

## Step 6: Create Expo Project And Link EAS

Inside [`/Users/ethanhtoon/Documents/theo/projects/vopos/mobile`](/Users/ethanhtoon/Documents/theo/projects/vopos/mobile):

```bash
nvm use
npm install
npx expo login
npx eas login
npx eas init
```

After `eas init`, set the real EAS project id in:

- [`/Users/ethanhtoon/Documents/theo/projects/vopos/mobile/.env`](/Users/ethanhtoon/Documents/theo/projects/vopos/mobile/.env)

The Expo config now reads it from:

- [`/Users/ethanhtoon/Documents/theo/projects/vopos/mobile/app.config.ts`](/Users/ethanhtoon/Documents/theo/projects/vopos/mobile/app.config.ts)

## Step 7: Run Mobile Locally

```bash
cd /Users/ethanhtoon/Documents/theo/projects/vopos/mobile
nvm use
npm install
npm run dev
```

If you want Android emulator support later, Android Studio can help, but it is not required for the build pipeline itself.

## Step 8: Build APK For Internal Testing

Inside [`/Users/ethanhtoon/Documents/theo/projects/vopos/mobile`](/Users/ethanhtoon/Documents/theo/projects/vopos/mobile):

```bash
npx eas build --platform android --profile preview
```

This is the main internal test build path.

Use this first before Play Store release.

## Step 9: Build Production AAB

```bash
npx eas build --platform android --profile production
```

Use the generated AAB for Play Store upload.

## Step 10: Install APK On Devices

For internal testing:

1. download the built APK from EAS
2. copy it to the Android tablet
3. allow install from trusted source
4. install AKPOS
5. log in and sync

## Step 11: Production Checklist

Before real rollout:

- backend health route works
- Postgres is connected
- `persistence: postgres` shows in health
- mobile app points to production API URL
- login works
- sync works
- local sale save works offline
- push sync works online
- order history works after sync
- one admin device tested
- at least one staff device tested

## Recommended Next Production Work

Before public/device rollout, add:

- database migration files for server schema
- real auth persistence
- user/device registration storage
- real synced sales query endpoints
- backup and restore plan
- HTTPS custom domain

## Android Studio

You do **not** need Android Studio to continue the main AKPOS path.

Use Android Studio only when you need:

- emulator
- native Android debugging
- printer SDK integration
- barcode scanner native modules

For normal APK generation:

- Expo + EAS is enough
