export type SettlementRequest = {
  transferId: string;
  userId: string;
  recipientId: string;
  sourceAmountUsd: number;
  destAmountNgn: number;
  fxRate: number;
};

export type SettlementResult = {
  provider: string;
  reference: string;
  status: 'pending' | 'complete' | 'failed';
  txHash?: string;
  chain?: 'BASE' | 'BASE_SEPOLIA';
  usdcAmount?: number;
};

export interface SettlementPort {
  settleUsdToNgn(request: SettlementRequest): Promise<SettlementResult>;
}

export const SETTLEMENT_PORT = Symbol('SETTLEMENT_PORT');
