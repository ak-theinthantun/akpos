import { apiFetch } from './client';
import type { HealthResponse, ReadyResponse } from '@/types/api';

export async function fetchHealth(): Promise<HealthResponse> {
  const response = await apiFetch('/health', {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to load server health.');
  }

  return response.json();
}

export async function fetchReady(): Promise<ReadyResponse> {
  const response = await apiFetch('/ready', {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error('Failed to load server readiness.');
  }

  return response.json();
}
