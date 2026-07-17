import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BlockchainNetwork, Currency, WalletStatus } from '@gmny/shared';
import type { Wallet } from '@gmny/database';

export class WalletDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: BlockchainNetwork }) blockchain!: BlockchainNetwork;
  @ApiProperty({ enum: Currency }) currency!: Currency;
  @ApiPropertyOptional({ nullable: true }) address!: string | null;
  @ApiPropertyOptional({ nullable: true }) circleWalletId!: string | null;
  @ApiProperty({ example: '500.000000' }) balance!: string;
  @ApiProperty({ enum: WalletStatus }) status!: WalletStatus;
  @ApiProperty() createdAt!: Date;

  static from(w: Wallet): WalletDto {
    return {
      id: w.id,
      blockchain: w.blockchain as BlockchainNetwork,
      currency: w.currency as Currency,
      address: w.address,
      circleWalletId: w.circleWalletId,
      balance: w.balance.toString(),
      status: w.status as WalletStatus,
      createdAt: w.createdAt,
    };
  }
}
