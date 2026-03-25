import express from 'express';
import cors from 'cors';

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'akpos-server',
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/auth/login', (_req, res) => {
    res.status(501).json({
      ok: false,
      message: 'Login is not implemented yet.',
    });
  });

  app.post('/sync/push', (_req, res) => {
    res.status(501).json({
      ok: false,
      message: 'Push sync is not implemented yet.',
    });
  });

  app.get('/sync/pull', (_req, res) => {
    res.status(501).json({
      ok: false,
      message: 'Pull sync is not implemented yet.',
    });
  });

  return app;
}
