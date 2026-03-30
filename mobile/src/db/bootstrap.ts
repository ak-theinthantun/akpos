import type { SQLiteDatabase } from 'expo-sqlite';

const nowIso = new Date().toISOString();
const today = nowIso.slice(0, 10);

const seedProducts = [
  {
    id: 'p1',
    name: 'Coca Cola 330ml',
    price: 500,
    wholesale_price: 450,
    cost_price: 350,
    category_id: 'c1',
    unit_label: 'btl',
    supplier_id: 's2',
    sku: 'BEV001',
    current_stock: 120,
  },
  {
    id: 'p4',
    name: 'Lays Chips',
    price: 600,
    wholesale_price: 540,
    cost_price: 420,
    category_id: 'c2',
    unit_label: 'pcs',
    supplier_id: 's1',
    sku: 'SNK001',
    current_stock: 60,
  },
  {
    id: 'p8',
    name: 'Shampoo 200ml',
    price: 1800,
    wholesale_price: 1550,
    cost_price: 1100,
    category_id: 'c3',
    unit_label: 'btl',
    supplier_id: 's1',
    sku: 'PC001',
    current_stock: 35,
  },
];

const seedCustomers = [
  { id: 'cust1', name: 'Ko Aung', phone: '09-123-456', type: 'regular', active: 1, notes: '' },
  { id: 'cust2', name: 'Ma Hnin', phone: '09-234-567', type: 'wholesale', active: 1, notes: 'Wholesale buyer' },
];

const seedSuppliers = [
  { id: 'sup1', name: 'Golden Distribution', phone: '09-777-111', active: 1, notes: 'Snack supplier' },
  { id: 'sup2', name: 'City Beverage Trading', phone: '09-888-222', active: 1, notes: 'Beverage supplier' },
];

export async function bootstrapDemoData(db: SQLiteDatabase) {
  const productCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM products');
  if ((productCount?.count ?? 0) === 0) {
    for (const product of seedProducts) {
      await db.runAsync(
        `INSERT INTO products (
          id, name, price, wholesale_price, cost_price, category_id, unit_label, supplier_id, sku, image, active, current_stock, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '', 1, ?, ?, ?)`,
        product.id,
        product.name,
        product.price,
        product.wholesale_price,
        product.cost_price,
        product.category_id,
        product.unit_label,
        product.supplier_id,
        product.sku,
        product.current_stock,
        nowIso,
        nowIso
      );
    }
  }

  const customerCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM customers');
  if ((customerCount?.count ?? 0) === 0) {
    for (const customer of seedCustomers) {
      await db.runAsync(
        `INSERT INTO customers (
          id, name, phone, type, active, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        customer.id,
        customer.name,
        customer.phone,
        customer.type,
        customer.active,
        customer.notes,
        today,
        nowIso
      );
    }
  }

  const supplierCount = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM suppliers');
  if ((supplierCount?.count ?? 0) === 0) {
    for (const supplier of seedSuppliers) {
      await db.runAsync(
        `INSERT INTO suppliers (
          id, name, phone, active, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        supplier.id,
        supplier.name,
        supplier.phone,
        supplier.active,
        supplier.notes,
        today,
        nowIso
      );
    }
  }

  await db.runAsync(
    `INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, ?)`,
    'shop_name',
    'AKPOS',
    nowIso
  );
}
