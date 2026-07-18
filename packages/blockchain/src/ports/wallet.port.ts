import type { ChainId, WalletDescriptor } from '../types.js';

/**
 * Port for custodial wallet provisioning (Circle in production).
 * Adapters are wired in Phase 2; Phase 1 defines the contract only.
 */
export interface WalletPort {
  createWallet(input: {
    userId: string;
    chain: ChainId;
  }): Promise<WalletDescriptor>;

  getWallet(providerWalletId: string): Promise<WalletDescriptor>;
}
