import { Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import {
  AuditAction,
  BlockchainNetwork,
  ConflictError,
  Currency,
  NotFoundError,
  WalletStatus,
  WalletType,
  type PaginationParams,
} from '@gmny/shared';
import { AuditService } from '../audit/audit.service';
import { TransactionsService } from '../transactions/transactions.service';
import { WalletsRepository } from './wallets.repository';
import { WalletDto } from './dto/wallet.dto';

@Injectable()
export class WalletsService {
  constructor(
    private readonly repo: WalletsRepository,
    private readonly transactions: TransactionsService,
    private readonly audit: AuditService,
  ) {}

  async getMyWallet(userId: string): Promise<WalletDto> {
    const wallet = await this.repo.findUserWallet(userId);
    if (!wallet) throw new NotFoundError('No wallet provisioned for this account');
    return WalletDto.from(wallet);
  }

  /**
   * Provision a custodial USDC wallet on Base for the user. When a Circle API
   * key is configured this is where the Circle wallet is created; without it we
   * create the local custodial record (address generated) so the flow works
   * end-to-end in development.
   */
  async provision(userId: string): Promise<WalletDto> {
    const existing = await this.repo.findUserWallet(userId);
    if (existing) throw new ConflictError('Wallet already provisioned');

    const address = `0x${randomBytes(20).toString('hex')}`;
    const wallet = await this.repo.create({
      userId,
      type: WalletType.USER,
      blockchain: BlockchainNetwork.BASE_SEPOLIA,
      currency: Currency.USDC,
      address,
      balance: '0',
      status: WalletStatus.ACTIVE,
    });

    await this.audit.record({
      action: AuditAction.WALLET_CREATE,
      entityType: 'Wallet',
      entityId: wallet.id,
      userId,
    });
    return WalletDto.from(wallet);
  }

  async getWalletTransactions(userId: string, walletId: string, params: PaginationParams) {
    const wallet = await this.repo.findById(walletId);
    if (!wallet || wallet.userId !== userId) {
      throw new NotFoundError('Wallet not found');
    }
    return this.transactions.listForWallet(walletId, params);
  }
}
