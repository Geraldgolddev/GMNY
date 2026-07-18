import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import {
  AuditAction,
  TransactionStatus,
  TransferStatus,
} from '@gmny/database';
import { NotificationType } from '@gmny/shared';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CircleConfigService } from './circle-config.service';

export type CircleWebhookPayload = {
  transferId?: string;
  providerTransferId?: string;
  status?: string;
  txHash?: string;
};

@Injectable()
export class CircleWebhookService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: CircleConfigService,
    private readonly notifications: NotificationsService,
  ) {}

  async handle(
    payload: CircleWebhookPayload,
    signatureHeader?: string,
    rawBody?: string,
  ): Promise<{ ok: true; transferId: string; status: string }> {
    this.verifySignature(signatureHeader, rawBody);

    const providerTransferId =
      payload.providerTransferId?.trim() || payload.transferId?.trim();
    if (!providerTransferId) {
      throw new NotFoundException({
        error: 'VALIDATION_ERROR',
        message: 'providerTransferId is required',
      });
    }

    const transfer = await this.prisma.transfer.findFirst({
      where: {
        settlementProvider: 'CIRCLE',
        settlementRef: providerTransferId,
      },
    });
    if (!transfer) {
      throw new NotFoundException({
        error: 'TRANSFER_NOT_FOUND',
        message: 'No transfer matches this Circle reference',
      });
    }

    const mapped = mapStatus(payload.status);
    const nextTransferStatus =
      mapped === 'complete'
        ? TransferStatus.COMPLETED
        : mapped === 'failed'
          ? TransferStatus.FAILED
          : TransferStatus.PROCESSING;
    const nextLedgerStatus =
      mapped === 'complete'
        ? TransactionStatus.SETTLED
        : mapped === 'failed'
          ? TransactionStatus.FAILED
          : TransactionStatus.PENDING;

    await this.prisma.$transaction(async (tx) => {
      await tx.transfer.update({
        where: { id: transfer.id },
        data: {
          status: nextTransferStatus,
          txHash: payload.txHash?.trim() || transfer.txHash,
          completedAt:
            nextTransferStatus === TransferStatus.COMPLETED
              ? new Date()
              : null,
          failureReason:
            nextTransferStatus === TransferStatus.FAILED
              ? 'Circle transfer failed'
              : null,
        },
      });

      await tx.transaction.updateMany({
        where: { transferId: transfer.id },
        data: { status: nextLedgerStatus },
      });

      await tx.auditLog.create({
        data: {
          actorId: transfer.userId,
          action: AuditAction.CIRCLE_TRANSFER_UPDATED,
          entityType: 'Transfer',
          entityId: transfer.id,
          metadata: {
            providerTransferId,
            status: mapped,
            txHash: payload.txHash ?? null,
          },
        },
      });

      if (nextTransferStatus === TransferStatus.COMPLETED) {
        await tx.auditLog.create({
          data: {
            actorId: transfer.userId,
            action: AuditAction.TRANSFER_COMPLETED,
            entityType: 'Transfer',
            entityId: transfer.id,
            metadata: { providerTransferId, provider: 'CIRCLE' },
          },
        });
      }
      if (nextTransferStatus === TransferStatus.FAILED) {
        await tx.auditLog.create({
          data: {
            actorId: transfer.userId,
            action: AuditAction.TRANSFER_FAILED,
            entityType: 'Transfer',
            entityId: transfer.id,
            metadata: { providerTransferId, provider: 'CIRCLE' },
          },
        });
      }
    });

    try {
      if (nextTransferStatus === TransferStatus.COMPLETED) {
        await this.notifications.notify({
          userId: transfer.userId,
          type: NotificationType.TRANSFER_COMPLETED,
          title: 'Transfer completed',
          body: `Your send of ${Number(transfer.sourceAmount).toFixed(2)} USD completed.`,
          entityType: 'Transfer',
          entityId: transfer.id,
          metadata: { providerTransferId, txHash: payload.txHash ?? null },
          email: true,
        });
      }
      if (nextTransferStatus === TransferStatus.FAILED) {
        await this.notifications.notify({
          userId: transfer.userId,
          type: NotificationType.TRANSFER_FAILED,
          title: 'Transfer failed',
          body: 'Your Circle settlement failed. Check history for details.',
          entityType: 'Transfer',
          entityId: transfer.id,
          metadata: { providerTransferId },
          email: true,
        });
      }
    } catch {
      // Webhook ack must succeed even if notify fails.
    }

    return { ok: true, transferId: transfer.id, status: nextTransferStatus };
  }

  private verifySignature(signatureHeader?: string, rawBody?: string): void {
    const secret = this.config.webhookSecret;
    if (!secret) {
      // Open in simulate/dev when no secret configured.
      return;
    }
    if (!signatureHeader || !rawBody) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'Missing Circle webhook signature',
      });
    }
    const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
    const provided = signatureHeader.replace(/^sha256=/i, '').trim();
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'Invalid Circle webhook signature',
      });
    }
  }
}

function mapStatus(status?: string): 'pending' | 'complete' | 'failed' {
  const value = (status ?? 'pending').toLowerCase();
  if (value === 'complete' || value === 'completed' || value === 'confirmed') {
    return 'complete';
  }
  if (value === 'failed' || value === 'denied' || value === 'cancelled') {
    return 'failed';
  }
  return 'pending';
}
