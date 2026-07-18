import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateRefreshToken, hashToken, tokensMatch } from './token-hash';

describe('token-hash', () => {
  it('generates unique tokens and matches hashes', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    assert.notEqual(a, b);
    const hashed = hashToken(a);
    assert.equal(tokensMatch(a, hashed), true);
    assert.equal(tokensMatch(b, hashed), false);
  });
});
