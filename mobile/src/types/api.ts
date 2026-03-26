import type { Sale } from './domain';

export interface LoginRequest {
  username: string;
  password: string;
  deviceId: string;
  deviceName: string;
  platform: 'android' | 'ios' | 'web';
  appVersion: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    role: string;
  };
  shop: {
    id: string;
    name: string;
  };
  device: {
    id: string;
    lastPullCursor: string | null;
  };
}

export interface PushSyncItem {
  queueId: string;
  entityType: string;
  entityId: string;
  operation: string;
  createdAt: string;
  payload: Record<string, unknown>;
}

export interface PushSyncRequest {
  deviceId: string;
  items: PushSyncItem[];
}

export interface PullSyncResponse {
  cursor: string;
  changes: Record<string, unknown[]>;
}

export interface OrderSummaryResponse {
  orders: Array<{
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
  }>;
}

export interface OrderDetailResponse {
  order: Sale;
}

export interface ReportSummaryResponse {
  summary: {
    totalSales: number;
    grossSales: number;
    paidSales: number;
    creditSales: number;
    outstandingBalance: number;
  };
}

export interface SaleCreatePayload {
  sale: Sale;
  saleItems: Sale['items'];
  payments: Sale['paymentHistory'];
  stockMovements: unknown[];
}
