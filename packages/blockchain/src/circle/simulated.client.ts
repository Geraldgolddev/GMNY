import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type {
  CircleClient,
  CircleMode,
} from './client.port';
import type {
  ChainId,
  UsdcTransferRequest,
  UsdcTransferResult,
  WalletDescriptor,
} from '../types';

type StoredTransfer = UsdcTransferResult & {
  request: UsdcTransferRequest;
};

/**
 * Deterministic local Circle sandbox for tests and development without API keys.
 * Wallet addresses are derived from userId+chain so re-provisioning is stable.
 */
export class SimulatedCircleClient implements CircleClient {
  readonly mode: CircleMode = 'simulate';

  private readonly wallets = new Map<string, WalletDescriptor>();
  private readonly transfers = new Map<string, StoredTransfer>();
  private readonly byIdempotency = new Map<string, string>();

  async createWallet(input: {
    userId: string;
    chain: ChainId;
    idempotencyKey: string;
  }): Promise<WalletDescriptor> {
    const existingId = this.byIdempotency.get(`wallet:${input.idempotencyKey}`);
    if (existingId) {
      const wallet = this.wallets.get(existingId);
      if (wallet) return wallet;
    }

    const providerWalletId = randomUUID();
    const address = deriveAddress(input.userId, input.chain);
    const wallet: WalletDescriptor = {
      providerWalletId,
      walletSetId: 'sim_wallet_set',
      address,
      chain: input.chain,
      currency: 'USDC',
    };
    this.wallets.set(providerWalletId, wallet);
    this.byIdempotency.set(`wallet:${input.idempotencyKey}`, providerWalletId);
    return wallet;
  }

  async getWallet(providerWalletId: string): Promise<WalletDescriptor> {
    const wallet = this.wallets.get(providerWalletId);
    if (!wallet) {
      throw new Error(`Simulated wallet not found: ${providerWalletId}`);
    }
    return wallet;
  }

  async transferUsdc(request: UsdcTransferRequest): Promise<UsdcTransferResult> {
    const amount = Number(request.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Invalid USDC transfer amount');
    }
    if (!request.destinationAddress?.startsWith('0x')) {
      throw new Error('destinationAddress must be an EVM address');
    }

    const existingId = this.byIdempotency.get(`xfer:${request.idempotencyKey}`);
    if (existingId) {
      const existing = this.transfers.get(existingId);
      if (existing) {
        return {
          providerTransferId: existing.providerTransferId,
          txHash: existing.txHash,
          status: existing.status,
        };
      }
    }

    const providerTransferId = randomUUID();
    const result: StoredTransfer = {
      providerTransferId,
      txHash: `0x${randomBytes(32).toString('hex')}`,
      status: 'complete',
      request,
    };
    this.transfers.set(providerTransferId, result);
    this.byIdempotency.set(`xfer:${request.idempotencyKey}`, providerTransferId);
    return {
      providerTransferId: result.providerTransferId,
      txHash: result.txHash,
      status: result.status,
    };
  }

  async getTransfer(providerTransferId: string): Promise<UsdcTransferResult> {
    const row = this.transfers.get(providerTransferId);
    if (!row) {
      throw new Error(`Simulated transfer not found: ${providerTransferId}`);
    }
    return {
      providerTransferId: row.providerTransferId,
      txHash: row.txHash,
      status: row.status,
    };
  }

  /** Test helper: force a transfer into a terminal state. */
  setTransferStatus(
    providerTransferId: string,
    status: UsdcTransferResult['status'],
  ): void {
    const row = this.transfers.get(providerTransferId);
    if (!row) return;
    row.status = status;
  }
}

function deriveAddress(userId: string, chain: ChainId): string {
  const digest = createHash('sha256')
    .update(`gmny:circle:sim:${chain}:${userId}`)
    .digest('hex');
  return `0x${digest.slice(0, 40)}`;
}
