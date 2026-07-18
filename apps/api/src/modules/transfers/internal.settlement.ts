import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  SettlementPort,
  SettlementRequest,
  SettlementResult,
} from './settlement.port';

/**
 * Synchronous internal settlement used until Circle/Base adapters are wired.
 * Still creates a durable settlement reference for auditability.
 */
@Injectable()
export class InternalSettlementAdapter implements SettlementPort {
  async settleUsdToNgn(request: SettlementRequest): Promise<SettlementResult> {
    if (request.sourceAmountUsd <= 0 || request.destAmountNgn <= 0) {
      throw new Error('Invalid settlement amounts');
    }

    return {
      provider: 'INTERNAL',
      reference: `int_${request.transferId.replace(/-/g, '').slice(0, 12)}_${randomUUID().slice(0, 8)}`,
      status: 'complete',
    };
  }
}
