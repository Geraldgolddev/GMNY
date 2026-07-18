export type ChainId = 'BASE' | 'BASE_SEPOLIA';

export interface WalletDescriptor {
  providerWalletId: string;
  address: string;
  chain: ChainId;
  currency: 'USDC';
}

export interface UsdcTransferRequest {
  sourceWalletId: string;
  destinationAddress: string;
  amount: string;
  idempotencyKey: string;
  chain: ChainId;
}

export interface UsdcTransferResult {
  providerTransferId: string;
  txHash?: string;
  status: 'pending' | 'complete' | 'failed';
}
