import { apiFetch } from './client';
import type { ReportSalesResponse, ReportSummaryResponse } from '@/types/api';

export async function fetchReportSummary(token: string): Promise<ReportSummaryResponse> {
  const response = await apiFetch('/reports/summary', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to load report summary.');
  }

  return response.json();
}

export async function fetchReportSales(token: string): Promise<ReportSalesResponse> {
  const response = await apiFetch('/reports/sales', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to load report sales.');
  }

  return response.json();
}
