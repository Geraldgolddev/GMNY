import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { Currency } from '@gmny/shared';

export class CreateRecipientDto {
  @ApiProperty({ example: 'Chidi Okeke' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: 'Access Bank' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  bankName!: string;

  @ApiProperty({ example: '0123456789', description: '10-digit NUBAN account number' })
  @Matches(/^\d{10}$/, { message: 'accountNumber must be a 10-digit NUBAN' })
  accountNumber!: string;

  @ApiProperty({ example: '044', description: 'CBN bank code' })
  @Matches(/^\d{3,6}$/, { message: 'bankCode must be 3-6 digits' })
  bankCode!: string;

  @ApiPropertyOptional({ example: 'NG', default: 'NG' })
  @IsOptional()
  @IsString()
  @MaxLength(2)
  country?: string;

  @ApiPropertyOptional({ enum: Currency, default: Currency.NGN })
  @IsOptional()
  @IsEnum(Currency)
  currency?: Currency;
}

export class UpdateRecipientDto extends PartialType(CreateRecipientDto) {}

export class RecipientDto {
  @ApiProperty() id!: string;
  @ApiProperty() fullName!: string;
  @ApiProperty() bankName!: string;
  @ApiProperty() accountNumber!: string;
  @ApiProperty() bankCode!: string;
  @ApiProperty() country!: string;
  @ApiProperty({ enum: Currency }) currency!: Currency;
  @ApiProperty() createdAt!: Date;
}
