import { getDb } from '../client';
import type { Sale } from '@/types/domain';

interface SaleRow {
  id: string;
  receipt_no: string;
  date: string;
  time: string;
  session_id: string | null;
  customer_id: string | null;
  staff_id: string;
  subtotal: number;
  discount: number;
  total: number;
  payment_method: 'cash' | 'debt';
  amount_paid: number;
  change_amount: number;
  status: 'completed' | 'voided';
  created_at: string;
  updated_at: string;
}

interface SaleItemRow {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  variant_label: string | null;
  quantity: number;
  unit_price: number;
  discount: number;
  total: number;
  created_at: string;
}

export const salesRepository = {
  async list(): Promise<Sale[]> {
    const db = await getDb();
    const sales = await db.getAllAsync<SaleRow>('SELECT * FROM sales ORDER BY date DESC, time DESC');
    const items = await db.getAllAsync<SaleItemRow>('SELECT * FROM sale_items ORDER BY created_at ASC');

    return sales.map(sale => ({
      id: sale.id,
      receiptNo: sale.receipt_no,
      date: sale.date,
      time: sale.time,
      sessionId: sale.session_id,
      customerId: sale.customer_id,
      staffId: sale.staff_id,
      subtotal: sale.subtotal,
      discount: sale.discount,
      total: sale.total,
      paymentMethod: sale.payment_method,
      amountPaid: sale.amount_paid,
      change: sale.change_amount,
      status: sale.status,
      items: items.filter(item => item.sale_id === sale.id).map(item => ({
        productId: item.product_id,
        productName: item.product_name,
        variantLabel: item.variant_label,
        quantity: item.quantity,
        unitPrice: item.unit_price,
        discount: item.discount,
        total: item.total,
      })),
      paymentHistory: [],
    }));
  },

  async getById(id: string): Promise<Sale | null> {
    const sales = await this.list();
    return sales.find((sale) => sale.id === id) ?? null;
  },

  async save(sale: Sale) {
    const db = await getDb();
    const now = new Date().toISOString();

    await db.execAsync('BEGIN');
    try {
      await db.runAsync(
        `INSERT OR REPLACE INTO sales (
          id, receipt_no, date, time, session_id, customer_id, staff_id, subtotal, discount, total, payment_method, amount_paid, change_amount, status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        sale.id,
        sale.receiptNo,
        sale.date,
        sale.time,
        sale.sessionId,
        sale.customerId,
        sale.staffId,
        sale.subtotal,
        sale.discount,
        sale.total,
        sale.paymentMethod,
        sale.amountPaid,
        sale.change,
        sale.status,
        now,
        now
      );

      await db.runAsync('DELETE FROM sale_items WHERE sale_id = ?', sale.id);

      for (const item of sale.items) {
        await db.runAsync(
          `INSERT INTO sale_items (
            id, sale_id, product_id, product_name, variant_label, quantity, unit_price, discount, total, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          `${sale.id}_${item.productId}_${item.variantLabel ?? 'base'}`,
          sale.id,
          item.productId,
          item.productName,
          item.variantLabel,
          item.quantity,
          item.unitPrice,
          item.discount,
          item.total,
          now
        );
      }

      await db.execAsync('COMMIT');
    } catch (error) {
      await db.execAsync('ROLLBACK');
      throw error;
    }

    return sale;
  },
};
