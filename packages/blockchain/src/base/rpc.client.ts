import { BlockchainError } from '../errors';

export type JsonRpcRequest = {
  method: string;
  params?: unknown[];
};

export interface JsonRpcTransport {
  request<T>(req: JsonRpcRequest): Promise<T>;
}

/**
 * Minimal JSON-RPC 2.0 client for Base public / Alchemy / custom endpoints.
 */
export class FetchJsonRpcClient implements JsonRpcTransport {
  constructor(
    private readonly rpcUrl: string,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async request<T>(req: JsonRpcRequest): Promise<T> {
    const res = await this.fetchImpl(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: req.method,
        params: req.params ?? [],
      }),
    });

    if (!res.ok) {
      throw new BlockchainError(
        `Base RPC HTTP ${res.status}`,
        'BASE_RPC_HTTP_ERROR',
      );
    }

    const body = (await res.json()) as {
      result?: T;
      error?: { message?: string; code?: number };
    };

    if (body.error) {
      throw new BlockchainError(
        body.error.message ?? 'Base RPC error',
        'BASE_RPC_ERROR',
        body.error,
      );
    }

    return body.result as T;
  }
}
