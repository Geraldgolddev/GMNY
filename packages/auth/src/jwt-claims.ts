import { Role } from '@gmny/shared';

export interface AccessTokenClaims {
  sub: string;
  email: string;
  role: Role;
  type: 'access';
}

export interface RefreshTokenClaims {
  sub: string;
  type: 'refresh';
  jti: string;
}
