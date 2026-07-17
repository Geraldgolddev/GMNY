import { ApiProperty } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateExchangeRateDto {
  @ApiProperty({ example: '1600.50', description: 'NGN per 1 USD' })
  @IsNumberString()
  ngn!: string;

  @ApiProperty({ example: 'manual', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  source?: string;
}

export class ExchangeRateDto {
  @ApiProperty() id!: string;
  @ApiProperty({ example: '1' }) usd!: string;
  @ApiProperty({ example: '1600.50' }) ngn!: string;
  @ApiProperty({ example: '1600.50', description: 'Effective NGN per USD' }) rate!: string;
  @ApiProperty() source!: string;
  @ApiProperty() timestamp!: Date;
  @ApiProperty() validUntil!: Date;
}
