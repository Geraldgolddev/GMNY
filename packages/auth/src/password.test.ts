import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from './password';

describe('password', () => {
  it('hashes and verifies', async () => {
    const hash = await hashPassword('SecurePass1!xyz');
    assert.equal(await verifyPassword(hash, 'SecurePass1!xyz'), true);
    assert.equal(await verifyPassword(hash, 'wrong-password'), false);
  });

  it('rejects short passwords', async () => {
    await assert.rejects(() => hashPassword('short'), /12 characters/);
  });
});
