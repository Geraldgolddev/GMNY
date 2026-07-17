import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import type { Request, Response } from 'express';

/**
 * Structured per-request logging: assigns a correlation id (echoed via the
 * `x-request-id` response header) and logs method, path, status, and latency.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const http = context.switchToHttp();
    const req = http.getRequest<Request & { id?: string }>();
    const res = http.getResponse<Response>();

    const requestId = (req.headers['x-request-id'] as string) || randomUUID();
    req.id = requestId;
    res.setHeader('x-request-id', requestId);

    const startedAt = Date.now();
    const { method, originalUrl } = req;

    return next.handle().pipe(
      tap({
        next: () => {
          this.logger.log(
            `${method} ${originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms [${requestId}]`,
          );
        },
        error: (err: { status?: number }) => {
          this.logger.warn(
            `${method} ${originalUrl} ${err?.status ?? 500} ${Date.now() - startedAt}ms [${requestId}]`,
          );
        },
      }),
    );
  }
}
