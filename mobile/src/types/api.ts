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

export interface SaleCreatePayload {
  sale: Sale;
  saleItems: Sale['items'];
  payments: Sale['paymentHistory'];
  stockMovements: unknown[];
}
