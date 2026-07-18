import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';
import {
  AuditAction,
  Prisma,
  TransactionStatus,
  TransactionType,
  TransferDirection,
  TransferStatus as DbTransferStatus,
} from '@gmny/database';
import {
  MAX_TRANSFER_USD,
  MIN_TRANSFER_USD,
  NotificationType,
  QuoteDirection,
  TRANSFER_FEE_RATE,
  TransferStatus,
  WalletChain as SharedWalletChain,
  type CreateTransferInput,
  type TransferView,
} from '@gmny/shared';
import { randomUUID } from 'node:crypto';
import { explorerTxUrl } from '@gmny/blockchain';
import {
  WalletChain as DbWalletChain,
  type WalletChain,
} from '@gmny/database';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { RatesService } from '../exchange-rates/rates.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SETTLEMENT_PORT, type SettlementPort } from './settlement.port';

@Injectable()
export class TransfersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly rates: RatesService,
    @Inject(SETTLEMENT_PORT) private readonly settlement: SettlementPort,
    private readonly notifications: NotificationsService,
  ) {}

  async list(userId: string): Promise<TransferView[]> {
    const rows = await this.prisma.transfer.findMany({
      where: { userId },
      include: {
        recipient: {
          select: {
            id: true,
            label: true,
            accountName: true,
            accountNumber: true,
            bankName: true,
            bankCode: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return rows.map((r) => this.toView(r));
  }

  async get(userId: string, id: string): Promise<TransferView> {
    const row = await this.prisma.transfer.findFirst({
      where: { id, userId },
      include: {
        recipient: {
          select: {
            id: true,
            label: true,
            accountName: true,
            accountNumber: true,
            bankName: true,
            bankCode: true,
          },
        },
      },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'TRANSFER_NOT_FOUND',
        message: 'Transfer not found',
      });
    }
    return this.toView(row);
  }

  async create(userId: string, input: CreateTransferInput): Promise<TransferView> {
    const amountUsd = Number(input.amountUsd);
    if (!Number.isFinite(amountUsd)) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'amountUsd must be a number',
      });
    }
    if (amountUsd < MIN_TRANSFER_USD || amountUsd > MAX_TRANSFER_USD) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: `amountUsd must be between ${MIN_TRANSFER_USD} and ${MAX_TRANSFER_USD}`,
      });
    }
    if (!input.recipientId) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'recipientId is required',
      });
    }

    const recipient = await this.prisma.recipient.findFirst({
      where: { id: input.recipientId, userId, isActive: true },
    });
    if (!recipient) {
      throw new NotFoundException({
        error: 'RECIPIENT_NOT_FOUND',
        message: 'Recipient not found',
      });
    }

    const idempotencyKey =
      input.idempotencyKey?.trim() || `xfer_${userId}_${randomUUID()}`;

    const existing = await this.prisma.transfer.findUnique({
      where: { idempotencyKey },
      include: {
        recipient: {
          select: {
            id: true,
            label: true,
            accountName: true,
            accountNumber: true,
            bankName: true,
            bankCode: true,
          },
        },
      },
    });
    if (existing) {
      if (existing.userId !== userId) {
        throw new BadRequestException({
          error: 'IDEMPOTENCY_CONFLICT',
          message: 'Idempotency key already used',
        });
      }
      return this.toView(existing);
    }

    const quote = await this.rates.quote(QuoteDirection.USD_TO_NGN, amountUsd);
    const feeAmount = round(amountUsd * TRANSFER_FEE_RATE, 2);
    const netUsd = round(amountUsd - feeAmount, 2);
    if (netUsd <= 0) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Amount too small after fees',
      });
    }
    const destAmount = round(netUsd * quote.rate, 2);

    const transferId = randomUUID();

    try {
      const settled = await this.settlement.settleUsdToNgn({
        transferId,
        userId,
        recipientId: recipient.id,
        sourceAmountUsd: amountUsd,
        destAmountNgn: destAmount,
        fxRate: quote.rate,
      });

      if (settled.status === 'failed') {
        throw new BadRequestException({
          error: 'SETTLEMENT_FAILED',
          message: 'Settlement provider failed to process this transfer',
        });
      }

      const transferStatus =
        settled.status === 'complete'
          ? DbTransferStatus.COMPLETED
          : DbTransferStatus.PROCESSING;
      const ledgerStatus =
        settled.status === 'complete'
          ? TransactionStatus.SETTLED
          : TransactionStatus.PENDING;

      const created = await this.prisma.$transaction(async (tx) => {
        const transfer = await tx.transfer.create({
          data: {
            id: transferId,
            userId,
            recipientId: recipient.id,
            direction: TransferDirection.USD_TO_NGN,
            status: transferStatus,
            sourceCurrency: 'USD',
            sourceAmount: new Prisma.Decimal(amountUsd.toFixed(2)),
            destCurrency: 'NGN',
            destAmount: new Prisma.Decimal(destAmount.toFixed(2)),
            fxRate: new Prisma.Decimal(quote.rate.toFixed(6)),
            feeAmount: new Prisma.Decimal(feeAmount.toFixed(2)),
            feeCurrency: 'USD',
            fxSource: quote.source,
            idempotencyKey,
            settlementProvider: settled.provider,
            settlementRef: settled.reference,
            chain: settled.chain
              ? settled.chain === 'BASE'
                ? DbWalletChain.BASE
                : DbWalletChain.BASE_SEPOLIA
              : null,
            txHash: settled.txHash ?? null,
            usdcAmount:
              settled.usdcAmount != null
                ? new Prisma.Decimal(settled.usdcAmount.toFixed(6))
                : null,
            note: input.note?.trim() || null,
            completedAt:
              transferStatus === DbTransferStatus.COMPLETED ? new Date() : null,
          },
          include: {
            recipient: {
              select: {
                id: true,
                label: true,
                accountName: true,
                accountNumber: true,
                bankName: true,
                bankCode: true,
              },
            },
          },
        });

        await tx.transaction.createMany({
          data: [
            {
              userId,
              transferId: transfer.id,
              type: TransactionType.TRANSFER,
              status: ledgerStatus,
              currency: 'USD',
              amount: new Prisma.Decimal(amountUsd.toFixed(2)),
              description: `Send ${amountUsd.toFixed(2)} USD to ${recipient.accountName}`,
            },
            {
              userId,
              transferId: transfer.id,
              type: TransactionType.FEE,
              status: ledgerStatus,
              currency: 'USD',
              amount: new Prisma.Decimal(feeAmount.toFixed(2)),
              description: `Transfer fee (${TRANSFER_FEE_RATE * 100}%)`,
            },
            {
              userId,
              transferId: transfer.id,
              type: TransactionType.FX_CONVERSION,
              status: ledgerStatus,
              currency: 'NGN',
              amount: new Prisma.Decimal(destAmount.toFixed(2)),
              description: `Convert ${netUsd.toFixed(2)} USD → ${destAmount.toFixed(2)} NGN @ ${quote.rate}`,
            },
          ],
        });

        const audits: Prisma.AuditLogCreateManyInput[] = [
          {
            actorId: userId,
            action: AuditAction.TRANSFER_CREATED,
            entityType: 'Transfer',
            entityId: transfer.id,
            metadata: {
              settlementRef: settled.reference,
              provider: settled.provider,
              settlementStatus: settled.status,
              txHash: settled.txHash ?? null,
            },
          },
        ];
        if (transferStatus === DbTransferStatus.COMPLETED) {
          audits.push({
            actorId: userId,
            action: AuditAction.TRANSFER_COMPLETED,
            entityType: 'Transfer',
            entityId: transfer.id,
            metadata: {
              settlementRef: settled.reference,
              provider: settled.provider,
              txHash: settled.txHash ?? null,
            },
          });
        }
        await tx.auditLog.createMany({ data: audits });

        return transfer;
      });

      const view = this.toView(created);
      await this.safeNotify({
        userId,
        type: NotificationType.TRANSFER_CREATED,
        title: 'Transfer submitted',
        body: `Sending ${view.sourceAmount.toFixed(2)} USD → ${view.destAmount.toFixed(2)} NGN to ${recipient.accountName}.`,
        entityType: 'Transfer',
        entityId: view.id,
        metadata: {
          status: view.status,
          settlementProvider: view.settlementProvider,
        },
        email: true,
      });
      if (view.status === TransferStatus.COMPLETED) {
        await this.safeNotify({
          userId,
          type: NotificationType.TRANSFER_COMPLETED,
          title: 'Transfer completed',
          body: `${view.destAmount.toFixed(2)} NGN is on the way to ${recipient.accountName}.`,
          entityType: 'Transfer',
          entityId: view.id,
          metadata: { status: view.status },
          email: true,
        });
      }
      return view;
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        const again = await this.prisma.transfer.findUnique({
          where: { idempotencyKey },
          include: {
            recipient: {
              select: {
                id: true,
                label: true,
                accountName: true,
                accountNumber: true,
                bankName: true,
                bankCode: true,
              },
            },
          },
        });
        if (again && again.userId === userId) {
          return this.toView(again);
        }
      }
      throw error;
    }
  }

  private toView(row: {
    id: string;
    recipientId: string;
    status: DbTransferStatus;
    sourceCurrency: string;
    sourceAmount: Prisma.Decimal | number | string;
    destCurrency: string;
    destAmount: Prisma.Decimal | number | string;
    fxRate: Prisma.Decimal | number | string;
    feeAmount: Prisma.Decimal | number | string;
    feeCurrency: string;
    fxSource: string;
    settlementProvider: string;
    settlementRef: string | null;
    chain?: WalletChain | null;
    txHash?: string | null;
    usdcAmount?: Prisma.Decimal | number | string | null;
    note: string | null;
    failureReason: string | null;
    completedAt: Date | null;
    createdAt: Date;
    recipient?: {
      id: string;
      label: string | null;
      accountName: string;
      accountNumber: string;
      bankName: string;
      bankCode: string | null;
    };
  }): TransferView {
    const chain = (row.chain as SharedWalletChain | null | undefined) ?? null;
    const txHash = row.txHash ?? null;
    return {
      id: row.id,
      recipientId: row.recipientId,
      direction: 'USD_TO_NGN',
      status: row.status as TransferStatus,
      sourceCurrency: 'USD',
      sourceAmount: Number(row.sourceAmount),
      destCurrency: 'NGN',
      destAmount: Number(row.destAmount),
      fxRate: Number(row.fxRate),
      feeAmount: Number(row.feeAmount),
      feeCurrency: 'USD',
      fxSource: row.fxSource,
      settlementProvider: row.settlementProvider,
      settlementRef: row.settlementRef,
      chain,
      txHash,
      usdcAmount: row.usdcAmount != null ? Number(row.usdcAmount) : null,
      explorerUrl:
        chain && txHash
          ? explorerTxUrl(chain === 'BASE' ? 'BASE' : 'BASE_SEPOLIA', txHash)
          : null,
      note: row.note,
      failureReason: row.failureReason,
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      recipient: row.recipient,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === 'P2002'
    );
  }

  private async safeNotify(
    input: Parameters<NotificationsService['notify']>[0],
  ): Promise<void> {
    try {
      await this.notifications.notify(input);
    } catch {
      // Remittance must not fail because a notification adapter failed.
    }
  }
}

function round(value: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}
