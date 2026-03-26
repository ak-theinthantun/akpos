import { Router } from 'express';
import { z } from 'zod';
import { getBaseDemoChanges } from '../data/demo';
import { listSyncedSales, saveSyncedSale } from '../persistence/sales-store';
import { updateDevicePullCursor } from '../persistence/auth-store';
import { asyncHandler } from '../utils/async-handler';

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

syncRouter.post('/push', asyncHandler(async (req, res) => {
  const parsed = pushSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      ok: false,
      message: 'Invalid sync push payload.',
      issues: parsed.error.flatten(),
    });
  }

  for (const item of parsed.data.items) {
    if (item.entityType === 'sale' && item.operation === 'sale.create') {
      const sale = item.payload.sale;
      if (sale && typeof sale === 'object' && 'id' in sale && typeof sale.id === 'string') {
        await saveSyncedSale(sale as typeof sale & { id: string });
      }
    }
  }

  return res.json({
    acked: parsed.data.items.map(item => ({
      queueId: item.queueId,
      entityId: item.entityId,
      status: 'synced',
    })),
    rejected: [],
  });
}));

syncRouter.get('/pull', asyncHandler(async (req, res) => {
  const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : null;
  const syncedSales = await listSyncedSales();
  const nextCursor = cursor ?? `dev-cursor-${Date.now()}`;

  await updateDevicePullCursor(typeof req.query.deviceId === 'string' ? req.query.deviceId : '', nextCursor);

  return res.json({
    cursor: nextCursor,
    changes: {
      ...getBaseDemoChanges(),
      sales: syncedSales,
    },
  });
}));
