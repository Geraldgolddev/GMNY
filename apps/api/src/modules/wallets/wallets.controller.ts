import {
  Controller,
  DefaultValuePipe,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WalletsService } from './wallets.service';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('wallets')
@ApiBearerAuth()
@Controller('wallets')
export class WalletsController {
  constructor(private readonly walletsService: WalletsService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get my custodial wallet' })
  me(@CurrentUser('id') userId: string) {
    return this.walletsService.getMyWallet(userId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Provision a custodial USDC wallet on Base' })
  provision(@CurrentUser('id') userId: string) {
    return this.walletsService.provision(userId);
  }

  @Get(':id/transactions')
  @ApiOperation({ summary: 'List transactions for one of my wallets' })
  transactions(
    @CurrentUser('id') userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.walletsService.getWalletTransactions(userId, id, { page, pageSize });
  }
}
