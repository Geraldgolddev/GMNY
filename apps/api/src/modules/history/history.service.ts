import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Prisma,
  TransactionStatus as DbTxnStatus,
  TransactionType as DbTxnType,
  TransferStatus as DbTransferStatus,
} from '@gmny/database';
import { explorerTxUrl } from '@gmny/blockchain';
import {
  HISTORY_DEFAULT_PAGE_SIZE,
  HISTORY_MAX_PAGE_SIZE,
  LedgerTransactionStatus,
  LedgerTransactionType,
  TransferStatus,
  WalletChain,
  type HistorySummary,
  type LedgerEntryView,
  type LedgerListQuery,
  type PaginatedResult,
  type TransferHistoryDetail,
  type TransferView,
  type HistoryListQuery,
} from '@gmny/shared';
import type { WalletChain as DbWalletChain } from '@gmny/database';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

const recipientSelect = {
  id: true,
  label: true,
  accountName: true,
  accountNumber: true,
  bankName: true,
  bankCode: true,
} as const;

@Injectable()
export class HistoryService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(userId: string): Promise<HistorySummary> {
    const [counts, completedAgg] = await Promise.all([
      this.prisma.transfer.groupBy({
        by: ['status'],
        where: { userId },
        _count: { _all: true },
      }),
      this.prisma.transfer.aggregate({
        where: { userId, status: DbTransferStatus.COMPLETED },
        _sum: {
          sourceAmount: true,
          feeAmount: true,
          destAmount: true,
        },
        _count: { _all: true },
      }),
    ]);

    const byStatus = Object.fromEntries(
      counts.map((row) => [row.status, row._count._all]),
    ) as Partial<Record<DbTransferStatus, number>>;

    const transferCount = counts.reduce((sum, row) => sum + row._count._all, 0);

    return {
      transferCount,
      completedCount: byStatus.COMPLETED ?? 0,
      failedCount: byStatus.FAILED ?? 0,
      totalSentUsd: Number(completedAgg._sum.sourceAmount ?? 0),
      totalFeesUsd: Number(completedAgg._sum.feeAmount ?? 0),
      totalReceivedNgn: Number(completedAgg._sum.destAmount ?? 0),
    };
  }

  async listTransfers(
    userId: string,
    query: HistoryListQuery = {},
  ): Promise<PaginatedResult<TransferView>> {
    const { page, pageSize, skip } = normalizePage(query.page, query.pageSize);
    const status = optionalEnum(query.status, TransferStatus, 'status');
    const where: Prisma.TransferWhereInput = {
      userId,
      ...(status ? { status: status as DbTransferStatus } : {}),
      ...dateRange(query.from, query.to),
    };

    const [total, rows] = await Promise.all([
      this.prisma.transfer.count({ where }),
      this.prisma.transfer.findMany({
        where,
        include: { recipient: { select: recipientSelect } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => this.toTransferView(row)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  async getTransferDetail(
    userId: string,
    id: string,
  ): Promise<TransferHistoryDetail> {
    const row = await this.prisma.transfer.findFirst({
      where: { id, userId },
      include: {
        recipient: { select: recipientSelect },
        transactions: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!row) {
      throw new NotFoundException({
        error: 'TRANSFER_NOT_FOUND',
        message: 'Transfer not found',
      });
    }
    return {
      ...this.toTransferView(row),
      ledger: row.transactions.map((txn) => this.toLedgerView(txn)),
    };
  }

  async listLedger(
    userId: string,
    query: LedgerListQuery = {},
  ): Promise<PaginatedResult<LedgerEntryView>> {
    const { page, pageSize, skip } = normalizePage(query.page, query.pageSize);
    const type = optionalEnum(query.type, LedgerTransactionType, 'type');
    const status = optionalEnum(query.status, LedgerTransactionStatus, 'status');
    const where: Prisma.TransactionWhereInput = {
      userId,
      ...(type ? { type: type as DbTxnType } : {}),
      ...(status ? { status: status as DbTxnStatus } : {}),
      ...(query.transferId ? { transferId: query.transferId } : {}),
      ...dateRange(query.from, query.to),
    };

    const [total, rows] = await Promise.all([
      this.prisma.transaction.count({ where }),
      this.prisma.transaction.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
    ]);

    return {
      items: rows.map((row) => this.toLedgerView(row)),
      page,
      pageSize,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / pageSize),
    };
  }

  private toTransferView(row: {
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
    chain?: DbWalletChain | null;
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
    const chain = (row.chain as WalletChain | null | undefined) ?? null;
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

  private toLedgerView(row: {
    id: string;
    transferId: string | null;
    type: DbTxnType;
    status: DbTxnStatus;
    currency: string;
    amount: Prisma.Decimal | number | string;
    description: string;
    createdAt: Date;
  }): LedgerEntryView {
    return {
      id: row.id,
      transferId: row.transferId,
      type: row.type as LedgerTransactionType,
      status: row.status as LedgerTransactionStatus,
      currency: row.currency,
      amount: Number(row.amount),
      description: row.description,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

function optionalEnum<T extends string>(
  value: string | undefined,
  table: Record<string, T>,
  field: string,
): T | undefined {
  if (value == null || value === '') return undefined;
  const allowed = Object.values(table);
  if (!allowed.includes(value as T)) {
    throw new BadRequestException({
      error: 'VALIDATION_ERROR',
      message: `${field} must be one of: ${allowed.join(', ')}`,
    });
  }
  return value as T;
}

function normalizePage(pageRaw?: number, pageSizeRaw?: number) {
  const page = Math.max(1, Math.floor(Number(pageRaw) || 1));
  let pageSize = Math.floor(Number(pageSizeRaw) || HISTORY_DEFAULT_PAGE_SIZE);
  if (!Number.isFinite(pageSize) || pageSize < 1) {
    pageSize = HISTORY_DEFAULT_PAGE_SIZE;
  }
  pageSize = Math.min(pageSize, HISTORY_MAX_PAGE_SIZE);
  return { page, pageSize, skip: (page - 1) * pageSize };
}

function dateRange(
  from?: string,
  to?: string,
): { createdAt?: Prisma.DateTimeFilter } {
  const createdAt: Prisma.DateTimeFilter = {};
  if (from) {
    const start = new Date(from);
    if (Number.isNaN(start.getTime())) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'from must be a valid ISO date',
      });
    }
    createdAt.gte = start;
  }
  if (to) {
    const end = new Date(to);
    if (Number.isNaN(end.getTime())) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'to must be a valid ISO date',
      });
    }
    createdAt.lte = end;
  }
  return Object.keys(createdAt).length ? { createdAt } : {};
}
