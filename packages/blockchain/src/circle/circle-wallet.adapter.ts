import { randomUUID } from 'node:crypto';
import type { WalletPort } from '../ports/wallet.port';
import type { ChainId, WalletDescriptor } from '../types';
import type { CircleClient } from './client.port';

export class CircleWalletAdapter implements WalletPort {
  constructor(private readonly client: CircleClient) {}

  createWallet(input: {
    userId: string;
    chain: ChainId;
  }): Promise<WalletDescriptor> {
    return this.client.createWallet({
      userId: input.userId,
      chain: input.chain,
      idempotencyKey: randomUUID(),
    });
  }

  getWallet(providerWalletId: string): Promise<WalletDescriptor> {
    return this.client.getWallet(providerWalletId);
  }
}
