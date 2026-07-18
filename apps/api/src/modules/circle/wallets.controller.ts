import { Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth, CurrentUser, type AuthUser } from '../../common/auth.decorator';
import { WalletsService } from './wallets.service';

@ApiTags('wallets')
@ApiBearerAuth()
@Auth()
@Controller('wallets')
export class WalletsController {
  constructor(private readonly wallets: WalletsService) {}

  @Get('status')
  @ApiOperation({ summary: 'Circle sandbox/live configuration status' })
  status() {
    return this.wallets.status();
  }

  @Get('me')
  @ApiOperation({ summary: 'Get the signed-in user Circle USDC wallet if any' })
  getMine(@CurrentUser() user: AuthUser) {
    return this.wallets.getOrNull(user.id);
  }

  @Post('me')
  @ApiOperation({
    summary: 'Provision a Circle USDC wallet for the signed-in user',
  })
  ensureMine(@CurrentUser() user: AuthUser) {
    return this.wallets.ensure(user.id);
  }
}
