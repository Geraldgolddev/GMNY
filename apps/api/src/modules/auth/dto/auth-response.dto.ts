import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@gmny/shared';

export class AuthUserDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
  @ApiProperty({ description: 'Whether the email address has been verified.' })
  emailVerified!: boolean;
}

export class AuthTokensDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ description: 'Access-token lifetime, e.g. "15m".' }) expiresIn!: string;
}

export class AuthResultDto {
  @ApiProperty({ type: AuthUserDto }) user!: AuthUserDto;
  @ApiProperty({ type: AuthTokensDto }) tokens!: AuthTokensDto;
  @ApiPropertyOptional({
    description: 'DEV ONLY: verification link, returned when NODE_ENV=development.',
  })
  devVerificationUrl?: string;
}

export class SessionDto {
  @ApiProperty() id!: string;
  @ApiProperty({ nullable: true }) ipAddress!: string | null;
  @ApiProperty({ nullable: true }) userAgent!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() expiresAt!: Date;
  @ApiProperty({ description: 'True if this is the session making the request.' })
  current!: boolean;
}

export class MessageDto {
  @ApiProperty() message!: string;
  @ApiPropertyOptional({ description: 'DEV ONLY: action link when NODE_ENV=development.' })
  devActionUrl?: string;
}
