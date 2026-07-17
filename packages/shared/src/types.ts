import { UserRole } from './enums';

/** JWT access-token payload shape (kept in sync with @gmny/auth). */
export interface JwtAccessPayload {
  /** Subject — the user id. */
  sub: string;
  email: string;
  role: UserRole;
  /** Token type discriminator. */
  type: 'access';
}

/** JWT refresh-token payload shape. */
export interface JwtRefreshPayload {
  sub: string;
  /** Opaque session/token id used for rotation + revocation. */
  jti: string;
  type: 'refresh';
}

/** Authenticated principal attached to API requests. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  role: UserRole;
}

/** Standard API success envelope. */
export interface ApiSuccess<T> {
  success: true;
  data: T;
}

/** Standard API error envelope. */
export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
