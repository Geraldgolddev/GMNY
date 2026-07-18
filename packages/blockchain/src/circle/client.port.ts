import type { ChainId, UsdcTransferRequest, UsdcTransferResult, WalletDescriptor } from '../types';

export type CircleMode = 'simulate' | 'live';

export interface CircleClientConfig {
  mode: CircleMode;
  apiKey?: string;
  entitySecret?: string;
  walletSetId?: string;
  /** Required for live USDC transfers via developer-controlled wallets. */
  usdcTokenId?: string;
  apiBaseUrl: string;
  defaultChain: ChainId;
}

export interface CircleClient {
  readonly mode: CircleMode;

  createWallet(input: {
    userId: string;
    chain: ChainId;
    idempotencyKey: string;
  }): Promise<WalletDescriptor>;

  getWallet(providerWalletId: string): Promise<WalletDescriptor>;

  transferUsdc(request: UsdcTransferRequest): Promise<UsdcTransferResult>;

  getTransfer(providerTransferId: string): Promise<UsdcTransferResult>;
}

export const CIRCLE_SANDBOX_API_BASE = 'https://api-sandbox.circle.com';
export const CIRCLE_PROD_API_BASE = 'https://api.circle.com';
