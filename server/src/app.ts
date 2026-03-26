import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { syncRouter } from './routes/sync';
import { checkPersistenceReadiness, getPersistenceMode } from './persistence/sales-store';
import { getServerEnv } from './config/env';

export function createApp() {
  const app = express();
  const env = getServerEnv();
  const allowAllOrigins = env.corsOrigins.length === 0;

  app.use(
    cors({
      origin(origin, callback) {
        if (allowAllOrigins || !origin || env.corsOrigins.includes(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
    })
  );
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'akpos-server',
      env: env.nodeEnv,
      persistence: getPersistenceMode(),
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/ready', async (_req, res) => {
    const readiness = await checkPersistenceReadiness();
    const requiresDatabase = env.nodeEnv === 'production';
    const ok = readiness.ok && (!requiresDatabase || readiness.mode === 'postgres');

    res.status(ok ? 200 : 503).json({
      ok,
      service: 'akpos-server',
      env: env.nodeEnv,
      persistence: readiness.mode,
      detail:
        !ok && requiresDatabase && readiness.mode !== 'postgres'
          ? 'Production requires a configured Postgres database.'
          : readiness.detail,
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/auth', authRouter);
  app.use('/sync', syncRouter);

  return app;
}
