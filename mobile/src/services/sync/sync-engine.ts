import { customersRepository } from '@/db/repositories/customers-repository';
import { productsRepository } from '@/db/repositories/products-repository';
import { syncQueueRepository } from '@/db/repositories/sync-queue-repository';
import { pullSync, pushSync } from '../api/sync-api';

export async function runSync(token: string, deviceId: string, cursor: string | null = null) {
  const pending = await syncQueueRepository.listPending();

  if (pending.length > 0) {
    await pushSync(
      {
        deviceId,
        items: pending.map(item => ({
          queueId: item.id,
          entityType: item.entityType,
          entityId: item.entityId,
          operation: item.operation,
          createdAt: item.createdAt,
          payload: JSON.parse(item.payloadJson),
        })),
      },
      token
    );

    for (const item of pending) {
      await syncQueueRepository.markSynced(item.id);
    }
  }

  const pulled = await pullSync(cursor, token);

  await productsRepository.saveMany((pulled.changes.products as Array<Record<string, unknown>> | undefined)?.map(product => ({
    id: String(product.id),
    name: String(product.name),
    price: Number(product.price ?? 0),
    wholesalePrice: Number(product.wholesalePrice ?? product.price ?? 0),
    costPrice: Number(product.costPrice ?? 0),
    active: Boolean(product.active ?? true),
    currentStock: Number(product.currentStock ?? 0),
  })) ?? []);

  await customersRepository.saveMany((pulled.changes.customers as Array<Record<string, unknown>> | undefined)?.map(customer => ({
    id: String(customer.id),
    name: String(customer.name),
    phone: String(customer.phone ?? ''),
    type: (customer.type === 'wholesale' ? 'wholesale' : 'regular') as 'regular' | 'wholesale',
    active: Boolean(customer.active ?? true),
  })) ?? []);

  return {
    pushed: pending.length,
    pulled: Object.values(pulled.changes).reduce((sum, rows) => sum + rows.length, 0),
    cursor: pulled.cursor,
  };
}
