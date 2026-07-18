import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loginSchema, registerSchema } from './auth';

describe('registerSchema', () => {
  it('accepts a strong password and normalizes email', () => {
    const result = registerSchema.parse({
      email: '  User@GMNY.com ',
      password: 'SecurePass1!xyz',
      firstName: 'Ada',
      lastName: 'Okoro',
    });
    assert.equal(result.email, 'user@gmny.com');
    assert.equal(result.firstName, 'Ada');
  });

  it('rejects weak passwords', () => {
    assert.throws(() =>
      registerSchema.parse({
        email: 'user@gmny.com',
        password: 'short',
        firstName: 'Ada',
        lastName: 'Okoro',
      }),
    );
  });
});

describe('loginSchema', () => {
  it('normalizes email casing', () => {
    const result = loginSchema.parse({
      email: 'Admin@GMNY.com',
      password: 'anything-long',
    });
    assert.equal(result.email, 'admin@gmny.com');
  });
});
