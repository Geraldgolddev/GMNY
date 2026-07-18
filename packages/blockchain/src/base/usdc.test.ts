import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { formatUsdc, getTransactionReceipt, getUsdcBalance } from './usdc';
import { SimulatedBaseRpc } from './simulated.rpc';
import { explorerTxUrl, isEvmAddress, resolveBaseNetwork } from './network';

describe('Base USDC helpers', () => {
  it('formats 6-decimal USDC amounts', () => {
    assert.equal(formatUsdc(0n), '0');
    assert.equal(formatUsdc(1_500_000n), '1.5');
    assert.equal(formatUsdc(99_500_000n), '99.5');
  });

  it('resolves Base Sepolia network constants', () => {
    const net = resolveBaseNetwork('BASE_SEPOLIA');
    assert.equal(net.chainId, 84532);
    assert.ok(isEvmAddress(net.usdcAddress));
    assert.match(
      explorerTxUrl('BASE_SEPOLIA', `0x${'ab'.repeat(32)}`),
      /sepolia\.basescan\.org\/tx\//,
    );
  });

  it('reads a simulated USDC balance', async () => {
    const rpc = new SimulatedBaseRpc();
    const balance = await getUsdcBalance(
      rpc,
      '0x1111111111111111111111111111111111111111',
      'BASE_SEPOLIA',
    );
    assert.equal(balance.chain, 'BASE_SEPOLIA');
    assert.ok(Number(balance.balance) > 0);
    assert.match(balance.balance, /^\d+(\.\d+)?$/);
  });

  it('reads simulated tx receipts', async () => {
    const rpc = new SimulatedBaseRpc();
    const hash = `0x${'cd'.repeat(32)}`;
    assert.equal((await getTransactionReceipt(rpc, hash)).status, 'pending');
    rpc.setReceipt(hash, true, 42);
    const receipt = await getTransactionReceipt(rpc, hash);
    assert.equal(receipt.status, 'success');
    assert.equal(receipt.blockNumber, 42);
  });
});
