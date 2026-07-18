import type { ChainId, WalletDescriptor } from '../types';

/**
 * Port for custodial wallet provisioning via Circle.
 */
export interface WalletPort {
  createWallet(input: {
    userId: string;
    chain: ChainId;
  }): Promise<WalletDescriptor>;

  getWallet(providerWalletId: string): Promise<WalletDescriptor>;
}
