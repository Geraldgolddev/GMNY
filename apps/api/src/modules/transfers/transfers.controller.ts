import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { CreateTransferInput } from '@gmny/shared';
import { Auth, CurrentUser, type AuthUser } from '../../common/auth.decorator';
import { TransfersService } from './transfers.service';

@ApiTags('transfers')
@ApiBearerAuth()
@Auth()
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfers: TransfersService) {}

  @Get()
  @ApiOperation({ summary: 'List transfers for the signed-in user' })
  list(@CurrentUser() user: AuthUser) {
    return this.transfers.list(user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a transfer by id' })
  get(
    @CurrentUser() user: AuthUser,
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
  ) {
    return this.transfers.get(user.id, id);
  }

  @Post()
  @ApiOperation({
    summary: 'Send USD to a Nigerian recipient (locks FX quote + settles)',
  })
  create(@CurrentUser() user: AuthUser, @Body() body: CreateTransferInput) {
    return this.transfers.create(user.id, body);
  }
}
