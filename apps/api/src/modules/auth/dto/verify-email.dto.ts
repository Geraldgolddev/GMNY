import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class VerifyEmailDto {
  @ApiProperty({ description: 'The opaque verification token from the emailed link.' })
  @IsString()
  @MinLength(16)
  token!: string;
}
