import { getDb } from '../client';
import { toBoolean } from '../helpers';
import type { Customer } from '@/types/domain';

interface CustomerRow {
  id: string;
  name: string;
  phone: string;
  type: 'regular' | 'wholesale';
  active: number;
  notes: string;
  created_at: string;
  updated_at: string;
}

export const customersRepository = {
  async list(): Promise<Customer[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<CustomerRow>(
      'SELECT * FROM customers WHERE active = 1 ORDER BY name ASC'
    );
    return rows.map(row => ({
      id: row.id,
      name: row.name,
      phone: row.phone,
      type: row.type,
      active: toBoolean(row.active),
      notes: row.notes,
      createdAt: row.created_at,
    }));
  },

  async save(customer: Customer) {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT OR REPLACE INTO customers (
        id, name, phone, type, active, notes, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      customer.id,
      customer.name,
      customer.phone,
      customer.type,
      customer.active ? 1 : 0,
      customer.notes,
      customer.createdAt,
      now
    );
    return customer;
  },
};
