export interface SyncedSaleItemRecord {
  productId: string;
  productName: string;
  variantLabel?: string | null;
  quantity: number;
  unitPrice: number;
  discount?: number;
  total: number;
}

export interface SyncedSalePaymentHistoryRecord {
  id: string;
  date: string;
  amount: number;
  remark?: string;
  createdAt: string;
}

export interface SyncedSaleRecord {
  id: string;
  receiptNo?: string;
  date?: string;
  time?: string;
  sessionId?: string | null;
  customerId?: string | null;
  staffId?: string;
  total?: number;
  subtotal?: number;
  discount?: number;
  paymentMethod?: 'cash' | 'debt' | string;
  amountPaid?: number;
  change?: number;
  status?: string;
  items?: SyncedSaleItemRecord[];
  paymentHistory?: SyncedSalePaymentHistoryRecord[];
  [key: string]: unknown;
}
