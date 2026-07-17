import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Currency, TransactionStatus, TransactionType } from '@gmny/shared';
import type { Transaction } from '@gmny/database';

export class TransactionDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional({ nullable: true }) transferId!: string | null;
  @ApiPropertyOptional({ nullable: true }) walletId!: string | null;
  @ApiProperty({ enum: TransactionType }) type!: TransactionType;
  @ApiProperty({ example: '100.00' }) amount!: string;
  @ApiProperty({ enum: Currency }) currency!: Currency;
  @ApiProperty({ enum: TransactionStatus }) status!: TransactionStatus;
  @ApiProperty() reference!: string;
  @ApiProperty() createdAt!: Date;

  static from(t: Transaction): TransactionDto {
    return {
      id: t.id,
      transferId: t.transferId,
      walletId: t.walletId,
      type: t.type as TransactionType,
      amount: t.amount.toString(),
      currency: t.currency as Currency,
      status: t.status as TransactionStatus,
      reference: t.reference,
      createdAt: t.createdAt,
    };
  }
}
