import { createHash, randomUUID } from 'node:crypto';
import jwt, { type SignOptions, type VerifyOptions } from 'jsonwebtoken';
import type { JwtAccessPayload, JwtRefreshPayload, UserRole } from '@nairaflow/shared';

export interface TokenConfig {
  accessSecret: string;
  refreshSecret: string;
  /** e.g. "15m" */
  accessTtl: string;
  /** e.g. "7d" */
  refreshTtl: string;
  issuer?: string;
  audience?: string;
}

export interface IssuedTokenPair {
  accessToken: string;
  refreshToken: string;
  /** The refresh token id (jti) — persist a hash of the token keyed by this. */
  refreshTokenId: string;
}

function signOptions(config: TokenConfig): SignOptions {
  const opts: SignOptions = {};
  if (config.issuer) opts.issuer = config.issuer;
  if (config.audience) opts.audience = config.audience;
  return opts;
}

function verifyOptions(config: TokenConfig): VerifyOptions {
  const opts: VerifyOptions = {};
  if (config.issuer) opts.issuer = config.issuer;
  if (config.audience) opts.audience = config.audience;
  return opts;
}

/** Issue a signed, short-lived access token. */
export function signAccessToken(
  payload: { sub: string; email: string; role: UserRole },
  config: TokenConfig,
): string {
  const body: JwtAccessPayload = { ...payload, type: 'access' };
  return jwt.sign(body, config.accessSecret, {
    ...signOptions(config),
    expiresIn: config.accessTtl as SignOptions['expiresIn'],
  });
}

/** Issue a signed, long-lived refresh token carrying a rotation id (jti). */
export function signRefreshToken(
  payload: { sub: string },
  config: TokenConfig,
): { token: string; jti: string } {
  const jti = randomUUID();
  const body: JwtRefreshPayload = { sub: payload.sub, jti, type: 'refresh' };
  const token = jwt.sign(body, config.refreshSecret, {
    ...signOptions(config),
    expiresIn: config.refreshTtl as SignOptions['expiresIn'],
  });
  return { token, jti };
}

/** Issue a complete access + refresh pair in one call. */
export function issueTokenPair(
  user: { id: string; email: string; role: UserRole },
  config: TokenConfig,
): IssuedTokenPair {
  const accessToken = signAccessToken({ sub: user.id, email: user.email, role: user.role }, config);
  const { token: refreshToken, jti } = signRefreshToken({ sub: user.id }, config);
  return { accessToken, refreshToken, refreshTokenId: jti };
}

/** Verify and decode an access token. Throws on invalid/expired tokens. */
export function verifyAccessToken(token: string, config: TokenConfig): JwtAccessPayload {
  const decoded = jwt.verify(
    token,
    config.accessSecret,
    verifyOptions(config),
  ) as unknown as JwtAccessPayload;
  if (decoded.type !== 'access') {
    throw new Error('Invalid token type: expected access token');
  }
  return decoded;
}

/** Verify and decode a refresh token. Throws on invalid/expired tokens. */
export function verifyRefreshToken(token: string, config: TokenConfig): JwtRefreshPayload {
  const decoded = jwt.verify(
    token,
    config.refreshSecret,
    verifyOptions(config),
  ) as unknown as JwtRefreshPayload;
  if (decoded.type !== 'refresh') {
    throw new Error('Invalid token type: expected refresh token');
  }
  return decoded;
}

/**
 * Deterministic SHA-256 hash of a refresh token. We store only the hash so a
 * database leak cannot be used to mint valid refresh tokens.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
