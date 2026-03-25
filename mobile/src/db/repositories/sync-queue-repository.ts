import { getDb } from '../client';
import type { SyncQueueItem } from '@/types/domain';

interface SyncQueueRow {
  id: string;
  entity_type: string;
  entity_id: string;
  operation: string;
  payload_json: string;
  device_id: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retry_count: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  synced_at: string | null;
}

export const syncQueueRepository = {
  async listPending(): Promise<SyncQueueItem[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<SyncQueueRow>(
      'SELECT * FROM sync_queue WHERE status IN (?, ?) ORDER BY created_at ASC',
      'pending',
      'failed'
    );
    return rows.map(row => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      operation: row.operation,
      payloadJson: row.payload_json,
      deviceId: row.device_id,
      status: row.status,
      retryCount: row.retry_count,
      lastError: row.last_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncedAt: row.synced_at,
    }));
  },

  async listAll(): Promise<SyncQueueItem[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<SyncQueueRow>(
      'SELECT * FROM sync_queue ORDER BY created_at DESC'
    );
    return rows.map(row => ({
      id: row.id,
      entityType: row.entity_type,
      entityId: row.entity_id,
      operation: row.operation,
      payloadJson: row.payload_json,
      deviceId: row.device_id,
      status: row.status,
      retryCount: row.retry_count,
      lastError: row.last_error,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      syncedAt: row.synced_at,
    }));
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
  },

  async countPending() {
    const db = await getDb();
    const row = await db.getFirstAsync<{ count: number }>(
      'SELECT COUNT(*) as count FROM sync_queue WHERE status IN (?, ?)',
      'pending',
      'failed'
    );
    return row?.count ?? 0;
  }
};
