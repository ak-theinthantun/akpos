import express from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth';
import { syncRouter } from './routes/sync';
import { getPersistenceMode } from './persistence/sales-store';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'akpos-server',
      persistence: getPersistenceMode(),
      timestamp: new Date().toISOString(),
    });
  });

  app.use('/auth', authRouter);
  app.use('/sync', syncRouter);

  return app;
}
