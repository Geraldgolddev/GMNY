import { BlockchainNotConfiguredError } from '../errors';
import type { ChainId } from '../types';
import {
  CIRCLE_PROD_API_BASE,
  CIRCLE_SANDBOX_API_BASE,
  type CircleClient,
  type CircleClientConfig,
  type CircleMode,
} from './client.port';
import { LiveCircleClient } from './live.client';
import { SimulatedCircleClient } from './simulated.client';

export type CreateCircleClientOptions = {
  mode?: CircleMode | string;
  apiKey?: string;
  entitySecret?: string;
  walletSetId?: string;
  usdcTokenId?: string;
  apiBaseUrl?: string;
  defaultChain?: ChainId | string;
  /** When true (default), missing live credentials fall back to simulate. */
  allowSimulateFallback?: boolean;
};

export function resolveCircleConfig(
  options: CreateCircleClientOptions = {},
): CircleClientConfig {
  const mode = normalizeMode(options.mode);
  const defaultChain = normalizeChain(options.defaultChain);
  const apiBaseUrl =
    options.apiBaseUrl?.trim() ||
    (mode === 'live' && options.apiKey?.includes('TEST_API') === false
      ? guessBaseUrl(options.apiKey)
      : CIRCLE_SANDBOX_API_BASE);

  return {
    mode,
    apiKey: options.apiKey?.trim() || undefined,
    entitySecret: options.entitySecret?.trim() || undefined,
    walletSetId: options.walletSetId?.trim() || undefined,
    usdcTokenId: options.usdcTokenId?.trim() || undefined,
    apiBaseUrl,
    defaultChain,
  };
}

export function createCircleClient(
  options: CreateCircleClientOptions = {},
): CircleClient {
  const config = resolveCircleConfig(options);
  if (config.mode === 'simulate') {
    return new SimulatedCircleClient();
  }

  const hasLiveCreds = Boolean(
    config.apiKey && config.entitySecret && config.walletSetId,
  );
  if (!hasLiveCreds) {
    if (options.allowSimulateFallback !== false) {
      return new SimulatedCircleClient();
    }
    throw new BlockchainNotConfiguredError('LiveCircleClient');
  }

  return new LiveCircleClient(config);
}

function normalizeMode(value?: string): CircleMode {
  if (!value) return 'simulate';
  const v = value.trim().toLowerCase();
  if (v === 'live' || v === 'sandbox' || v === 'production') return 'live';
  return 'simulate';
}

function normalizeChain(value?: string): ChainId {
  if (!value) return 'BASE_SEPOLIA';
  const v = value.trim().toUpperCase().replace(/-/g, '_');
  if (v === 'BASE') return 'BASE';
  return 'BASE_SEPOLIA';
}

function guessBaseUrl(apiKey?: string): string {
  if (!apiKey) return CIRCLE_SANDBOX_API_BASE;
  // Circle sandbox keys commonly include TEST_ prefix in docs examples.
  if (apiKey.includes('TEST') || apiKey.includes('sandbox')) {
    return CIRCLE_SANDBOX_API_BASE;
  }
  return CIRCLE_PROD_API_BASE;
}
