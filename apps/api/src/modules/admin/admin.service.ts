import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditAction,
  NotificationChannel,
  Prisma,
  Role,
  TransferStatus,
} from '@gmny/database';
import type {
  AdminAuditView,
  AdminOverview,
  AdminTransferListResult,
  AdminUserListResult,
  AdminUserView,
  TransferStatus as SharedTransferStatus,
  UpdateAdminUserInput,
  WalletChain,
} from '@gmny/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async overview(): Promise<AdminOverview> {
    const [
      usersTotal,
      usersActive,
      admins,
      transfersTotal,
      transfersCompleted,
      transfersProcessing,
      transfersFailed,
      volume,
      walletsTotal,
      unreadInApp,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { role: Role.ADMIN } }),
      this.prisma.transfer.count(),
      this.prisma.transfer.count({ where: { status: TransferStatus.COMPLETED } }),
      this.prisma.transfer.count({ where: { status: TransferStatus.PROCESSING } }),
      this.prisma.transfer.count({ where: { status: TransferStatus.FAILED } }),
      this.prisma.transfer.aggregate({
        where: { status: TransferStatus.COMPLETED },
        _sum: { sourceAmount: true, destAmount: true },
      }),
      this.prisma.wallet.count(),
      this.prisma.notification.count({
        where: { channel: NotificationChannel.IN_APP, readAt: null },
      }),
    ]);

    return {
      users: { total: usersTotal, active: usersActive, admins },
      transfers: {
        total: transfersTotal,
        completed: transfersCompleted,
        processing: transfersProcessing,
        failed: transfersFailed,
        volumeUsd: Number(volume._sum.sourceAmount ?? 0),
        volumeNgn: Number(volume._sum.destAmount ?? 0),
      },
      wallets: { total: walletsTotal },
      notifications: { unreadInApp },
    };
  }

  async listUsers(query: {
    page?: number;
    pageSize?: number;
    q?: string;
  }): Promise<AdminUserListResult> {
    const { page, pageSize, skip } = paginate(query.page, query.pageSize);
    const q = query.q?.trim();
    const where: Prisma.UserWhereInput = q
      ? {
          OR: [
            { email: { contains: q, mode: 'insensitive' } },
            { firstName: { contains: q, mode: 'insensitive' } },
            { lastName: { contains: q, mode: 'insensitive' } },
          ],
        }
      : {};

    const [total, rows] = await Promise.all([
      this.prisma.user.count({ where }),
      this.prisma.user.findMany({
        where,
        include: { _count: { select: { transfers: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => this.toUserView(row)),
      total,
      page,
      pageSize,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async updateUser(
    actorId: string,
    userId: string,
    input: UpdateAdminUserInput,
  ): Promise<AdminUserView> {
    if (typeof input.isActive !== 'boolean') {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'isActive boolean is required',
      });
    }
    if (userId === actorId && input.isActive === false) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: 'You cannot deactivate your own admin account',
      });
    }

    const existing = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existing) {
      throw new NotFoundException({
        error: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: userId },
        data: { isActive: input.isActive },
        include: { _count: { select: { transfers: true } } },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: input.isActive
            ? AuditAction.USER_ACTIVATED
            : AuditAction.USER_DEACTIVATED,
          entityType: 'User',
          entityId: userId,
          metadata: { email: user.email, isActive: user.isActive },
        },
      });
      return user;
    });

    return this.toUserView(updated);
  }

  async listTransfers(query: {
    page?: number;
    pageSize?: number;
    status?: string;
  }): Promise<AdminTransferListResult> {
    const { page, pageSize, skip } = paginate(query.page, query.pageSize);
    const status = query.status?.trim().toUpperCase();
    const where: Prisma.TransferWhereInput = status
      ? { status: status as TransferStatus }
      : {};

    const [total, rows] = await Promise.all([
      this.prisma.transfer.count({ where }),
      this.prisma.transfer.findMany({
        where,
        include: {
          user: { select: { email: true } },
          recipient: { select: { accountName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => ({
        id: row.id,
        userId: row.userId,
        userEmail: row.user.email,
        recipientName: row.recipient.accountName,
        status: row.status as SharedTransferStatus,
        sourceAmount: Number(row.sourceAmount),
        destAmount: Number(row.destAmount),
        feeAmount: Number(row.feeAmount),
        settlementProvider: row.settlementProvider,
        settlementRef: row.settlementRef,
        chain: (row.chain as WalletChain | null) ?? null,
        txHash: row.txHash,
        createdAt: row.createdAt.toISOString(),
        completedAt: row.completedAt?.toISOString() ?? null,
      })),
      total,
      page,
      pageSize,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async recentAudit(limit = 30): Promise<AdminAuditView[]> {
    const take = Math.min(Math.max(limit, 1), 100);
    const rows = await this.prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take,
      include: { actor: { select: { email: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      actorId: row.actorId,
      actorEmail: row.actor?.email ?? null,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      createdAt: row.createdAt.toISOString(),
    }));
  }

  private toUserView(row: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    isActive: boolean;
    lastLoginAt: Date | null;
    createdAt: Date;
    _count: { transfers: number };
  }): AdminUserView {
    return {
      id: row.id,
      email: row.email,
      firstName: row.firstName,
      lastName: row.lastName,
      role: row.role,
      isActive: row.isActive,
      lastLoginAt: row.lastLoginAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      transferCount: row._count.transfers,
    };
  }
}

function paginate(pageRaw?: number, pageSizeRaw?: number) {
  const page = Math.max(1, Math.floor(Number(pageRaw) || 1));
  let pageSize = Math.floor(Number(pageSizeRaw) || 20);
  if (!Number.isFinite(pageSize) || pageSize < 1) pageSize = 20;
  pageSize = Math.min(pageSize, 100);
  return { page, pageSize, skip: (page - 1) * pageSize };
}
