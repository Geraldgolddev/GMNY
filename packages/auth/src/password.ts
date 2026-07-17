import bcrypt from 'bcryptjs';
import { MIN_PASSWORD_LENGTH } from '@nairaflow/shared';

/** Hash a plaintext password using bcrypt with the configured cost factor. */
export async function hashPassword(plain: string, saltRounds = 12): Promise<string> {
  if (plain.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  return bcrypt.hash(plain, saltRounds);
}

/** Constant-time verification of a plaintext password against a bcrypt hash. */
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
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
