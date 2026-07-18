import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FetchJsonRpcClient,
  SimulatedBaseRpc,
  resolveBaseNetwork,
  type ChainId,
  type JsonRpcTransport,
} from '@gmny/blockchain';
import { WalletChain, type BaseNetworkView } from '@gmny/shared';

@Injectable()
export class BaseConfigService {
  private readonly transport: JsonRpcTransport;
  private readonly rpcMode: 'live' | 'simulate';

  constructor(private readonly config: ConfigService) {
    const mode = (
      this.config.get<string>('BASE_RPC_MODE') ?? 'simulate'
    ).toLowerCase();
    this.rpcMode = mode === 'live' ? 'live' : 'simulate';
    this.transport =
      this.rpcMode === 'live'
        ? new FetchJsonRpcClient(this.rpcUrl)
        : new SimulatedBaseRpc();
  }

  get chain(): ChainId {
    const value = (
      this.config.get<string>('CIRCLE_CHAIN') ??
      this.config.get<string>('BASE_CHAIN') ??
      'BASE_SEPOLIA'
    )
      .trim()
      .toUpperCase()
      .replace(/-/g, '_');
    return value === 'BASE' ? 'BASE' : 'BASE_SEPOLIA';
  }

  get rpcUrl(): string {
    const override = this.config.get<string>('BASE_RPC_URL')?.trim();
    return resolveBaseNetwork(this.chain, override).rpcUrl;
  }

  get rpc(): JsonRpcTransport {
    return this.transport;
  }

  networkView(): BaseNetworkView {
    const network = resolveBaseNetwork(this.chain, this.rpcUrl);
    return {
      chain:
        network.chain === 'BASE' ? WalletChain.BASE : WalletChain.BASE_SEPOLIA,
      chainId: network.chainId,
      name: network.name,
      rpcUrl: network.rpcUrl,
      rpcMode: this.rpcMode,
      usdcAddress: network.usdcAddress,
      usdcDecimals: network.usdcDecimals,
      explorerUrl: network.explorerUrl,
      nativeCurrency: network.nativeCurrency,
    };
  }
}
