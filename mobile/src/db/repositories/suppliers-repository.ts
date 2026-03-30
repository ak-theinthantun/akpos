import { getDb } from '../client';
import { toBoolean } from '../helpers';
import type { Supplier } from '@/types/domain';

interface SupplierRow {
  id: string;
  name: string;
  phone: string;
  active: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const suppliersRepository = {
  async list(): Promise<Supplier[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<SupplierRow>(
      'SELECT * FROM suppliers WHERE active = 1 ORDER BY name ASC'
    );
    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      active: toBoolean(row.active),
      notes: row.notes,
      createdAt: row.created_at,
    }));
  },

  async saveMany(
    suppliers: Array<{
      id: string;
      name: string;
      phone?: string;
      active?: boolean;
      notes?: string;
      createdAt?: string;
      updatedAt?: string;
    }>
  ) {
    const db = await getDb();
    const now = new Date().toISOString();

    for (const supplier of suppliers) {
      await db.runAsync(
        `INSERT OR REPLACE INTO suppliers (
          id, name, phone, active, notes, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        supplier.id,
        supplier.name,
        supplier.phone ?? '',
        supplier.active === false ? 0 : 1,
        supplier.notes ?? '',
        supplier.createdAt ?? now.slice(0, 10),
        supplier.updatedAt ?? now
      );
    }
  },
};
