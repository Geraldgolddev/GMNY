import type { WalletChain } from './wallets';

export type BaseNetworkView = {
  chain: WalletChain;
  chainId: number;
  name: string;
  rpcUrl: string;
  rpcMode: 'live' | 'simulate';
  usdcAddress: string;
  usdcDecimals: number;
  explorerUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
};

export type UsdcBalanceView = {
  chain: WalletChain;
  chainId: number;
  address: string;
  tokenAddress: string;
  decimals: number;
  balance: string;
  balanceRaw: string;
  explorerUrl: string;
};

export type OnChainTxView = {
  txHash: string;
  chain: WalletChain;
  status: 'pending' | 'success' | 'reverted';
  blockNumber: number | null;
  explorerUrl: string;
};
