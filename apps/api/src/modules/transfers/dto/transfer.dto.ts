import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsUUID } from 'class-validator';
import { TransferStatus } from '@gmny/shared';
import type { Transfer } from '@gmny/database';

export class QuoteTransferDto {
  @ApiProperty({ example: '100.00', description: 'Amount to send in USD' })
  @IsNumberString()
  amountUSD!: string;
}

export class CreateTransferDto {
  @ApiProperty({ example: '100.00', description: 'Amount to send in USD' })
  @IsNumberString()
  amountUSD!: string;

  @ApiProperty({ description: 'Recipient id (must belong to the caller)' })
  @IsUUID()
  recipientId!: string;

  @ApiPropertyOptional({ description: 'Locked quote id from POST /transfers/quote' })
  @IsOptional()
  @IsUUID()
  quoteId?: string;
}

export class QuoteResponseDto {
  @ApiProperty() quoteId!: string;
  @ApiProperty({ example: '100.00' }) amountUSD!: string;
  @ApiProperty({ example: '1600.50' }) exchangeRate!: string;
  @ApiProperty({ example: '1.80' }) fee!: string;
  @ApiProperty({ example: '157169.10' }) amountNGN!: string;
  @ApiProperty() expiresAt!: Date;
}

export class TransferDto {
  @ApiProperty() id!: string;
  @ApiProperty() reference!: string;
  @ApiProperty({ example: '100.00' }) amountUSD!: string;
  @ApiProperty({ example: '1600.50' }) exchangeRate!: string;
  @ApiProperty({ example: '157169.10' }) amountNGN!: string;
  @ApiProperty({ example: '1.80' }) fee!: string;
  @ApiProperty({ enum: TransferStatus }) status!: TransferStatus;
  @ApiPropertyOptional({ nullable: true }) recipientId!: string | null;
  @ApiPropertyOptional({ nullable: true }) blockchainTxHash!: string | null;
  @ApiProperty() createdAt!: Date;

  static from(t: Transfer): TransferDto {
    return {
      id: t.id,
      reference: t.reference,
      amountUSD: t.amountUSD.toString(),
      exchangeRate: t.exchangeRate.toString(),
      amountNGN: t.amountNGN.toString(),
      fee: t.fee.toString(),
      status: t.status as TransferStatus,
      recipientId: t.recipientId,
      blockchainTxHash: t.blockchainTxHash,
      createdAt: t.createdAt,
    };
  }
}
