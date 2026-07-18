export type ChainId = 'BASE' | 'BASE_SEPOLIA';

/** Circle API blockchain identifiers. */
export type CircleBlockchain = 'BASE' | 'BASE-SEPOLIA';

export interface WalletDescriptor {
  providerWalletId: string;
  walletSetId?: string;
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
  /** Circle token id when using live developer-controlled wallets. */
  tokenId?: string;
}

export type UsdcTransferStatus = 'pending' | 'complete' | 'failed';

export interface UsdcTransferResult {
  providerTransferId: string;
  txHash?: string;
  status: UsdcTransferStatus;
}

export function toCircleBlockchain(chain: ChainId): CircleBlockchain {
  return chain === 'BASE' ? 'BASE' : 'BASE-SEPOLIA';
}

export function fromCircleBlockchain(value: string): ChainId {
  if (value === 'BASE') return 'BASE';
  if (value === 'BASE-SEPOLIA' || value === 'BASE_SEPOLIA') return 'BASE_SEPOLIA';
  throw new Error(`Unsupported Circle blockchain: ${value}`);
}
