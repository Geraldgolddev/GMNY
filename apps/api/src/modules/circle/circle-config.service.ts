import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CIRCLE_SANDBOX_API_BASE,
  createCircleClient,
  resolveCircleConfig,
  type CircleClient,
  type CircleMode,
  type ChainId,
} from '@gmny/blockchain';
import { WalletChain, type CircleStatusView } from '@gmny/shared';

@Injectable()
export class CircleConfigService {
  private readonly clientInstance: CircleClient;

  constructor(private readonly config: ConfigService) {
    this.clientInstance = createCircleClient({
      mode: this.config.get<string>('CIRCLE_MODE') ?? 'simulate',
      apiKey: this.config.get<string>('CIRCLE_API_KEY'),
      entitySecret: this.config.get<string>('CIRCLE_ENTITY_SECRET'),
      walletSetId: this.config.get<string>('CIRCLE_WALLET_SET_ID'),
      usdcTokenId: this.config.get<string>('CIRCLE_USDC_TOKEN_ID'),
      apiBaseUrl: this.config.get<string>('CIRCLE_API_BASE_URL'),
      defaultChain: this.config.get<string>('CIRCLE_CHAIN') ?? 'BASE_SEPOLIA',
      allowSimulateFallback: true,
    });
  }

  get client(): CircleClient {
    return this.clientInstance;
  }

  get mode(): CircleMode {
    return this.clientInstance.mode;
  }

  get defaultChain(): ChainId {
    return resolveCircleConfig({
      defaultChain: this.config.get<string>('CIRCLE_CHAIN') ?? 'BASE_SEPOLIA',
    }).defaultChain;
  }

  get walletSetId(): string | undefined {
    return this.config.get<string>('CIRCLE_WALLET_SET_ID')?.trim() || undefined;
  }

  get treasuryWalletId(): string | undefined {
    return (
      this.config.get<string>('CIRCLE_TREASURY_WALLET_ID')?.trim() || undefined
    );
  }

  get usdcTokenId(): string | undefined {
    return this.config.get<string>('CIRCLE_USDC_TOKEN_ID')?.trim() || undefined;
  }

  get settlementProvider(): 'INTERNAL' | 'CIRCLE' {
    const value = (this.config.get<string>('SETTLEMENT_PROVIDER') ?? 'INTERNAL')
      .trim()
      .toUpperCase();
    return value === 'CIRCLE' ? 'CIRCLE' : 'INTERNAL';
  }

  get webhookSecret(): string | undefined {
    return this.config.get<string>('CIRCLE_WEBHOOK_SECRET')?.trim() || undefined;
  }

  statusView(): CircleStatusView {
    const resolved = resolveCircleConfig({
      mode: this.config.get<string>('CIRCLE_MODE') ?? 'simulate',
      apiKey: this.config.get<string>('CIRCLE_API_KEY'),
      entitySecret: this.config.get<string>('CIRCLE_ENTITY_SECRET'),
      walletSetId: this.config.get<string>('CIRCLE_WALLET_SET_ID'),
      apiBaseUrl: this.config.get<string>('CIRCLE_API_BASE_URL'),
      defaultChain: this.config.get<string>('CIRCLE_CHAIN') ?? 'BASE_SEPOLIA',
    });

    const configured =
      resolved.mode === 'simulate' ||
      Boolean(resolved.apiKey && resolved.entitySecret && resolved.walletSetId);

    return {
      mode: this.mode,
      settlementProvider: this.settlementProvider,
      configured,
      chain:
        this.defaultChain === 'BASE'
          ? WalletChain.BASE
          : WalletChain.BASE_SEPOLIA,
      apiBaseUrl: resolved.apiBaseUrl || CIRCLE_SANDBOX_API_BASE,
    };
  }
}
