import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SimulatedCircleClient } from './simulated.client';

describe('SimulatedCircleClient', () => {
  it('creates a deterministic wallet address per user/chain', async () => {
    const client = new SimulatedCircleClient();
    const a = await client.createWallet({
      userId: 'user-1',
      chain: 'BASE_SEPOLIA',
      idempotencyKey: 'k1',
    });
    const b = await client.createWallet({
      userId: 'user-1',
      chain: 'BASE_SEPOLIA',
      idempotencyKey: 'k2',
    });
    assert.equal(a.address, b.address);
    assert.match(a.address, /^0x[a-f0-9]{40}$/);
    assert.notEqual(a.providerWalletId, b.providerWalletId);
  });

  it('is idempotent for transfers and completes immediately', async () => {
    const client = new SimulatedCircleClient();
    const wallet = await client.createWallet({
      userId: 'user-1',
      chain: 'BASE_SEPOLIA',
      idempotencyKey: 'w1',
    });

    const first = await client.transferUsdc({
      sourceWalletId: wallet.providerWalletId,
      destinationAddress: '0x1111111111111111111111111111111111111111',
      amount: '10.50',
      idempotencyKey: 'xfer-1',
      chain: 'BASE_SEPOLIA',
    });
    const second = await client.transferUsdc({
      sourceWalletId: wallet.providerWalletId,
      destinationAddress: '0x1111111111111111111111111111111111111111',
      amount: '10.50',
      idempotencyKey: 'xfer-1',
      chain: 'BASE_SEPOLIA',
    });

    assert.equal(first.status, 'complete');
    assert.equal(first.providerTransferId, second.providerTransferId);
    assert.ok(first.txHash?.startsWith('0x'));
  });
});
