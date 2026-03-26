import { Pool } from 'pg';
import type {
  SyncedSaleItemRecord,
  SyncedSalePaymentHistoryRecord,
  SyncedSaleRecord,
} from '../types/sales';
import { getServerEnv } from '../config/env';

let pool: Pool | null = null;
const memorySales: SyncedSaleRecord[] = [];
const memorySaleItems = new Map<string, SyncedSaleItemRecord[]>();
const memorySalePayments = new Map<string, SyncedSalePaymentHistoryRecord[]>();
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
const salesTableSql = `
  CREATE TABLE IF NOT EXISTS sales (
    id TEXT PRIMARY KEY,
    receipt_no TEXT,
    sale_date TEXT,
    sale_time TEXT,
    session_id TEXT,
    customer_id TEXT,
    staff_id TEXT,
    subtotal NUMERIC NOT NULL DEFAULT 0,
    discount NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    payment_method TEXT NOT NULL DEFAULT 'cash',
    amount_paid NUMERIC NOT NULL DEFAULT 0,
    change_amount NUMERIC NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed',
    payload_json JSONB NOT NULL,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
const saleItemsTableSql = `
  CREATE TABLE IF NOT EXISTS sale_items (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    product_id TEXT NOT NULL,
    product_name TEXT NOT NULL,
    variant_label TEXT,
    quantity NUMERIC NOT NULL DEFAULT 0,
    unit_price NUMERIC NOT NULL DEFAULT 0,
    discount NUMERIC NOT NULL DEFAULT 0,
    total NUMERIC NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  )
`;
const salePaymentsTableSql = `
  CREATE TABLE IF NOT EXISTS sale_payments (
    id TEXT PRIMARY KEY,
    sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    payment_date TEXT NOT NULL,
    amount NUMERIC NOT NULL DEFAULT 0,
    remark TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  await db.query(salesTableSql);
  await db.query(saleItemsTableSql);
  await db.query(salePaymentsTableSql);
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
    memorySaleItems.set(sale.id, sale.items ?? []);
    memorySalePayments.set(sale.id, sale.paymentHistory ?? []);
    return;
  }

  await ensureSalesSchema();

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

  await db.query(
    `INSERT INTO sales (
      id, receipt_no, sale_date, sale_time, session_id, customer_id, staff_id, subtotal, discount, total,
      payment_method, amount_paid, change_amount, status, payload_json, synced_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
      $11, $12, $13, $14, $15, NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      receipt_no = EXCLUDED.receipt_no,
      sale_date = EXCLUDED.sale_date,
      sale_time = EXCLUDED.sale_time,
      session_id = EXCLUDED.session_id,
      customer_id = EXCLUDED.customer_id,
      staff_id = EXCLUDED.staff_id,
      subtotal = EXCLUDED.subtotal,
      discount = EXCLUDED.discount,
      total = EXCLUDED.total,
      payment_method = EXCLUDED.payment_method,
      amount_paid = EXCLUDED.amount_paid,
      change_amount = EXCLUDED.change_amount,
      status = EXCLUDED.status,
      payload_json = EXCLUDED.payload_json,
      synced_at = NOW()`,
    [
      sale.id,
      sale.receiptNo ?? null,
      sale.date ?? null,
      sale.time ?? null,
      sale.sessionId ?? null,
      sale.customerId ?? null,
      sale.staffId ?? null,
      Number(sale.subtotal ?? 0),
      Number(sale.discount ?? 0),
      Number(sale.total ?? 0),
      sale.paymentMethod ?? 'cash',
      Number(sale.amountPaid ?? 0),
      Number(sale.change ?? 0),
      sale.status ?? 'completed',
      JSON.stringify(sale),
    ]
  );

  await db.query('DELETE FROM sale_items WHERE sale_id = $1', [sale.id]);
  for (const [index, item] of (sale.items ?? []).entries()) {
    await db.query(
      `INSERT INTO sale_items (
        id, sale_id, product_id, product_name, variant_label, quantity, unit_price, discount, total, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())`,
      [
        `${sale.id}_item_${index + 1}`,
        sale.id,
        item.productId,
        item.productName,
        item.variantLabel ?? null,
        Number(item.quantity ?? 0),
        Number(item.unitPrice ?? 0),
        Number(item.discount ?? 0),
        Number(item.total ?? 0),
      ]
    );
  }

  await db.query('DELETE FROM sale_payments WHERE sale_id = $1', [sale.id]);
  for (const payment of sale.paymentHistory ?? []) {
    await db.query(
      `INSERT INTO sale_payments (
        id, sale_id, payment_date, amount, remark, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        payment.id,
        sale.id,
        payment.date,
        Number(payment.amount ?? 0),
        payment.remark ?? '',
        payment.createdAt ?? new Date().toISOString(),
      ]
    );
  }
}

export async function listSyncedSales(): Promise<SyncedSaleRecord[]> {
  const db = getPool();
  if (!db) {
    return memorySales.map((sale) => ({
      ...sale,
      items: memorySaleItems.get(sale.id) ?? sale.items ?? [],
      paymentHistory: memorySalePayments.get(sale.id) ?? sale.paymentHistory ?? [],
    }));
  }

  await ensureSalesSchema();

  const salesResult = await db.query<{
    id: string;
    payload_json: SyncedSaleRecord;
  }>('SELECT id, payload_json FROM sales ORDER BY synced_at DESC');

  const itemsResult = await db.query<{
    sale_id: string;
    product_id: string;
    product_name: string;
    variant_label: string | null;
    quantity: string;
    unit_price: string;
    discount: string;
    total: string;
  }>('SELECT sale_id, product_id, product_name, variant_label, quantity, unit_price, discount, total FROM sale_items ORDER BY created_at ASC');

  const paymentsResult = await db.query<{
    sale_id: string;
    id: string;
    payment_date: string;
    amount: string;
    remark: string;
    created_at: Date;
  }>('SELECT sale_id, id, payment_date, amount, remark, created_at FROM sale_payments ORDER BY created_at ASC');

  return salesResult.rows.map((row) => ({
    ...row.payload_json,
    items: itemsResult.rows
      .filter((item) => item.sale_id === row.id)
      .map((item) => ({
        productId: item.product_id,
        productName: item.product_name,
        variantLabel: item.variant_label,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
        discount: Number(item.discount),
        total: Number(item.total),
      })),
    paymentHistory: paymentsResult.rows
      .filter((payment) => payment.sale_id === row.id)
      .map((payment) => ({
        id: payment.id,
        date: payment.payment_date,
        amount: Number(payment.amount),
        remark: payment.remark,
        createdAt: payment.created_at.toISOString(),
      })),
  }));
}

export async function getSyncedSaleById(id: string): Promise<SyncedSaleRecord | null> {
  const sales = await listSyncedSales();
  return sales.find((sale) => sale.id === id) ?? null;
}

export async function listSaleSummaries(): Promise<
  Array<{
    id: string;
    receiptNo: string | null;
    date: string | null;
    time: string | null;
    customerId: string | null;
    staffId: string | null;
    total: number;
    amountPaid: number;
    paymentMethod: string;
    status: string;
    itemCount: number;
    paymentCount: number;
  }>
> {
  const db = getPool();
  if (!db) {
    return memorySales.map((sale) => ({
      id: sale.id,
      receiptNo: sale.receiptNo ?? null,
      date: sale.date ?? null,
      time: sale.time ?? null,
      customerId: sale.customerId ?? null,
      staffId: sale.staffId ?? null,
      total: Number(sale.total ?? 0),
      amountPaid: Number(sale.amountPaid ?? 0),
      paymentMethod: String(sale.paymentMethod ?? 'cash'),
      status: String(sale.status ?? 'completed'),
      itemCount: memorySaleItems.get(sale.id)?.length ?? sale.items?.length ?? 0,
      paymentCount: memorySalePayments.get(sale.id)?.length ?? sale.paymentHistory?.length ?? 0,
    }));
  }

  await ensureSalesSchema();

  const result = await db.query<{
    id: string;
    receipt_no: string | null;
    sale_date: string | null;
    sale_time: string | null;
    customer_id: string | null;
    staff_id: string | null;
    total: string;
    amount_paid: string;
    payment_method: string;
    status: string;
    item_count: string;
    payment_count: string;
  }>(
    `SELECT
      s.id,
      s.receipt_no,
      s.sale_date,
      s.sale_time,
      s.customer_id,
      s.staff_id,
      s.total,
      s.amount_paid,
      s.payment_method,
      s.status,
      COUNT(DISTINCT si.id)::text AS item_count,
      COUNT(DISTINCT sp.id)::text AS payment_count
     FROM sales s
     LEFT JOIN sale_items si ON si.sale_id = s.id
     LEFT JOIN sale_payments sp ON sp.sale_id = s.id
     GROUP BY s.id
     ORDER BY s.synced_at DESC`
  );

  return result.rows.map((row) => ({
    id: row.id,
    receiptNo: row.receipt_no,
    date: row.sale_date,
    time: row.sale_time,
    customerId: row.customer_id,
    staffId: row.staff_id,
    total: Number(row.total),
    amountPaid: Number(row.amount_paid),
    paymentMethod: row.payment_method,
    status: row.status,
    itemCount: Number(row.item_count),
    paymentCount: Number(row.payment_count),
  }));
}

export async function getSalesSummary() {
  const summaries = await listSaleSummaries();
  const totalSales = summaries.length;
  const grossSales = summaries.reduce((sum, sale) => sum + sale.total, 0);
  const paidSales = summaries.filter((sale) => sale.paymentMethod === 'cash' || sale.amountPaid >= sale.total).length;
  const creditSales = summaries.filter((sale) => sale.paymentMethod === 'debt' || sale.amountPaid < sale.total).length;
  const outstandingBalance = summaries.reduce(
    (sum, sale) => sum + Math.max(0, sale.total - sale.amountPaid),
    0
  );

  return {
    totalSales,
    grossSales,
    paidSales,
    creditSales,
    outstandingBalance,
  };
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
