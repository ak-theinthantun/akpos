import type { SQLiteDatabase } from 'expo-sqlite';
import { migrations } from './migrations';

export async function runMigrations(db: SQLiteDatabase) {
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      executed_at TEXT NOT NULL
    );
  `);

  const executedRows = await db.getAllAsync<{ id: number }>('SELECT id FROM schema_migrations');
  const executedIds = new Set(executedRows.map(row => row.id));

  for (const migration of migrations) {
    if (executedIds.has(migration.id)) continue;

    await db.execAsync('BEGIN');
    try {
      await db.execAsync(migration.sql);
      await db.runAsync(
        'INSERT INTO schema_migrations (id, name, executed_at) VALUES (?, ?, ?)',
        migration.id,
        migration.name,
        new Date().toISOString()
      );
      await db.execAsync('COMMIT');
    } catch (error) {
      await db.execAsync('ROLLBACK');
      throw error;
    }
  }
}
