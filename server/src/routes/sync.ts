import { Router } from 'express';
import { z } from 'zod';
import { getBaseDemoChanges } from '../data/demo';
import { listSyncedSales, saveSyncedSale } from '../persistence/sales-store';
import { updateDevicePullCursor } from '../persistence/auth-store';
import {
  listCustomers,
  listProducts,
  listSettings,
  listSuppliers,
  saveCustomer,
  saveProduct,
  saveSetting,
  saveSupplier,
} from '../persistence/master-data-store';
import { asyncHandler } from '../utils/async-handler';
import { requireAuth } from '../middleware/require-auth';

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
syncRouter.use(asyncHandler(requireAuth));

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

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

    if (item.entityType === 'setting' && /^setting\.(create|update|upsert)$/.test(item.operation)) {
      const raw = asRecord(item.payload.setting) ?? item.payload;
      if ('key' in raw && 'value' in raw) {
        await saveSetting({
          key: String(raw.key),
          value: String(raw.value),
          updatedAt: String(raw.updatedAt ?? item.createdAt),
        });
      }
    }

    if (item.entityType === 'customer' && /^customer\.(create|update|upsert)$/.test(item.operation)) {
      const raw = asRecord(item.payload.customer) ?? item.payload;
      if ('id' in raw && 'name' in raw) {
        await saveCustomer({
          id: String(raw.id),
          name: String(raw.name),
          phone: String(raw.phone ?? ''),
          type: String(raw.type ?? 'regular'),
          active: Boolean(raw.active ?? true),
          notes: String(raw.notes ?? ''),
          createdAt: String(raw.createdAt ?? item.createdAt),
          updatedAt: String(raw.updatedAt ?? item.createdAt),
        });
      }
    }

    if (item.entityType === 'product' && /^product\.(create|update|upsert)$/.test(item.operation)) {
      const raw = asRecord(item.payload.product) ?? item.payload;
      if ('id' in raw && 'name' in raw) {
        await saveProduct({
          id: String(raw.id),
          name: String(raw.name),
          price: Number(raw.price ?? 0),
          wholesalePrice: Number(raw.wholesalePrice ?? raw.price ?? 0),
          costPrice: Number(raw.costPrice ?? 0),
          currentStock: Number(raw.currentStock ?? 0),
          active: Boolean(raw.active ?? true),
          categoryId: raw.categoryId ? String(raw.categoryId) : null,
          unitLabel: String(raw.unitLabel ?? ''),
          supplierId: raw.supplierId ? String(raw.supplierId) : null,
          sku: String(raw.sku ?? ''),
          image: String(raw.image ?? ''),
          createdAt: String(raw.createdAt ?? item.createdAt),
          updatedAt: String(raw.updatedAt ?? item.createdAt),
        });
      }
    }

    if (item.entityType === 'supplier' && /^supplier\.(create|update|upsert)$/.test(item.operation)) {
      const raw = asRecord(item.payload.supplier) ?? item.payload;
      if ('id' in raw && 'name' in raw) {
        await saveSupplier({
          id: String(raw.id),
          name: String(raw.name),
          phone: String(raw.phone ?? ''),
          active: Boolean(raw.active ?? true),
          notes: String(raw.notes ?? ''),
          createdAt: String(raw.createdAt ?? item.createdAt),
          updatedAt: String(raw.updatedAt ?? item.createdAt),
        });
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
  const baseChanges = getBaseDemoChanges();
  const [settings, customers, products, suppliers] = await Promise.all([
    listSettings(),
    listCustomers(),
    listProducts(),
    listSuppliers(),
  ]);

  const requestedDeviceId =
    typeof req.query.deviceId === 'string' && req.query.deviceId
      ? req.query.deviceId
      : String(res.locals.auth?.device?.id ?? '');

  await updateDevicePullCursor(requestedDeviceId, nextCursor);

  return res.json({
    cursor: nextCursor,
    changes: {
      ...baseChanges,
      settings,
      customers,
      products,
      suppliers,
      sales: syncedSales,
    },
  });
}));
