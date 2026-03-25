import { apiFetch } from './client';
import type { LoginRequest, LoginResponse } from '@/types/api';

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const response = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    throw new Error('Login failed.');
  }

  return response.json();
}
