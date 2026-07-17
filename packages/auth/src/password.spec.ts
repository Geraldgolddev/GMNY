import { hashPassword, verifyPassword, validatePasswordStrength } from './password';

describe('password hashing', () => {
  it('hashes and verifies a strong password', async () => {
    const hash = await hashPassword('Sup3rSecret!', 4);
    expect(hash).not.toBe('Sup3rSecret!');
    expect(await verifyPassword('Sup3rSecret!', hash)).toBe(true);
    expect(await verifyPassword('wrong-password', hash)).toBe(false);
  });

  it('rejects passwords below the minimum length', async () => {
    await expect(hashPassword('short', 4)).rejects.toThrow(/at least/);
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
