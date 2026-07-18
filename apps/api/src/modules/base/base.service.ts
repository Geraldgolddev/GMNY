import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  explorerAddressUrl,
  explorerTxUrl,
  getTransactionReceipt,
  getUsdcBalance,
  isEvmAddress,
  isTxHash,
} from '@gmny/blockchain';
import {
  WalletChain,
  type BaseNetworkView,
  type OnChainTxView,
  type UsdcBalanceView,
} from '@gmny/shared';
import {
  TransferStatus,
  WalletChain as DbWalletChain,
} from '@gmny/database';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { WalletsService } from '../circle/wallets.service';
import { BaseConfigService } from './base-config.service';

@Injectable()
export class BaseService {
  constructor(
    private readonly config: BaseConfigService,
    private readonly wallets: WalletsService,
    private readonly prisma: PrismaService,
  ) {}

  network(): BaseNetworkView {
    return this.config.networkView();
  }

  async balanceForUser(userId: string): Promise<UsdcBalanceView> {
    const wallet = await this.wallets.ensure(userId);
    return this.balanceForAddress(wallet.address);
  }

  async balanceForAddress(address: string): Promise<UsdcBalanceView> {
    if (!isEvmAddress(address)) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'address must be a valid EVM address',
      });
    }

    const chain = this.config.chain;
    const balance = await getUsdcBalance(
      this.config.rpc,
      address,
      chain,
      this.config.rpcUrl,
    );

    return {
      chain: chain === 'BASE' ? WalletChain.BASE : WalletChain.BASE_SEPOLIA,
      chainId: balance.chainId,
      address: balance.address,
      tokenAddress: balance.tokenAddress,
      decimals: balance.decimals,
      balance: balance.balance,
      balanceRaw: balance.balanceRaw,
      explorerUrl: explorerAddressUrl(chain, address),
    };
  }

  async getTx(txHash: string): Promise<OnChainTxView> {
    if (!isTxHash(txHash)) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'txHash must be a 32-byte hex hash',
      });
    }
    const chain = this.config.chain;
    const receipt = await getTransactionReceipt(this.config.rpc, txHash);
    return {
      txHash: receipt.txHash,
      chain: chain === 'BASE' ? WalletChain.BASE : WalletChain.BASE_SEPOLIA,
      status: receipt.status,
      blockNumber: receipt.blockNumber,
      explorerUrl: explorerTxUrl(chain, txHash),
    };
  }

  /**
   * Refresh on-chain confirmation for a user's transfer and persist status hints.
   */
  async syncTransfer(userId: string, transferId: string) {
    const transfer = await this.prisma.transfer.findFirst({
      where: { id: transferId, userId },
    });
    if (!transfer) {
      throw new NotFoundException({
        error: 'TRANSFER_NOT_FOUND',
        message: 'Transfer not found',
      });
    }
    if (!transfer.txHash) {
      throw new BadRequestException({
        error: 'NO_TX_HASH',
        message: 'Transfer has no on-chain transaction hash yet',
      });
    }

    const onChain = await this.getTx(transfer.txHash);
    const chain =
      transfer.chain ??
      (this.config.chain === 'BASE'
        ? DbWalletChain.BASE
        : DbWalletChain.BASE_SEPOLIA);

    if (onChain.status === 'success' && transfer.status === TransferStatus.PROCESSING) {
      await this.prisma.transfer.update({
        where: { id: transfer.id },
        data: {
          status: TransferStatus.COMPLETED,
          completedAt: new Date(),
          chain,
        },
      });
    }
    if (onChain.status === 'reverted') {
      await this.prisma.transfer.update({
        where: { id: transfer.id },
        data: {
          status: TransferStatus.FAILED,
          failureReason: 'Base transaction reverted',
          chain,
        },
      });
    }

    return onChain;
  }
}
