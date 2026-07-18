import type { Recipient } from './recipients';
import type { WalletChain } from './wallets';

export enum TransferStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export type CreateTransferInput = {
  recipientId: string;
  /** USD amount the user sends (before fee). */
  amountUsd: number;
  note?: string;
  idempotencyKey?: string;
};

export type TransferView = {
  id: string;
  recipientId: string;
  direction: 'USD_TO_NGN';
  status: TransferStatus;
  sourceCurrency: 'USD';
  sourceAmount: number;
  destCurrency: 'NGN';
  destAmount: number;
  fxRate: number;
  feeAmount: number;
  feeCurrency: 'USD';
  fxSource: string;
  settlementProvider: string;
  settlementRef: string | null;
  chain: WalletChain | null;
  txHash: string | null;
  usdcAmount: number | null;
  explorerUrl: string | null;
  note: string | null;
  failureReason: string | null;
  completedAt: string | null;
  createdAt: string;
  recipient?: Pick<
    Recipient,
    'id' | 'label' | 'accountName' | 'accountNumber' | 'bankName' | 'bankCode'
  >;
};

/** Platform fee charged on source USD amount. */
export const TRANSFER_FEE_RATE = 0.005;
export const MIN_TRANSFER_USD = 5;
export const MAX_TRANSFER_USD = 10_000;
