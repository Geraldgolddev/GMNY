import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AuditAction } from '@gmny/database';
import type { UsdcTransferPort } from '@gmny/blockchain';
import { TRANSFER_FEE_RATE } from '@gmny/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type {
  SettlementPort,
  SettlementRequest,
  SettlementResult,
} from '../transfers/settlement.port';
import { CIRCLE_TRANSFER_PORT } from './circle.tokens';
import { CircleConfigService } from './circle-config.service';
import { WalletsService } from './wallets.service';

/**
 * Settles the USDC leg via Circle sandbox/live developer-controlled wallets.
 * NGN bank payout remains a later rail; this adapter records the crypto settlement ref.
 */
@Injectable()
export class CircleSettlementAdapter implements SettlementPort {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: CircleConfigService,
    private readonly wallets: WalletsService,
    @Inject(CIRCLE_TRANSFER_PORT) private readonly transfers: UsdcTransferPort,
  ) {}

  async settleUsdToNgn(request: SettlementRequest): Promise<SettlementResult> {
    if (request.sourceAmountUsd <= 0 || request.destAmountNgn <= 0) {
      throw new Error('Invalid settlement amounts');
    }

    const userWallet = await this.wallets.ensure(request.userId);
    const fee = round(request.sourceAmountUsd * TRANSFER_FEE_RATE, 2);
    const netUsd = round(request.sourceAmountUsd - fee, 2);
    if (netUsd <= 0) {
      throw new Error('Amount too small after fees');
    }

    const sourceWalletId =
      this.config.treasuryWalletId ?? userWallet.providerWalletId;
    const destinationAddress = userWallet.address;

    // When treasury is configured, move USDC treasury → user wallet.
    // In simulate mode without treasury, self-destination is still a durable Circle ref.
    try {
      const result = await this.transfers.transferUsdc({
        sourceWalletId,
        destinationAddress,
        amount: netUsd.toFixed(2),
        idempotencyKey: `circle_${request.transferId}`,
        chain: this.config.defaultChain,
        tokenId: this.config.usdcTokenId,
      });

      await this.prisma.auditLog.create({
        data: {
          actorId: request.userId,
          action: AuditAction.CIRCLE_TRANSFER_CREATED,
          entityType: 'Transfer',
          entityId: request.transferId,
          metadata: {
            providerTransferId: result.providerTransferId,
            status: result.status,
            txHash: result.txHash ?? null,
            sourceWalletId,
            destinationAddress,
            amountUsdc: netUsd,
            circleMode: this.config.mode,
          },
        },
      });

      return {
        provider: 'CIRCLE',
        reference: result.providerTransferId,
        status: result.status,
        txHash: result.txHash,
        chain: this.config.defaultChain,
        usdcAmount: netUsd,
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Circle settlement failed';
      throw new ServiceUnavailableException({
        error: 'CIRCLE_SETTLEMENT_FAILED',
        message,
      });
    }
  }
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
