import type { ApiResponse } from '@gmny/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  emailVerified: boolean;
}

export interface AuthTokens {
  accessToken: string;
  expiresIn: string;
}

export interface AuthResult {
  user: AuthUser;
  tokens: AuthTokens;
  devVerificationUrl?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  role: string;
  status: string;
  kycStatus: string;
  emailVerifiedAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface SessionInfo {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  current: boolean;
}

export interface MessageResult {
  message: string;
  devActionUrl?: string;
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
    // Always include credentials so the httpOnly refresh cookie flows.
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  const body = (await res.json().catch(() => ({}))) as ApiResponse<T>;
  if (!body || (body as ApiResponse<T>).success === false) {
    const err = (body as { error?: { message: string; code: string } }).error;
    throw new ApiClientError(err?.message ?? 'Request failed', err?.code ?? 'UNKNOWN', res.status);
  }
  return (body as { data: T }).data;
}

export const api = {
  register(input: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<AuthResult> {
    return request<AuthResult>('/auth/register', { method: 'POST', body: JSON.stringify(input) });
  },

  login(input: { email: string; password: string }): Promise<AuthResult> {
    return request<AuthResult>('/auth/login', { method: 'POST', body: JSON.stringify(input) });
  },

  /** Rotate the session using the httpOnly refresh cookie. */
  refresh(): Promise<AuthResult> {
    return request<AuthResult>('/auth/refresh', { method: 'POST', body: JSON.stringify({}) });
  },

  logout(token: string): Promise<void> {
    return request<void>('/auth/logout', { method: 'POST', body: JSON.stringify({}) }, token);
  },

  verifyEmail(verificationToken: string): Promise<MessageResult> {
    return request<MessageResult>('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token: verificationToken }),
    });
  },

  resendVerification(token: string): Promise<MessageResult> {
    return request<MessageResult>('/auth/resend-verification', { method: 'POST', body: JSON.stringify({}) }, token);
  },

  forgotPassword(email: string): Promise<MessageResult> {
    return request<MessageResult>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  resetPassword(resetToken: string, newPassword: string): Promise<MessageResult> {
    return request<MessageResult>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token: resetToken, newPassword }),
    });
  },

  me(token: string): Promise<UserProfile> {
    return request<UserProfile>('/users/me', { method: 'GET' }, token);
  },

  sessions(token: string): Promise<SessionInfo[]> {
    return request<SessionInfo[]>('/auth/sessions', { method: 'GET' }, token);
  },
};
