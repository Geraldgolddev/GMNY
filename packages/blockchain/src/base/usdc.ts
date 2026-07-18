import { BlockchainError } from '../errors';
import type { ChainId } from '../types';
import {
  isEvmAddress,
  resolveBaseNetwork,
  type BaseNetworkConfig,
} from './network';
import type { JsonRpcTransport } from './rpc.client';

export type UsdcBalance = {
  chain: ChainId;
  chainId: number;
  address: string;
  tokenAddress: string;
  decimals: number;
  /** Human-readable USDC amount (6 decimals). */
  balance: string;
  /** Raw uint256 as decimal string. */
  balanceRaw: string;
};

const BALANCE_OF_SELECTOR = '70a08231';

/**
 * Reads USDC ERC-20 balance via eth_call (no heavy web3 SDK required).
 */
export async function getUsdcBalance(
  rpc: JsonRpcTransport,
  address: string,
  chain: ChainId,
  rpcUrlOverride?: string,
): Promise<UsdcBalance> {
  if (!isEvmAddress(address)) {
    throw new BlockchainError('Invalid EVM address', 'INVALID_ADDRESS');
  }

  const network = resolveBaseNetwork(chain, rpcUrlOverride);
  const data = `0x${BALANCE_OF_SELECTOR}${padAddress(address)}`;
  const result = await rpc.request<string>({
    method: 'eth_call',
    params: [
      {
        to: network.usdcAddress,
        data,
      },
      'latest',
    ],
  });

  if (!result || result === '0x') {
    return toBalance(network, address, 0n);
  }

  const raw = BigInt(result);
  return toBalance(network, address, raw);
}

export type TxReceiptView = {
  txHash: string;
  status: 'pending' | 'success' | 'reverted';
  blockNumber: number | null;
  confirmationsHint: number | null;
};

export async function getTransactionReceipt(
  rpc: JsonRpcTransport,
  txHash: string,
): Promise<TxReceiptView> {
  const receipt = await rpc.request<{
    status?: string;
    blockNumber?: string;
  } | null>({
    method: 'eth_getTransactionReceipt',
    params: [txHash],
  });

  if (!receipt) {
    return {
      txHash,
      status: 'pending',
      blockNumber: null,
      confirmationsHint: null,
    };
  }

  const statusHex = receipt.status ?? '0x0';
  const blockNumber = receipt.blockNumber
    ? Number.parseInt(receipt.blockNumber, 16)
    : null;

  return {
    txHash,
    status: statusHex === '0x1' ? 'success' : 'reverted',
    blockNumber,
    confirmationsHint: blockNumber == null ? null : 1,
  };
}

export function formatUsdc(raw: bigint, decimals = 6): string {
  const negative = raw < 0n;
  const value = negative ? -raw : raw;
  const base = 10n ** BigInt(decimals);
  const whole = value / base;
  const frac = value % base;
  const fracStr = frac.toString().padStart(decimals, '0').replace(/0+$/, '');
  const formatted = fracStr.length ? `${whole}.${fracStr}` : whole.toString();
  return negative ? `-${formatted}` : formatted;
}

function padAddress(address: string): string {
  return address.slice(2).toLowerCase().padStart(64, '0');
}

function toBalance(
  network: BaseNetworkConfig,
  address: string,
  raw: bigint,
): UsdcBalance {
  return {
    chain: network.chain,
    chainId: network.chainId,
    address,
    tokenAddress: network.usdcAddress,
    decimals: network.usdcDecimals,
    balance: formatUsdc(raw, network.usdcDecimals),
    balanceRaw: raw.toString(),
  };
}
