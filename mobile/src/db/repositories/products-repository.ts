import { getDb } from '../client';

interface ProductRow {
  id: string;
  name: string;
  price: number;
  wholesale_price: number;
  cost_price: number;
  category_id: string | null;
  unit_label: string;
  supplier_id: string | null;
  sku: string;
  image: string;
  active: number;
  current_stock: number;
  created_at: string;
  updated_at: string;
}

export const productsRepository = {
  async list() {
    const db = await getDb();
    const rows = await db.getAllAsync<ProductRow>(
      'SELECT * FROM products WHERE active = 1 ORDER BY name ASC'
    );
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      price: row.price,
      wholesalePrice: row.wholesale_price,
      costPrice: row.cost_price,
      categoryId: row.category_id,
      unitLabel: row.unit_label,
      supplierId: row.supplier_id,
      sku: row.sku,
      image: row.image,
      active: row.active === 1,
      stock: row.current_stock,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));
  },

  async saveMany(
    products: Array<{
      id: string;
      name: string;
      price: number;
      wholesalePrice?: number;
      costPrice?: number;
      categoryId?: string | null;
      unitLabel?: string;
      supplierId?: string | null;
      sku?: string;
      image?: string;
      active?: boolean;
      currentStock?: number;
      createdAt?: string;
      updatedAt?: string;
    }>
  ) {
    const db = await getDb();
    const now = new Date().toISOString();

    for (const product of products) {
      await db.runAsync(
        `INSERT OR REPLACE INTO products (
          id, name, price, wholesale_price, cost_price, category_id, unit_label, supplier_id, sku, image, active, current_stock, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        product.id,
        product.name,
        product.price,
        product.wholesalePrice ?? product.price,
        product.costPrice ?? 0,
        product.categoryId ?? null,
        product.unitLabel ?? '',
        product.supplierId ?? null,
        product.sku ?? '',
        product.image ?? '',
        product.active === false ? 0 : 1,
        product.currentStock ?? 0,
        product.createdAt ?? now,
        product.updatedAt ?? now
      );
    }
  },
};
