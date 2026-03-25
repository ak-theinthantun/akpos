import { apiFetch } from './client';
import type { PullSyncResponse, PushSyncRequest } from '@/types/api';

export async function pushSync(payload: PushSyncRequest, token: string) {
  const response = await apiFetch('/sync/push', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error('Push sync failed.');
  }

  return response.json();
}

export async function pullSync(cursor: string | null, token: string): Promise<PullSyncResponse> {
  const query = cursor ? `?cursor=${encodeURIComponent(cursor)}` : '';
  const response = await apiFetch(`/sync/pull${query}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Pull sync failed.');
  }

  return response.json();
}
