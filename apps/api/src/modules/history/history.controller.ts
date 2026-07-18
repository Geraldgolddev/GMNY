import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  LedgerTransactionStatus,
  LedgerTransactionType,
  TransferStatus,
} from '@gmny/shared';
import { Auth, CurrentUser, type AuthUser } from '../../common/auth.decorator';
import { HistoryService } from './history.service';

@ApiTags('history')
@ApiBearerAuth()
@Auth()
@Controller('history')
export class HistoryController {
  constructor(private readonly history: HistoryService) {}

  @Get('summary')
  @ApiOperation({ summary: 'Aggregate send totals for the signed-in user' })
  summary(@CurrentUser() user: AuthUser) {
    return this.history.summary(user.id);
  }

  @Get('ledger')
  @ApiOperation({ summary: 'Paginated ledger entries (fee / transfer / FX lines)' })
  listLedger(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('type') type?: LedgerTransactionType,
    @Query('status') status?: LedgerTransactionStatus,
    @Query('transferId') transferId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.history.listLedger(user.id, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      type,
      status,
      transferId,
      from,
      to,
    });
  }

  @Get()
  @ApiOperation({ summary: 'Paginated transfer history for the signed-in user' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: TransferStatus,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.history.listTransfers(user.id, {
      page: page ? Number(page) : undefined,
      pageSize: pageSize ? Number(pageSize) : undefined,
      status,
      from,
      to,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Transfer detail with ledger breakdown' })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.history.getTransferDetail(user.id, id);
  }
}
