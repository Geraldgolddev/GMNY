/**
 * Framework-agnostic domain error taxonomy.
 *
 * The API layer maps these to HTTP responses; workers log them; the shared
 * `code` string gives clients a stable, machine-readable identifier that is
 * decoupled from HTTP status codes.
 */

export type DomainErrorCode =
  | 'VALIDATION_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'INSUFFICIENT_FUNDS'
  | 'QUOTE_EXPIRED'
  | 'COMPLIANCE_BLOCKED'
  | 'UPSTREAM_ERROR'
  | 'INTERNAL_ERROR';

export interface DomainErrorOptions {
  /** Machine-readable, stable error code. */
  code: DomainErrorCode;
  /** Suggested HTTP status for the API layer. */
  httpStatus: number;
  /** Optional structured details (e.g. field validation errors). */
  details?: Record<string, unknown>;
  /** Optional underlying cause for logging. */
  cause?: unknown;
}

/** Base class for all GMNY domain errors. */
export class DomainError extends Error {
  public readonly code: DomainErrorCode;
  public readonly httpStatus: number;
  public readonly details?: Record<string, unknown>;

  constructor(message: string, options: DomainErrorOptions) {
    super(message, options.cause ? { cause: options.cause } : undefined);
    this.name = this.constructor.name;
    this.code = options.code;
    this.httpStatus = options.httpStatus;
    this.details = options.details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ValidationError extends DomainError {
  constructor(message = 'Validation failed', details?: Record<string, unknown>) {
    super(message, { code: 'VALIDATION_ERROR', httpStatus: 422, details });
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Authentication required') {
    super(message, { code: 'UNAUTHORIZED', httpStatus: 401 });
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Insufficient permissions') {
    super(message, { code: 'FORBIDDEN', httpStatus: 403 });
  }
}

export class NotFoundError extends DomainError {
  constructor(message = 'Resource not found') {
    super(message, { code: 'NOT_FOUND', httpStatus: 404 });
  }
}

export class ConflictError extends DomainError {
  constructor(message = 'Resource already exists') {
    super(message, { code: 'CONFLICT', httpStatus: 409 });
  }
}

export class InsufficientFundsError extends DomainError {
  constructor(message = 'Insufficient funds') {
    super(message, { code: 'INSUFFICIENT_FUNDS', httpStatus: 422 });
  }
}

export class QuoteExpiredError extends DomainError {
  constructor(message = 'Exchange-rate quote has expired') {
    super(message, { code: 'QUOTE_EXPIRED', httpStatus: 409 });
  }
}

export class ComplianceBlockedError extends DomainError {
  constructor(message = 'Action blocked by compliance policy') {
    super(message, { code: 'COMPLIANCE_BLOCKED', httpStatus: 403 });
  }
}

export class UpstreamError extends DomainError {
  constructor(message = 'Upstream service error', cause?: unknown) {
    super(message, { code: 'UPSTREAM_ERROR', httpStatus: 502, cause });
  }
}
