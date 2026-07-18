import type { AuthResponse, PublicUser } from '@gmny/shared';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export async function api<T>(
  path: string,
  init: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, headers, ...rest } = init;
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof data?.message === 'string'
        ? data.message
        : Array.isArray(data?.message)
          ? data.message.join(', ')
          : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return data as T;
}

export function saveAuth(auth: AuthResponse) {
  localStorage.setItem('gmny.accessToken', auth.tokens.accessToken);
  localStorage.setItem('gmny.refreshToken', auth.tokens.refreshToken);
  localStorage.setItem('gmny.user', JSON.stringify(auth.user));
}

export function clearAuth() {
  localStorage.removeItem('gmny.accessToken');
  localStorage.removeItem('gmny.refreshToken');
  localStorage.removeItem('gmny.user');
}

export function getAccessToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem('gmny.accessToken');
}

export function getRefreshToken(): string | null {
  return typeof window === 'undefined' ? null : localStorage.getItem('gmny.refreshToken');
}

export function getStoredUser(): PublicUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('gmny.user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}
