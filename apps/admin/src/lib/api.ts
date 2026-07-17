import type { ApiResponse, PaginatedResult } from '@gmny/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface AuthResult {
  user: AuthUser;
  tokens: AuthTokens;
}

export interface AdminUserRow extends AuthUser {
  phone: string | null;
  kycStatus: string;
  lastLoginAt: string | null;
  createdAt: string;
}

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json()) as ApiResponse<T>;
  if (!body.success) {
    throw new ApiClientError(body.error.message, body.error.code, res.status);
  }
  return body.data;
}

export const api = {
  login(input: { email: string; password: string }): Promise<AuthResult> {
    return request<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify(input) });
  },
  listUsers(token: string, page = 1, pageSize = 20): Promise<PaginatedResult<AdminUserRow>> {
    return request<PaginatedResult<AdminUserRow>>(
      `/users?page=${page}&pageSize=${pageSize}`,
      { method: 'GET' },
      token,
    );
  },
};
