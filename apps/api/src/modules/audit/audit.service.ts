import { Injectable, Logger } from '@nestjs/common';
import { AuditAction } from '@gmny/shared';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditContext {
  ipAddress?: string;
  userAgent?: string;
}

export interface RecordAuditInput {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  userId?: string;
  metadata?: Record<string, unknown>;
  context?: AuditContext;
}

/**
 * Append-only audit trail. Writes never throw into the caller's flow — an
 * audit failure must not break a user-facing action, but it is logged loudly.
 */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async record(input: RecordAuditInput): Promise<void> {
    try {
      await this.prisma.auditLog.create({
        data: {
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          userId: input.userId,
          metadata: input.metadata as object | undefined,
          ipAddress: input.context?.ipAddress,
          userAgent: input.context?.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to write audit log: ${(error as Error).message}`);
    }
  }
}
