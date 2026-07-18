import type { TransferStatus, TransferView } from './transfers';

export enum LedgerTransactionType {
  TRANSFER = 'TRANSFER',
  FEE = 'FEE',
  FX_CONVERSION = 'FX_CONVERSION',
}

export enum LedgerTransactionStatus {
  PENDING = 'PENDING',
  SETTLED = 'SETTLED',
  FAILED = 'FAILED',
}

export type LedgerEntryView = {
  id: string;
  transferId: string | null;
  type: LedgerTransactionType;
  status: LedgerTransactionStatus;
  currency: string;
  amount: number;
  description: string;
  createdAt: string;
};

export type HistoryListQuery = {
  page?: number;
  pageSize?: number;
  status?: TransferStatus;
  from?: string;
  to?: string;
};

export type LedgerListQuery = {
  page?: number;
  pageSize?: number;
  type?: LedgerTransactionType;
  status?: LedgerTransactionStatus;
  transferId?: string;
  from?: string;
  to?: string;
};

export type PaginatedResult<T> = {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type TransferHistoryDetail = TransferView & {
  ledger: LedgerEntryView[];
};

export type HistorySummary = {
  transferCount: number;
  completedCount: number;
  failedCount: number;
  totalSentUsd: number;
  totalFeesUsd: number;
  totalReceivedNgn: number;
};

export const HISTORY_DEFAULT_PAGE_SIZE = 20;
export const HISTORY_MAX_PAGE_SIZE = 100;
