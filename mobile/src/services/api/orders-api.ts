import { apiFetch } from './client';
import type { OrderDetailResponse, OrderSummaryResponse } from '@/types/api';

export async function fetchOrders(token: string): Promise<OrderSummaryResponse> {
  const response = await apiFetch('/orders', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to load orders.');
  }

  return response.json();
}

export async function fetchOrderById(id: string, token: string): Promise<OrderDetailResponse> {
  const response = await apiFetch(`/orders/${encodeURIComponent(id)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to load order detail.');
  }

  return response.json();
}
