import type { ApiResponse } from '@nairaflow/shared';

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

export interface UserProfile extends AuthUser {
  phone: string | null;
  kycStatus: string;
  lastLoginAt: string | null;
  createdAt: string;
}

/** Thrown for any non-2xx API response, carrying the stable error code. */
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
  register(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<AuthResult> {
    return request<AuthResult>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  login(input: { email: string; password: string }): Promise<AuthResult> {
    return request<AuthResult>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  me(token: string): Promise<UserProfile> {
    return request<UserProfile>('/users/me', { method: 'GET' }, token);
  },

  logout(token: string, refreshToken: string): Promise<void> {
    return request<void>('/auth/logout', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
    }, token);
  },
};
