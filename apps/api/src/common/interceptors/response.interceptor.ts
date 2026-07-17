import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { serializeBigInts } from '@gmny/database';
import type { ApiSuccess } from '@gmny/shared';

/**
 * Wraps every successful controller result in the standard {@link ApiSuccess}
 * envelope and serializes BigInt ledger amounts to strings so responses are
 * valid JSON.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccess<T>> {
  intercept(_context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccess<T>> {
    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data: serializeBigInts(data),
      })),
    );
  }
}
