# AKPOS Server Setup

## Goal

Set up the AKPOS backend with:

- Node 18
- PostgreSQL
- local run
- deploy-ready env values

## 1. Use Node 18

From repo root:

```bash
cd /Users/ethanhtoon/Documents/theo/projects/vopos
nvm use
```

## 2. Go To Server

```bash
cd /Users/ethanhtoon/Documents/theo/projects/vopos/server
```

## 3. Install Dependencies

```bash
npm install
```

## 4. Create Local Env

```bash
cp .env.example .env
```

Edit `server/.env` with your local database:

```env
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/akpos
JWT_SECRET=replace-with-long-random-secret
```

## 5. Run Server Locally

```bash
npm run dev
```

Check:

- [http://localhost:4000/health](http://localhost:4000/health)

Expected:

```json
{
  "ok": true,
  "service": "akpos-server",
  "persistence": "memory | postgres"
}
```

## 6. Use PostgreSQL In Production

Copy:

```bash
cp .env.production.example .env.production
```

Fill real values:

```env
PORT=4000
DATABASE_URL=postgres://username:password@host:5432/akpos
JWT_SECRET=replace-with-long-random-secret
```

If `DATABASE_URL` is present and reachable, the server will automatically:

- create `synced_sales` table if needed
- store pushed sales in Postgres
- report `persistence: postgres`

If not, it falls back to memory mode for development.

## 7. Build Server

```bash
npm run build
```

## 8. Production Start

```bash
npm run start
```

## 9. Recommended Hosting Config

### Build command

```bash
npm install && npm run build
```

### Start command

```bash
npm run start
```

### Required env vars

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`

## 10. Recommended First Production Check

After deploy:

1. open `/health`
2. confirm `ok: true`
3. confirm `persistence: postgres`
4. test `POST /auth/login`
5. test `GET /sync/pull`
6. test `POST /sync/push`
