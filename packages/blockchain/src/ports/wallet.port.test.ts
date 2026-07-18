import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { WalletPort } from './wallet.port';
import { BlockchainNotConfiguredError } from '../errors';

describe('WalletPort contract', () => {
  it('allows a typed adapter that fails closed when unconfigured', async () => {
    const adapter: WalletPort = {
      async createWallet() {
        throw new BlockchainNotConfiguredError('CircleWalletAdapter');
      },
      async getWallet() {
        throw new BlockchainNotConfiguredError('CircleWalletAdapter');
      },
    };

    await assert.rejects(
      () => adapter.createWallet({ userId: 'u1', chain: 'BASE' }),
      (err: unknown) =>
        err instanceof BlockchainNotConfiguredError &&
        err.code === 'BLOCKCHAIN_NOT_CONFIGURED',
    );
  });
});
