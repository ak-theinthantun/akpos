import { getDb } from '../client';
import type { SyncQueueItem } from '@/types/domain';

export const syncQueueRepository = {
  async listPending(): Promise<SyncQueueItem[]> {
    const db = await getDb();
    return db.getAllAsync<SyncQueueItem>(
      'SELECT * FROM sync_queue WHERE status IN (?, ?) ORDER BY created_at ASC',
      'pending',
      'failed'
    );
  },

  async enqueue(item: SyncQueueItem) {
    const db = await getDb();
    await db.runAsync(
      `INSERT OR REPLACE INTO sync_queue (
        id, entity_type, entity_id, operation, payload_json, device_id, status, retry_count, last_error, created_at, updated_at, synced_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      item.id,
      item.entityType,
      item.entityId,
      item.operation,
      item.payloadJson,
      item.deviceId,
      item.status,
      item.retryCount,
      item.lastError ?? null,
      item.createdAt,
      item.updatedAt,
      item.syncedAt ?? null
    );
    return item;
  },

  async markSynced(id: string) {
    const db = await getDb();
    await db.runAsync(
      'UPDATE sync_queue SET status = ?, synced_at = ?, updated_at = ? WHERE id = ?',
      'synced',
      new Date().toISOString(),
      new Date().toISOString(),
      id
    );
  }
};
