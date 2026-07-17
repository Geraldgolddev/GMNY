import { UpstreamError } from '@nairaflow/shared';

export interface CircleClientConfig {
  apiKey: string;
  /** e.g. https://api-sandbox.circle.com */
  baseUrl: string;
  /** Injectable fetch implementation (defaults to global fetch) for testing. */
  fetchImpl?: typeof fetch;
}

export interface CircleWallet {
  walletId: string;
  address: string;
  blockchain: string;
}

export interface CircleTransfer {
  id: string;
  status: 'pending' | 'complete' | 'failed';
  transactionHash?: string;
}

export interface CreateTransferInput {
  sourceWalletId: string;
  destinationAddress: string;
  /** Decimal USDC amount, e.g. "10.50". */
  amount: string;
  idempotencyKey: string;
}

/**
 * Thin, typed wrapper over the Circle programmable-wallets REST API. Every
 * call funnels through {@link request} which handles auth headers, JSON
 * (de)serialization, and maps transport/HTTP failures to `UpstreamError`.
 *
 * The client is intentionally transport-agnostic: a `fetchImpl` can be
 * injected in tests to assert request shape without hitting the network.
 */
export class CircleClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(config: CircleClientConfig) {
    if (!config.apiKey) {
      throw new Error('CircleClient requires an apiKey');
    }
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.fetchImpl = config.fetchImpl ?? globalThis.fetch;
  }

  /** Create a developer-controlled custodial wallet on Base. */
  async createWallet(idempotencyKey: string): Promise<CircleWallet> {
    const body = await this.request<{ data: { wallets: CircleWallet[] } }>('/v1/w3s/wallets', {
      method: 'POST',
      body: JSON.stringify({ idempotencyKey, blockchains: ['BASE-SEPOLIA'] }),
    });
    const wallet = body.data.wallets[0];
    if (!wallet) throw new UpstreamError('Circle returned no wallet');
    return wallet;
  }

  /** Initiate a USDC transfer from a custodial wallet to an on-chain address. */
  async createTransfer(input: CreateTransferInput): Promise<CircleTransfer> {
    const body = await this.request<{ data: CircleTransfer }>('/v1/w3s/transactions/transfer', {
      method: 'POST',
      body: JSON.stringify({
        idempotencyKey: input.idempotencyKey,
        walletId: input.sourceWalletId,
        destinationAddress: input.destinationAddress,
        amounts: [input.amount],
        tokenId: 'USDC',
      }),
    });
    return body.data;
  }

  /** Fetch the current status of a previously created transfer. */
  async getTransfer(transferId: string): Promise<CircleTransfer> {
    const body = await this.request<{ data: CircleTransfer }>(
      `/v1/w3s/transactions/${transferId}`,
      { method: 'GET' },
    );
    return body.data;
  }

  private async request<T>(path: string, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        ...init,
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          ...(init.headers ?? {}),
        },
      });
    } catch (cause) {
      throw new UpstreamError('Failed to reach Circle API', cause);
    }

    const text = await response.text();
    const parsed = text ? (JSON.parse(text) as T) : ({} as T);

    if (!response.ok) {
      throw new UpstreamError(`Circle API error (${response.status})`, parsed);
    }
    return parsed;
  }
}
