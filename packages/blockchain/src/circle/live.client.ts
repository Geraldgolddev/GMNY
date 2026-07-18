import { BlockchainError, BlockchainNotConfiguredError } from '../errors';
import type { CircleClient, CircleClientConfig } from './client.port';
import {
  fromCircleBlockchain,
  toCircleBlockchain,
  type ChainId,
  type UsdcTransferRequest,
  type UsdcTransferResult,
  type WalletDescriptor,
} from '../types';

type SdkClient = {
  createWallets: (input: Record<string, unknown>) => Promise<{
    data?: { wallets?: Array<Record<string, unknown>> };
  }>;
  getWallet: (id: string) => Promise<{ data?: { wallet?: Record<string, unknown> } }>;
  createTransaction: (input: Record<string, unknown>) => Promise<{
    data?: { id?: string; state?: string; txHash?: string; transaction?: Record<string, unknown> };
  }>;
  getTransaction: (input: { id: string }) => Promise<{
    data?: { transaction?: Record<string, unknown> };
  }>;
};

/**
 * Live Circle Developer Controlled Wallets client (sandbox or production host).
 * Loads the official SDK lazily so simulate mode never requires the package at runtime paths
 * that don't use live mode — the dependency is still declared on @gmny/blockchain.
 */
export class LiveCircleClient implements CircleClient {
  readonly mode = 'live' as const;
  private sdk: SdkClient | null = null;

  constructor(private readonly config: CircleClientConfig) {
    if (!config.apiKey || !config.entitySecret || !config.walletSetId) {
      throw new BlockchainNotConfiguredError('LiveCircleClient');
    }
  }

  private async client(): Promise<SdkClient> {
    if (this.sdk) return this.sdk;
    try {
      const mod = await import('@circle-fin/developer-controlled-wallets');
      this.sdk = mod.initiateDeveloperControlledWalletsClient({
        apiKey: this.config.apiKey!,
        entitySecret: this.config.entitySecret!,
      }) as unknown as SdkClient;
      return this.sdk;
    } catch (cause) {
      throw new BlockchainError(
        'Failed to initialize Circle SDK. Is @circle-fin/developer-controlled-wallets installed?',
        'CIRCLE_SDK_INIT_FAILED',
        cause,
      );
    }
  }

  async createWallet(input: {
    userId: string;
    chain: ChainId;
    idempotencyKey: string;
  }): Promise<WalletDescriptor> {
    const client = await this.client();
    const response = await client.createWallets({
      accountType: 'EOA',
      blockchains: [toCircleBlockchain(input.chain)],
      count: 1,
      walletSetId: this.config.walletSetId,
      idempotencyKey: input.idempotencyKey,
      metadata: [{ name: `gmny-${input.userId.slice(0, 8)}`, refId: input.userId }],
    });

    const wallet = response.data?.wallets?.[0];
    if (!wallet?.id || !wallet.address || !wallet.blockchain) {
      throw new BlockchainError(
        'Circle createWallets returned no wallet',
        'CIRCLE_WALLET_CREATE_FAILED',
      );
    }

    return {
      providerWalletId: String(wallet.id),
      walletSetId: wallet.walletSetId ? String(wallet.walletSetId) : this.config.walletSetId,
      address: String(wallet.address),
      chain: fromCircleBlockchain(String(wallet.blockchain)),
      currency: 'USDC',
    };
  }

  async getWallet(providerWalletId: string): Promise<WalletDescriptor> {
    const client = await this.client();
    const response = await client.getWallet(providerWalletId);
    const wallet = response.data?.wallet;
    if (!wallet?.id || !wallet.address || !wallet.blockchain) {
      throw new BlockchainError(
        `Circle wallet not found: ${providerWalletId}`,
        'CIRCLE_WALLET_NOT_FOUND',
      );
    }
    return {
      providerWalletId: String(wallet.id),
      walletSetId: wallet.walletSetId ? String(wallet.walletSetId) : undefined,
      address: String(wallet.address),
      chain: fromCircleBlockchain(String(wallet.blockchain)),
      currency: 'USDC',
    };
  }

  async transferUsdc(request: UsdcTransferRequest): Promise<UsdcTransferResult> {
    const tokenId = request.tokenId ?? this.config.usdcTokenId;
    if (!tokenId) {
      throw new BlockchainNotConfiguredError('LiveCircleClient.usdcTokenId');
    }

    const client = await this.client();
    const response = await client.createTransaction({
      walletId: request.sourceWalletId,
      tokenId,
      destinationAddress: request.destinationAddress,
      amounts: [request.amount],
      idempotencyKey: request.idempotencyKey,
      fee: { type: 'level', config: { feeLevel: 'MEDIUM' } },
    });

    const tx = response.data?.transaction ?? response.data;
    const id = tx?.id ?? response.data?.id;
    if (!id) {
      throw new BlockchainError(
        'Circle createTransaction returned no id',
        'CIRCLE_TRANSFER_CREATE_FAILED',
      );
    }

    return {
      providerTransferId: String(id),
      txHash: tx?.txHash ? String(tx.txHash) : undefined,
      status: mapCircleState(String(tx?.state ?? response.data?.state ?? 'PENDING')),
    };
  }

  async getTransfer(providerTransferId: string): Promise<UsdcTransferResult> {
    const client = await this.client();
    const response = await client.getTransaction({ id: providerTransferId });
    const tx = response.data?.transaction;
    if (!tx?.id) {
      throw new BlockchainError(
        `Circle transfer not found: ${providerTransferId}`,
        'CIRCLE_TRANSFER_NOT_FOUND',
      );
    }
    return {
      providerTransferId: String(tx.id),
      txHash: tx.txHash ? String(tx.txHash) : undefined,
      status: mapCircleState(String(tx.state ?? 'PENDING')),
    };
  }
}

function mapCircleState(state: string): UsdcTransferResult['status'] {
  const normalized = state.toUpperCase();
  if (normalized === 'COMPLETE' || normalized === 'CONFIRMED') return 'complete';
  if (normalized === 'FAILED' || normalized === 'DENIED' || normalized === 'CANCELLED') {
    return 'failed';
  }
  return 'pending';
}
