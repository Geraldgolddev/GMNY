import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export function generateRefreshToken(): string {
  return randomBytes(48).toString('base64url');
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function tokensMatch(plain: string, hashed: string): boolean {
  const a = Buffer.from(hashToken(plain), 'hex');
  const b = Buffer.from(hashed, 'hex');
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
