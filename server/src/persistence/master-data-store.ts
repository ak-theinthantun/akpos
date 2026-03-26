import { Pool } from 'pg';
import { getServerEnv } from '../config/env';
import { demoChanges } from '../data/demo';

type SettingRecord = {
  key: string;
  value: string;
  updatedAt: string;
};

type CustomerRecord = {
  id: string;
  name: string;
  phone?: string;
  type: string;
  active?: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
};

type ProductRecord = {
  id: string;
  name: string;
  price: number;
  wholesalePrice?: number;
  costPrice?: number;
  currentStock?: number;
  active?: boolean;
  categoryId?: string | null;
  unitLabel?: string;
  supplierId?: string | null;
  sku?: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
};

let pool: Pool | null = null;
const memorySettings = new Map<string, SettingRecord>(
  demoChanges.settings.map(setting => [
    setting.key,
    {
      key: setting.key,
      value: String(setting.value),
      updatedAt: setting.updatedAt,
    },
  ])
);
const memoryCustomers = new Map<string, CustomerRecord>(
  demoChanges.customers.map(customer => [
    customer.id,
    {
      id: customer.id,
      name: customer.name,
      phone: customer.phone ?? '',
      type: customer.type ?? 'regular',
      active: customer.active ?? true,
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ])
);
const memoryProducts = new Map<string, ProductRecord>(
  demoChanges.products.map(product => [
    product.id,
    {
      id: product.id,
      name: product.name,
      price: Number(product.price ?? 0),
      wholesalePrice: Number(product.wholesalePrice ?? product.price ?? 0),
      costPrice: Number(product.costPrice ?? 0),
      currentStock: Number(product.currentStock ?? 0),
      active: product.active ?? true,
      categoryId: null,
      unitLabel: '',
      supplierId: null,
      sku: '',
      image: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ])
);

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

export async function ensureMasterDataSchema() {
  const db = getPool();
  if (!db) {
    return { mode: 'memory' as const };
  }

  await db.query(`
    CREATE TABLE IF NOT EXISTS store_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      type TEXT NOT NULL DEFAULT 'regular',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      notes TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      price NUMERIC NOT NULL DEFAULT 0,
      wholesale_price NUMERIC NOT NULL DEFAULT 0,
      cost_price NUMERIC NOT NULL DEFAULT 0,
      current_stock NUMERIC NOT NULL DEFAULT 0,
      active BOOLEAN NOT NULL DEFAULT TRUE,
      category_id TEXT,
      unit_label TEXT NOT NULL DEFAULT '',
      supplier_id TEXT,
      sku TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await seedMasterDataIfEmpty();

  return { mode: 'postgres' as const };
}

async function seedMasterDataIfEmpty() {
  const db = getPool();
  if (!db) return;

  const settingsCount = await db.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM store_settings');
  if (Number(settingsCount.rows[0]?.count ?? 0) === 0) {
    for (const setting of demoChanges.settings) {
      await db.query(
        `INSERT INTO store_settings (key, value, updated_at)
         VALUES ($1, $2, $3)`,
        [setting.key, String(setting.value), setting.updatedAt]
      );
    }
  }

  const customersCount = await db.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM customers');
  if (Number(customersCount.rows[0]?.count ?? 0) === 0) {
    for (const customer of demoChanges.customers) {
      await db.query(
        `INSERT INTO customers (id, name, phone, type, active, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
        [
          customer.id,
          customer.name,
          customer.phone ?? '',
          customer.type ?? 'regular',
          customer.active ?? true,
          '',
        ]
      );
    }
  }

  const productsCount = await db.query<{ count: string }>('SELECT COUNT(*)::text AS count FROM products');
  if (Number(productsCount.rows[0]?.count ?? 0) === 0) {
    for (const product of demoChanges.products) {
      await db.query(
        `INSERT INTO products (
          id, name, price, wholesale_price, cost_price, current_stock, active, category_id, unit_label, supplier_id, sku, image, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, NULL, '', NULL, '', '', NOW(), NOW()
        )`,
        [
          product.id,
          product.name,
          Number(product.price ?? 0),
          Number(product.wholesalePrice ?? product.price ?? 0),
          Number(product.costPrice ?? 0),
          Number(product.currentStock ?? 0),
          product.active ?? true,
        ]
      );
    }
  }
}

export async function listSettings(): Promise<SettingRecord[]> {
  const db = getPool();
  if (!db) {
    return Array.from(memorySettings.values()).sort((a, b) => a.key.localeCompare(b.key));
  }

  await ensureMasterDataSchema();

  const result = await db.query<{
    key: string;
    value: string;
    updated_at: Date;
  }>('SELECT key, value, updated_at FROM store_settings ORDER BY key ASC');

  return result.rows.map(row => ({
    key: row.key,
    value: row.value,
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function listCustomers(): Promise<CustomerRecord[]> {
  const db = getPool();
  if (!db) {
    return Array.from(memoryCustomers.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  await ensureMasterDataSchema();

  const result = await db.query<{
    id: string;
    name: string;
    phone: string;
    type: string;
    active: boolean;
    notes: string;
    created_at: Date;
    updated_at: Date;
  }>('SELECT * FROM customers ORDER BY name ASC');

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    phone: row.phone,
    type: row.type,
    active: row.active,
    notes: row.notes,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function listProducts(): Promise<ProductRecord[]> {
  const db = getPool();
  if (!db) {
    return Array.from(memoryProducts.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  await ensureMasterDataSchema();

  const result = await db.query<{
    id: string;
    name: string;
    price: string;
    wholesale_price: string;
    cost_price: string;
    current_stock: string;
    active: boolean;
    category_id: string | null;
    unit_label: string;
    supplier_id: string | null;
    sku: string;
    image: string;
    created_at: Date;
    updated_at: Date;
  }>('SELECT * FROM products ORDER BY name ASC');

  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    price: Number(row.price),
    wholesalePrice: Number(row.wholesale_price),
    costPrice: Number(row.cost_price),
    currentStock: Number(row.current_stock),
    active: row.active,
    categoryId: row.category_id,
    unitLabel: row.unit_label,
    supplierId: row.supplier_id,
    sku: row.sku,
    image: row.image,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  }));
}

export async function saveSetting(setting: SettingRecord) {
  const db = getPool();
  if (!db) {
    memorySettings.set(setting.key, setting);
    return;
  }

  await ensureMasterDataSchema();
  await db.query(
    `INSERT INTO store_settings (key, value, updated_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (key) DO UPDATE SET
       value = EXCLUDED.value,
       updated_at = EXCLUDED.updated_at`,
    [setting.key, setting.value, setting.updatedAt]
  );
}

export async function saveCustomer(customer: CustomerRecord) {
  const db = getPool();
  if (!db) {
    memoryCustomers.set(customer.id, {
      id: customer.id,
      name: customer.name,
      phone: customer.phone ?? '',
      type: customer.type,
      active: customer.active ?? true,
      notes: customer.notes ?? '',
      updatedAt: customer.updatedAt ?? new Date().toISOString(),
      createdAt: customer.createdAt ?? new Date().toISOString(),
    });
    return;
  }

  await ensureMasterDataSchema();
  await db.query(
    `INSERT INTO customers (id, name, phone, type, active, notes, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       phone = EXCLUDED.phone,
       type = EXCLUDED.type,
       active = EXCLUDED.active,
       notes = EXCLUDED.notes,
       updated_at = EXCLUDED.updated_at`,
    [
      customer.id,
      customer.name,
      customer.phone ?? '',
      customer.type,
      customer.active ?? true,
      customer.notes ?? '',
      customer.createdAt ?? new Date().toISOString(),
      customer.updatedAt ?? new Date().toISOString(),
    ]
  );
}

export async function saveProduct(product: ProductRecord) {
  const db = getPool();
  if (!db) {
    memoryProducts.set(product.id, {
      id: product.id,
      name: product.name,
      price: product.price,
      wholesalePrice: product.wholesalePrice ?? product.price,
      costPrice: product.costPrice ?? 0,
      currentStock: product.currentStock ?? 0,
      active: product.active ?? true,
      categoryId: product.categoryId ?? null,
      unitLabel: product.unitLabel ?? '',
      supplierId: product.supplierId ?? null,
      sku: product.sku ?? '',
      image: product.image ?? '',
      updatedAt: product.updatedAt ?? new Date().toISOString(),
      createdAt: product.createdAt ?? new Date().toISOString(),
    });
    return;
  }

  await ensureMasterDataSchema();
  await db.query(
    `INSERT INTO products (
      id, name, price, wholesale_price, cost_price, current_stock, active, category_id, unit_label, supplier_id, sku, image, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      price = EXCLUDED.price,
      wholesale_price = EXCLUDED.wholesale_price,
      cost_price = EXCLUDED.cost_price,
      current_stock = EXCLUDED.current_stock,
      active = EXCLUDED.active,
      category_id = EXCLUDED.category_id,
      unit_label = EXCLUDED.unit_label,
      supplier_id = EXCLUDED.supplier_id,
      sku = EXCLUDED.sku,
      image = EXCLUDED.image,
      updated_at = EXCLUDED.updated_at`,
    [
      product.id,
      product.name,
      product.price,
      product.wholesalePrice ?? product.price,
      product.costPrice ?? 0,
      product.currentStock ?? 0,
      product.active ?? true,
      product.categoryId ?? null,
      product.unitLabel ?? '',
      product.supplierId ?? null,
      product.sku ?? '',
      product.image ?? '',
      product.createdAt ?? new Date().toISOString(),
      product.updatedAt ?? new Date().toISOString(),
    ]
  );
}
