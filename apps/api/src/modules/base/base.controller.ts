import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Auth, CurrentUser, type AuthUser } from '../../common/auth.decorator';
import { BaseService } from './base.service';

@ApiTags('base')
@ApiBearerAuth()
@Auth()
@Controller('base')
export class BaseController {
  constructor(private readonly base: BaseService) {}

  @Get('network')
  @ApiOperation({ summary: 'Active Base network + USDC contract metadata' })
  network() {
    return this.base.network();
  }

  @Get('balance/me')
  @ApiOperation({ summary: 'USDC balance for the signed-in user wallet on Base' })
  balanceMine(@CurrentUser() user: AuthUser) {
    return this.base.balanceForUser(user.id);
  }

  @Get('tx/:txHash')
  @ApiOperation({ summary: 'Lookup a Base transaction receipt' })
  getTx(@Param('txHash') txHash: string) {
    return this.base.getTx(txHash);
  }

  @Post('transfers/:id/sync')
  @ApiOperation({
    summary: 'Sync transfer status from Base tx receipt (when txHash present)',
  })
  sync(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.base.syncTransfer(user.id, id);
  }
}
