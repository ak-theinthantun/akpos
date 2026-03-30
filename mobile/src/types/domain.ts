export type Role = 'admin' | 'manager' | 'staff';

export interface User {
  id: string;
  name: string;
  username: string;
  role: Role;
  active: boolean;
  createdAt: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  type: 'regular' | 'wholesale';
  active: boolean;
  notes: string;
  createdAt: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  notes: string;
  createdAt: string;
}

export interface SalePaymentRecord {
  id: string;
  date: string;
  amount: number;
  remark: string;
  createdAt: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  variantLabel: string | null;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Sale {
  id: string;
  receiptNo: string;
  date: string;
  time: string;
  sessionId: string | null;
  customerId: string | null;
  staffId: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: 'cash' | 'debt';
  amountPaid: number;
  change: number;
  status: 'completed' | 'voided';
  couponCode?: string | null;
  couponDiscount?: number;
  items: SaleItem[];
  paymentHistory?: SalePaymentRecord[];
}

export interface SyncQueueItem {
  id: string;
  entityType: string;
  entityId: string;
  operation: string;
  payloadJson: string;
  deviceId: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  retryCount: number;
  lastError?: string | null;
  createdAt: string;
  updatedAt: string;
  syncedAt?: string | null;
}
