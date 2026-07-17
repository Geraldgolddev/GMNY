import { ApiProperty } from '@nestjs/swagger';
import { UserRole, UserStatus } from '@nairaflow/shared';

export class AuthUserDto {
  @ApiProperty() id!: string;
  @ApiProperty() email!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty({ enum: UserRole }) role!: UserRole;
  @ApiProperty({ enum: UserStatus }) status!: UserStatus;
}

export class AuthTokensDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty({ description: 'Access-token lifetime, e.g. "15m".' }) expiresIn!: string;
}

export class AuthResultDto {
  @ApiProperty({ type: AuthUserDto }) user!: AuthUserDto;
  @ApiProperty({ type: AuthTokensDto }) tokens!: AuthTokensDto;
}
