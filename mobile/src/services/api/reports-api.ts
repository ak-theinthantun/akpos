import { apiFetch } from './client';
import type { ReportSummaryResponse } from '@/types/api';

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
