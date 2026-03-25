export interface LoginRequestBody {
  username: string;
  password: string;
  deviceId: string;
  deviceName: string;
  platform: string;
  appVersion: string;
}

export interface PushSyncRequestBody {
  deviceId: string;
  items: Array<{
    queueId: string;
    entityType: string;
    entityId: string;
    operation: string;
    createdAt: string;
    payload: Record<string, unknown>;
  }>;
}
