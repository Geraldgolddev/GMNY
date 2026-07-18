import { createHmac, timingSafeEqual } from 'node:crypto';

export type AccessPayload = {
  sub: string;
  email: string;
  role: string;
  type: 'access';
  exp: number;
  iat: number;
};

function b64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function fromB64url(input: string): Buffer {
  const pad = input.length % 4 === 0 ? '' : '='.repeat(4 - (input.length % 4));
  return Buffer.from(input.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function parseTtlSeconds(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) return 15 * 60;
  const n = Number(match[1]);
  switch (match[2]) {
    case 's':
      return n;
    case 'm':
      return n * 60;
    case 'h':
      return n * 3600;
    case 'd':
      return n * 86400;
    default:
      return 15 * 60;
  }
}

export function signAccessToken(
  claims: { sub: string; email: string; role: string },
  secret: string,
  ttl = '15m',
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload: AccessPayload = {
    ...claims,
    type: 'access',
    iat: now,
    exp: now + parseTtlSeconds(ttl),
  };
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest();
  return `${header}.${body}.${b64url(sig)}`;
}

export function verifyAccessToken(token: string, secret: string): AccessPayload {
  const [header, body, sig] = token.split('.');
  if (!header || !body || !sig) throw new Error('Invalid token');

  const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest();
  const actual = fromB64url(sig);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    throw new Error('Invalid token signature');
  }

  const payload = JSON.parse(fromB64url(body).toString('utf8')) as AccessPayload;
  if (payload.type !== 'access') throw new Error('Invalid token type');
  if (payload.exp < Math.floor(Date.now() / 1000)) throw new Error('Token expired');
  return payload;
}

export function ttlToDate(ttl: string): Date {
  return new Date(Date.now() + parseTtlSeconds(ttl) * 1000);
}
