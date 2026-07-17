import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '@nairaflow/shared';

export class ResetPasswordDto {
  @ApiProperty({ description: 'The opaque reset token from the emailed link.' })
  @IsString()
  @MinLength(16)
  token!: string;

  @ApiProperty({ example: 'N3w!Str0ngPass', minLength: MIN_PASSWORD_LENGTH })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(128)
  newPassword!: string;
}
