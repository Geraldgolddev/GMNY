export enum WalletProvider {
  CIRCLE = 'CIRCLE',
}

export enum WalletChain {
  BASE = 'BASE',
  BASE_SEPOLIA = 'BASE_SEPOLIA',
}

export enum WalletStatus {
  CREATING = 'CREATING',
  LIVE = 'LIVE',
  FAILED = 'FAILED',
}

export type WalletView = {
  id: string;
  provider: WalletProvider;
  providerWalletId: string;
  walletSetId: string | null;
  address: string;
  chain: WalletChain;
  currency: 'USDC';
  status: WalletStatus;
  createdAt: string;
};

export type CircleStatusView = {
  mode: 'simulate' | 'live';
  settlementProvider: 'INTERNAL' | 'CIRCLE';
  configured: boolean;
  chain: WalletChain;
  apiBaseUrl: string;
};
