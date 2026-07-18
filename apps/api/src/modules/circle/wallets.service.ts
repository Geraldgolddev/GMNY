import { Inject, Injectable } from '@nestjs/common';
import {
  AuditAction,
  WalletChain as DbWalletChain,
  WalletProvider as DbWalletProvider,
  WalletStatus as DbWalletStatus,
} from '@gmny/database';
import type { WalletPort } from '@gmny/blockchain';
import {
  NotificationType,
  WalletChain,
  WalletProvider,
  WalletStatus,
  type CircleStatusView,
  type WalletView,
} from '@gmny/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CIRCLE_WALLET_PORT } from './circle.tokens';
import { CircleConfigService } from './circle-config.service';

@Injectable()
export class WalletsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: CircleConfigService,
    @Inject(CIRCLE_WALLET_PORT) private readonly walletPort: WalletPort,
    private readonly notifications: NotificationsService,
  ) {}

  status(): CircleStatusView {
    return this.config.statusView();
  }

  async getOrNull(userId: string): Promise<WalletView | null> {
    const chain = this.config.defaultChain;
    const row = await this.prisma.wallet.findUnique({
      where: {
        userId_provider_chain: {
          userId,
          provider: DbWalletProvider.CIRCLE,
          chain: toDbChain(chain),
        },
      },
    });
    return row ? this.toView(row) : null;
  }

  async ensure(userId: string): Promise<WalletView> {
    const existing = await this.getOrNull(userId);
    if (existing) return existing;

    const chain = this.config.defaultChain;
    const created = await this.walletPort.createWallet({ userId, chain });

    const row = await this.prisma.wallet.create({
      data: {
        userId,
        provider: DbWalletProvider.CIRCLE,
        providerWalletId: created.providerWalletId,
        walletSetId: created.walletSetId ?? this.config.walletSetId ?? null,
        address: created.address,
        chain: toDbChain(created.chain),
        currency: 'USDC',
        status: DbWalletStatus.LIVE,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        actorId: userId,
        action: AuditAction.WALLET_CREATED,
        entityType: 'Wallet',
        entityId: row.id,
        metadata: {
          provider: 'CIRCLE',
          providerWalletId: row.providerWalletId,
          address: row.address,
          chain: row.chain,
          circleMode: this.config.mode,
        },
      },
    });

    try {
      await this.notifications.notify({
        userId,
        type: NotificationType.WALLET_CREATED,
        title: 'USDC wallet ready',
        body: `Your ${row.chain} wallet ${row.address.slice(0, 10)}… is ready.`,
        entityType: 'Wallet',
        entityId: row.id,
        metadata: { address: row.address, chain: row.chain },
        email: true,
      });
    } catch {
      // Wallet provisioning must succeed even if notify fails.
    }

    return this.toView(row);
  }

  private toView(row: {
    id: string;
    provider: DbWalletProvider;
    providerWalletId: string;
    walletSetId: string | null;
    address: string;
    chain: DbWalletChain;
    currency: string;
    status: DbWalletStatus;
    createdAt: Date;
  }): WalletView {
    return {
      id: row.id,
      provider: row.provider as WalletProvider,
      providerWalletId: row.providerWalletId,
      walletSetId: row.walletSetId,
      address: row.address,
      chain: row.chain as WalletChain,
      currency: 'USDC',
      status: row.status as WalletStatus,
      createdAt: row.createdAt.toISOString(),
    };
  }
}

function toDbChain(chain: 'BASE' | 'BASE_SEPOLIA'): DbWalletChain {
  return chain === 'BASE' ? DbWalletChain.BASE : DbWalletChain.BASE_SEPOLIA;
}
