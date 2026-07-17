import { hashPassword, verifyPassword, validatePasswordStrength } from './password';

// Low cost params keep the test suite fast.
const fast = { memoryCost: 8, timeCost: 1, parallelism: 1 };

describe('password hashing (Argon2id)', () => {
  it('hashes and verifies a strong password', async () => {
    const hash = await hashPassword('Sup3rSecret!', fast);
    expect(hash).not.toBe('Sup3rSecret!');
    expect(hash.startsWith('$argon2id$')).toBe(true);
    expect(await verifyPassword('Sup3rSecret!', hash)).toBe(true);
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('returns false for a malformed hash instead of throwing', async () => {
    expect(await verifyPassword('whatever', 'not-a-hash')).toBe(false);
  });

  it('rejects passwords below the minimum length', async () => {
    await expect(hashPassword('short', fast)).rejects.toThrow(/at least/);
  });
});

describe('validatePasswordStrength', () => {
  it('accepts a compliant password', () => {
    expect(validatePasswordStrength('Sup3rSecret!')).toEqual([]);
  });

  it('reports every unmet requirement', () => {
    const issues = validatePasswordStrength('weak');
    expect(issues.length).toBeGreaterThan(0);
    expect(issues.join(' ')).toMatch(/uppercase/);
  });
});
