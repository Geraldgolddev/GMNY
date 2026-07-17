import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { MIN_PASSWORD_LENGTH } from '@nairaflow/shared';

export class RegisterDto {
  @ApiProperty({ example: 'jane@nairaflow.io' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Str0ng!Pass', minLength: MIN_PASSWORD_LENGTH })
  @IsString()
  @MinLength(MIN_PASSWORD_LENGTH)
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'Jane' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  lastName!: string;

  @ApiProperty({ example: '+15551234567', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;
}
