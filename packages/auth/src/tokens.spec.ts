import {
  issueTokenPair,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  signAccessToken,
} from './tokens';
import { UserRole } from '@nairaflow/shared';

const config = {
  accessSecret: 'test-access-secret',
  refreshSecret: 'test-refresh-secret',
  accessTtl: '15m',
  refreshTtl: '7d',
  issuer: 'nairaflow-test',
};

const user = { id: 'user-1', email: 'a@b.com', role: UserRole.USER };

describe('token issuance & verification', () => {
  it('issues a verifiable access + refresh pair', () => {
    const pair = issueTokenPair(user, config);
    const access = verifyAccessToken(pair.accessToken, config);
    expect(access.sub).toBe(user.id);
    expect(access.role).toBe(UserRole.USER);
    expect(access.type).toBe('access');

    const refresh = verifyRefreshToken(pair.refreshToken, config);
    expect(refresh.sub).toBe(user.id);
    expect(refresh.jti).toBe(pair.refreshTokenId);
    expect(refresh.type).toBe('refresh');
  });

  it('rejects an access token signed with the wrong secret', () => {
    const pair = issueTokenPair(user, config);
    expect(() => verifyAccessToken(pair.accessToken, { ...config, accessSecret: 'other' })).toThrow();
  });

  it('rejects using a refresh token where an access token is expected', () => {
    const pair = issueTokenPair(user, config);
    // The refresh token is signed with the refresh secret, so verifying it as
    // an access token must fail.
    expect(() => verifyAccessToken(pair.refreshToken, config)).toThrow();
  });

  it('produces stable hashes for refresh-token storage', () => {
    const pair = issueTokenPair(user, config);
    expect(hashToken(pair.refreshToken)).toBe(hashToken(pair.refreshToken));
    expect(hashToken(pair.refreshToken)).toHaveLength(64);
  });

  it('embeds the admin role in the access token', () => {
    const token = signAccessToken(
      { sub: 'admin-1', email: 'admin@x.com', role: UserRole.ADMIN },
      config,
    );
    expect(verifyAccessToken(token, config).role).toBe(UserRole.ADMIN);
  });
});
