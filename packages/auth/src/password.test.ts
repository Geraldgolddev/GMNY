import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './password';

describe('password hashing', () => {
  it('hashes and verifies a valid password', async () => {
    const hash = await hashPassword('SecurePass1!xyz');
    assert.notEqual(hash, 'SecurePass1!xyz');
    assert.equal(await verifyPassword(hash, 'SecurePass1!xyz'), true);
    assert.equal(await verifyPassword(hash, 'WrongPass1!xyz'), false);
  });

  it('rejects passwords under 12 characters before hashing', async () => {
    await assert.rejects(() => hashPassword('short'), /minimum length/);
  });
});
