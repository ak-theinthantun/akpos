# AKPOS Render Setup

## Goal

Deploy the AKPOS backend to Render with:

- managed PostgreSQL
- hosted Express API
- production-ready env values
- a mobile API URL ready for Expo/EAS builds

This is the recommended production hosting path for AKPOS.

## Before You Start

Use Node 18 locally:

```bash
cd /Users/ethanhtoon/Documents/theo/projects/vopos
nvm use
```

Important project paths:

- backend: [`/Users/ethanhtoon/Documents/theo/projects/vopos/server`](/Users/ethanhtoon/Documents/theo/projects/vopos/server)
- mobile app: [`/Users/ethanhtoon/Documents/theo/projects/vopos/mobile`](/Users/ethanhtoon/Documents/theo/projects/vopos/mobile)
- backend env sample: [`/Users/ethanhtoon/Documents/theo/projects/vopos/server/.env.production.example`](/Users/ethanhtoon/Documents/theo/projects/vopos/server/.env.production.example)
- mobile env sample: [`/Users/ethanhtoon/Documents/theo/projects/vopos/mobile/.env.production.example`](/Users/ethanhtoon/Documents/theo/projects/vopos/mobile/.env.production.example)
- Render blueprint: [`/Users/ethanhtoon/Documents/theo/projects/vopos/render.yaml`](/Users/ethanhtoon/Documents/theo/projects/vopos/render.yaml)

## 1. Push The Latest Repo

Make sure the latest source is already pushed to GitHub:

- repo: [https://github.com/ak-theinthantun/akpos](https://github.com/ak-theinthantun/akpos)

Render will deploy from GitHub.

You can either:

- create services manually in the Render dashboard
- or use the Render Blueprint in [`/Users/ethanhtoon/Documents/theo/projects/vopos/render.yaml`](/Users/ethanhtoon/Documents/theo/projects/vopos/render.yaml)

## 2. Create Render Postgres

In Render:

1. Create a new `PostgreSQL` service
2. Name it something like `akpos-db`
3. Choose the same region you plan to use for the backend API
4. Finish creation and wait until the database is ready

After creation, keep these values from Render:

- Internal Database URL
- External Database URL

For AKPOS, use the `Internal Database URL` inside the backend web service.

## 3. Create Render Web Service

In Render:

1. Create a new `Web Service`
2. Connect the GitHub repo:
   - [https://github.com/ak-theinthantun/akpos](https://github.com/ak-theinthantun/akpos)
3. Fill the service form like this:

### Recommended Render Form Values

- Name: `akpos-server`
- Root Directory: `server`
- Runtime: `Node`
- Branch: `main`
- Build Command: `npm install && npm run build`
- Start Command: `npm run start`

If Render asks for the port, use:

- `10000`

## 4. Add Environment Variables

In the Render web service, add:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=<Render internal Postgres URL>
JWT_SECRET=<long-random-secret>
CORS_ORIGIN=https://your-app-domain.com,https://expo.dev
```

Recommendations:

- use a long random `JWT_SECRET`
- use the Render `Internal Database URL`, not the external one, for the backend service
- keep database and web service in the same region

If you use the Blueprint file, Render can create most of this automatically. You will still need to provide the real `CORS_ORIGIN` value during setup.

## 5. First Deploy Check

After deploy finishes, open:

- `https://your-render-service.onrender.com/health`
- `https://your-render-service.onrender.com/ready`

Expected response should include:

```json
{
  "ok": true,
  "service": "akpos-server",
  "persistence": "postgres"
}
```

If `persistence` is `memory`, check:

- `DATABASE_URL` is set
- the URL is the Render Postgres internal URL
- the web service and database are both running

If `/ready` returns `503`, check:

- `NODE_ENV=production`
- `DATABASE_URL` is set correctly
- the database is reachable from Render

## 6. Optional Database Init Command

If you open a Render shell or run the app locally against production config, you can initialize the schema with:

```bash
cd /Users/ethanhtoon/Documents/theo/projects/vopos/server
npm run db:init
```

## 7. Test API Endpoints

After `/health` is correct, test:

- `POST /auth/login`
- `GET /sync/pull`
- `POST /sync/push`

Local example with your deployed URL:

```bash
curl https://your-render-service.onrender.com/health
```

## 8. Configure Mobile Production Env

Once the backend is live, copy:

```bash
cd /Users/ethanhtoon/Documents/theo/projects/vopos/mobile
cp .env.production.example .env
```

Then set:

```env
EXPO_PUBLIC_API_BASE_URL=https://your-render-service.onrender.com
EXPO_PUBLIC_SHOP_ID=shop_1
EXPO_PUBLIC_ENV_NAME=production
EXPO_PUBLIC_EAS_PROJECT_ID=replace-with-real-eas-project-id
```

The Expo config reads these values from:

- [`/Users/ethanhtoon/Documents/theo/projects/vopos/mobile/app.config.ts`](/Users/ethanhtoon/Documents/theo/projects/vopos/mobile/app.config.ts)

## 9. Build The First APK

After the backend URL is set in mobile env:

```bash
cd /Users/ethanhtoon/Documents/theo/projects/vopos/mobile
nvm use
npm install
npx expo login
npx eas login
npx eas init
npx eas build --platform android --profile preview
```

The EAS profile config is in:

- [`/Users/ethanhtoon/Documents/theo/projects/vopos/mobile/eas.json`](/Users/ethanhtoon/Documents/theo/projects/vopos/mobile/eas.json)

## 10. Recommended Production Order

1. Create Render Postgres
2. Create Render web service for [`/Users/ethanhtoon/Documents/theo/projects/vopos/server`](/Users/ethanhtoon/Documents/theo/projects/vopos/server)
3. Add `PORT`, `DATABASE_URL`, and `JWT_SECRET`
4. Deploy and confirm `/health` and `/ready`
5. Run `npm run db:init` if you want an explicit schema init check
6. Put the Render URL into [`/Users/ethanhtoon/Documents/theo/projects/vopos/mobile/.env`](/Users/ethanhtoon/Documents/theo/projects/vopos/mobile/.env)
7. Run `npx eas init`
8. Build preview APK
9. Test on one admin device first
10. Test on one staff device second

## 11. Later Improvements

After the first stable deploy, good next production steps are:

- custom API domain like `api.akpos.yourdomain.com`
- database backups review
- monitoring and uptime alerts
- real auth/session hardening
- persistent production data tables beyond the current synced sales foundation
