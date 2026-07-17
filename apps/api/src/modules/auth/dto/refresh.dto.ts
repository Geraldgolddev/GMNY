import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsJWT, IsOptional } from 'class-validator';

export class RefreshDto {
  @ApiPropertyOptional({
    description:
      'A valid, non-revoked refresh token. Optional — normally supplied via the httpOnly refresh cookie.',
  })
  @IsOptional()
  @IsJWT()
  refreshToken?: string;
}
