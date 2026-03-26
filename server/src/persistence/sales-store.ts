import { Pool } from 'pg';
import type { SyncedSaleRecord } from '../types/sales';
import { getServerEnv } from '../config/env';

let pool: Pool | null = null;
const memorySales: SyncedSaleRecord[] = [];
const syncedSalesTableSql = `
  CREATE TABLE IF NOT EXISTS synced_sales (
    id TEXT PRIMARY KEY,
    receipt_no TEXT,
    sale_date TEXT,
    sale_time TEXT,
    customer_id TEXT,
    staff_id TEXT,
    total NUMERIC NOT NULL DEFAULT 0,
    payload_json JSONB NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;

function getPool() {
  const env = getServerEnv({ requireJwtSecret: false });
  if (!env.databaseUrl) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: env.databaseUrl,
    });
  }
  return pool;
}

export async function ensureSalesSchema() {
  const db = getPool();
  if (!db) {
    return { mode: 'memory' as const };
  }

  await db.query(syncedSalesTableSql);
  return { mode: 'postgres' as const };
}

export async function initSalesStore() {
  return ensureSalesSchema();
}

export async function saveSyncedSale(sale: SyncedSaleRecord) {
  const db = getPool();
  if (!db) {
    const existingIndex = memorySales.findIndex((item) => item.id === sale.id);
    if (existingIndex >= 0) {
      memorySales[existingIndex] = sale;
    } else {
      memorySales.unshift(sale);
    }
    return;
  }

  await db.query(
    `INSERT INTO synced_sales (id, receipt_no, sale_date, sale_time, customer_id, staff_id, total, payload_json)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       receipt_no = EXCLUDED.receipt_no,
       sale_date = EXCLUDED.sale_date,
       sale_time = EXCLUDED.sale_time,
       customer_id = EXCLUDED.customer_id,
       staff_id = EXCLUDED.staff_id,
       total = EXCLUDED.total,
       payload_json = EXCLUDED.payload_json,
       synced_at = NOW()`,
    [
      sale.id,
      sale.receiptNo ?? null,
      sale.date ?? null,
      sale.time ?? null,
      sale.customerId ?? null,
      sale.staffId ?? null,
      Number(sale.total ?? 0),
      JSON.stringify(sale),
    ]
  );
}

export async function listSyncedSales(): Promise<SyncedSaleRecord[]> {
  const db = getPool();
  if (!db) {
    return [...memorySales];
  }

  const result = await db.query<{ payload_json: SyncedSaleRecord }>(
    'SELECT payload_json FROM synced_sales ORDER BY synced_at DESC'
  );
  return result.rows.map((row) => row.payload_json);
}

export function getPersistenceMode() {
  return getPool() ? 'postgres' : 'memory';
}

export async function checkPersistenceReadiness() {
  const db = getPool();
  if (!db) {
    return {
      ok: true,
      mode: 'memory' as const,
      detail: 'DATABASE_URL is not configured.',
    };
  }

  try {
    await db.query('SELECT 1');
    await db.query(
      `SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'synced_sales'
      ) AS exists`
    );

    return {
      ok: true,
      mode: 'postgres' as const,
      detail: 'Database connection is ready.',
    };
  } catch (error) {
    return {
      ok: false,
      mode: 'postgres' as const,
      detail: error instanceof Error ? error.message : 'Database readiness check failed.',
    };
  }
}
