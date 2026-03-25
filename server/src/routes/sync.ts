import { Router } from 'express';
import { z } from 'zod';
import { demoChanges } from '../data/demo';

const pushItemSchema = z.object({
  queueId: z.string().min(1),
  entityType: z.string().min(1),
  entityId: z.string().min(1),
  operation: z.string().min(1),
  createdAt: z.string().min(1),
  payload: z.record(z.string(), z.unknown()),
});

const pushSchema = z.object({
  deviceId: z.string().min(1),
  items: z.array(pushItemSchema),
});

export const syncRouter = Router();

syncRouter.post('/push', (req, res) => {
  const parsed = pushSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: 'Invalid sync push payload.',
      issues: parsed.error.flatten(),
    });
  }

  return res.json({
    acked: parsed.data.items.map(item => ({
      queueId: item.queueId,
      entityId: item.entityId,
      status: 'synced',
    })),
    rejected: [],
  });
});

syncRouter.get('/pull', (req, res) => {
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;

  return res.json({
    cursor: cursor ?? `dev-cursor-${Date.now()}`,
    changes: demoChanges,
  });
});
