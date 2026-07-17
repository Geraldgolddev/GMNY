import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { DomainError } from '@nairaflow/shared';
import type { ApiError } from '@nairaflow/shared';

/**
 * Central exception filter that renders every error as the standard
 * {@link ApiError} envelope, mapping:
 *  - DomainError    -> its declared httpStatus + stable code
 *  - HttpException   -> the Nest status + a derived code
 *  - anything else   -> 500 INTERNAL_ERROR (details hidden from clients)
 */
@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, body } = this.toApiError(exception);

    if (status >= 500) {
      this.logger.error(
        `Unhandled error: ${body.error.message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(status).json(body);
  }

  private toApiError(exception: unknown): { status: number; body: ApiError } {
    if (exception instanceof DomainError) {
      return {
        status: exception.httpStatus,
        body: {
          success: false,
          error: { code: exception.code, message: exception.message, details: exception.details },
        },
      };
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const message =
        typeof res === 'string'
          ? res
          : ((res as Record<string, unknown>).message as string) ?? exception.message;
      return {
        status,
        body: {
          success: false,
          error: { code: this.codeFromStatus(status), message: this.normalizeMessage(message) },
        },
      };
    }

    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      body: {
        success: false,
        error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      },
    };
  }

  private normalizeMessage(message: string | string[]): string {
    return Array.isArray(message) ? message.join('; ') : message;
  }

  private codeFromStatus(status: number): string {
    const map: Record<number, string> = {
      400: 'VALIDATION_ERROR',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      422: 'VALIDATION_ERROR',
      429: 'RATE_LIMITED',
    };
    return map[status] ?? 'INTERNAL_ERROR';
  }
}
