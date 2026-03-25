import { getDb } from '../client';

export const syncStateRepository = {
  async get(key: string): Promise<string | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM sync_state WHERE key = ?',
      key
    );
    return row?.value ?? null;
  },

  async set(key: string, value: string) {
    const db = await getDb();
    await db.runAsync(
      'INSERT OR REPLACE INTO sync_state (key, value, updated_at) VALUES (?, ?, ?)',
      key,
      value,
      new Date().toISOString()
    );
  },
};
