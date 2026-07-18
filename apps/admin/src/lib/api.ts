import type { AuthResponse, PublicUser } from '@gmny/shared';

const API_URL =
  process.env.NEXT_PUBLIC_ADMIN_API_URL ??
  process.env.NEXT_PUBLIC_API_URL ??
  'http://localhost:4000';

export async function adminFetch<T>(
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

export function saveAdminAuth(auth: AuthResponse) {
  localStorage.setItem('gmny.admin.accessToken', auth.tokens.accessToken);
  localStorage.setItem('gmny.admin.refreshToken', auth.tokens.refreshToken);
  localStorage.setItem('gmny.admin.user', JSON.stringify(auth.user));
}

export function clearAdminAuth() {
  localStorage.removeItem('gmny.admin.accessToken');
  localStorage.removeItem('gmny.admin.refreshToken');
  localStorage.removeItem('gmny.admin.user');
}

export function getAdminAccessToken(): string | null {
  return typeof window === 'undefined'
    ? null
    : localStorage.getItem('gmny.admin.accessToken');
}

export function getAdminUser(): PublicUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem('gmny.admin.user');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PublicUser;
  } catch {
    return null;
  }
}
