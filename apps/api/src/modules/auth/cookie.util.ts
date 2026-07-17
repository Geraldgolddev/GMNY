import type { CookieOptions, Response } from 'express';

/** Name of the httpOnly refresh-token cookie. */
export const REFRESH_COOKIE = 'gmny_refresh';

/** Path the refresh cookie is scoped to (auth endpoints only). */
const COOKIE_PATH = '/api/auth';

function baseOptions(isProd: boolean): CookieOptions {
  return {
    httpOnly: true,
    // Cross-origin dev (web:3000 -> api:4000) is same-site (localhost); lax works.
    sameSite: isProd ? 'strict' : 'lax',
    secure: isProd,
    path: COOKIE_PATH,
  };
}

export function setRefreshCookie(
  res: Response,
  token: string,
  maxAgeMs: number,
  isProd: boolean,
): void {
  res.cookie(REFRESH_COOKIE, token, { ...baseOptions(isProd), maxAge: maxAgeMs });
}

export function clearRefreshCookie(res: Response, isProd: boolean): void {
  res.clearCookie(REFRESH_COOKIE, baseOptions(isProd));
}
