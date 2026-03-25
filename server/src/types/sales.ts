export interface SyncedSaleRecord {
  id: string;
  receiptNo?: string;
  date?: string;
  time?: string;
  customerId?: string | null;
  staffId?: string;
  total?: number;
  subtotal?: number;
  discount?: number;
  paymentMethod?: 'cash' | 'debt' | string;
  amountPaid?: number;
  change?: number;
  status?: string;
  items?: unknown[];
  paymentHistory?: unknown[];
  [key: string]: unknown;
}
