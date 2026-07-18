import type { ChainId } from '../types';

export type BaseNetworkConfig = {
  chain: ChainId;
  chainId: number;
  name: string;
  rpcUrl: string;
  usdcAddress: `0x${string}`;
  usdcDecimals: number;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
};

/** Canonical Base + Base Sepolia parameters (USDC Circle native). */
export const BASE_NETWORKS: Record<ChainId, Omit<BaseNetworkConfig, 'rpcUrl'>> =
  {
    BASE: {
      chain: 'BASE',
      chainId: 8453,
      name: 'Base',
      usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      usdcDecimals: 6,
      explorerUrl: 'https://basescan.org',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    },
    BASE_SEPOLIA: {
      chain: 'BASE_SEPOLIA',
      chainId: 84532,
      name: 'Base Sepolia',
      usdcAddress: '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
      usdcDecimals: 6,
      explorerUrl: 'https://sepolia.basescan.org',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    },
  };

export const DEFAULT_BASE_RPC: Record<ChainId, string> = {
  BASE: 'https://mainnet.base.org',
  BASE_SEPOLIA: 'https://sepolia.base.org',
};

export function resolveBaseNetwork(
  chain: ChainId,
  rpcUrl?: string,
): BaseNetworkConfig {
  const base = BASE_NETWORKS[chain];
  return {
    ...base,
    rpcUrl: rpcUrl?.trim() || DEFAULT_BASE_RPC[chain],
  };
}

export function explorerTxUrl(chain: ChainId, txHash: string): string {
  const { explorerUrl } = BASE_NETWORKS[chain];
  return `${explorerUrl}/tx/${txHash}`;
}

export function explorerAddressUrl(chain: ChainId, address: string): string {
  const { explorerUrl } = BASE_NETWORKS[chain];
  return `${explorerUrl}/address/${address}`;
}

export function isEvmAddress(value: string): value is `0x${string}` {
  return /^0x[a-fA-F0-9]{40}$/.test(value);
}

export function isTxHash(value: string): boolean {
  return /^0x[a-fA-F0-9]{64}$/.test(value);
}
