import { createHash } from 'node:crypto';
import type { JsonRpcRequest, JsonRpcTransport } from './rpc.client';

/**
 * Deterministic local Base RPC for tests / offline simulate mode.
 * balanceOf returns a stable faux USDC balance derived from the address.
 */
export class SimulatedBaseRpc implements JsonRpcTransport {
  private readonly receipts = new Map<
    string,
    { status: '0x1' | '0x0'; blockNumber: string }
  >();

  async request<T>(req: JsonRpcRequest): Promise<T> {
    if (req.method === 'eth_call') {
      const call = req.params?.[0] as { data?: string } | undefined;
      const data = call?.data ?? '';
      // balanceOf(address)
      if (data.startsWith('0x70a08231') && data.length >= 74) {
        const addr = `0x${data.slice(-40)}`;
        const raw = fauxBalance(addr);
        return (`0x${raw.toString(16)}` as unknown) as T;
      }
      return ('0x0' as unknown) as T;
    }

    if (req.method === 'eth_getTransactionReceipt') {
      const hash = String(req.params?.[0] ?? '');
      const stored = this.receipts.get(hash.toLowerCase());
      if (!stored) return null as T;
      return {
        status: stored.status,
        blockNumber: stored.blockNumber,
      } as T;
    }

    if (req.method === 'eth_chainId') {
      return ('0x14a34' as unknown) as T; // 84532 Base Sepolia
    }

    throw new Error(`SimulatedBaseRpc unsupported method: ${req.method}`);
  }

  /** Test helper */
  setReceipt(txHash: string, success = true, blockNumber = 100): void {
    this.receipts.set(txHash.toLowerCase(), {
      status: success ? '0x1' : '0x0',
      blockNumber: `0x${blockNumber.toString(16)}`,
    });
  }
}

function fauxBalance(address: string): bigint {
  const digest = createHash('sha256').update(address.toLowerCase()).digest();
  // ~10–100 USDC in 6-decimal units
  const units = 10_000_000n + BigInt(digest.readUInt32BE(0) % 90_000_000);
  return units;
}
