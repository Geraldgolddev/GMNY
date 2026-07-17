import { hash, verify, type Options } from '@node-rs/argon2';
import { MIN_PASSWORD_LENGTH } from '@gmny/shared';

export interface Argon2Params {
  /** Memory cost in KiB. */
  memoryCost?: number;
  /** Iterations. */
  timeCost?: number;
  /** Degree of parallelism. */
  parallelism?: number;
}

/**
 * OWASP-aligned Argon2id defaults (19 MiB, t=2, p=1). Tunable via env in the
 * API layer for stronger production settings.
 */
const DEFAULT_PARAMS: Required<Argon2Params> = {
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
};

function toOptions(params?: Argon2Params): Options {
  return {
    // algorithm 2 === Argon2id in @node-rs/argon2
    algorithm: 2,
    memoryCost: params?.memoryCost ?? DEFAULT_PARAMS.memoryCost,
    timeCost: params?.timeCost ?? DEFAULT_PARAMS.timeCost,
    parallelism: params?.parallelism ?? DEFAULT_PARAMS.parallelism,
  };
}

/** Hash a plaintext password with Argon2id. */
export async function hashPassword(plain: string, params?: Argon2Params): Promise<string> {
  if (plain.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  return hash(plain, toOptions(params));
}

/** Constant-time verification of a plaintext password against an Argon2 hash. */
export async function verifyPassword(plain: string, hashed: string): Promise<boolean> {
  try {
    return await verify(hashed, plain);
  } catch {
    // Malformed hash / mismatch -> treat as failed verification.
    return false;
  }
}

/**
 * Lightweight password-strength policy. Returns the list of unmet
 * requirements (empty array means the password is acceptable).
 */
export function validatePasswordStrength(password: string): string[] {
  const issues: string[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) {
    issues.push(`must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (!/[a-z]/.test(password)) issues.push('must contain a lowercase letter');
  if (!/[A-Z]/.test(password)) issues.push('must contain an uppercase letter');
  if (!/[0-9]/.test(password)) issues.push('must contain a number');
  if (!/[^A-Za-z0-9]/.test(password)) issues.push('must contain a symbol');
  return issues;
}
