import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateRefreshToken, hashToken, tokensMatch } from './token-hash';

describe('token hashing', () => {
  it('generates unique opaque tokens', () => {
    const a = generateRefreshToken();
    const b = generateRefreshToken();
    assert.notEqual(a, b);
    assert.ok(a.length >= 32);
  });

  it('matches hashed tokens in constant-time comparison', () => {
    const token = generateRefreshToken();
    const hashed = hashToken(token);
    assert.equal(tokensMatch(token, hashed), true);
    assert.equal(tokensMatch('tampered-token-value-xxxxxxxxxx', hashed), false);
  });
});
