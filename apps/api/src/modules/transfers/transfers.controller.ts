import {
  Body,
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
import { TransfersService } from './transfers.service';
import { CreateTransferDto, QuoteTransferDto } from './dto/transfer.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('transfers')
@ApiBearerAuth()
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get a locked USD→NGN quote for a transfer' })
  quote(@CurrentUser('id') userId: string, @Body() dto: QuoteTransferDto) {
    return this.transfersService.quote(userId, dto);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a transfer (USD → USDC → NGN)' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateTransferDto) {
    return this.transfersService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List my transfers' })
  list(
    @CurrentUser('id') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.transfersService.list(userId, { page, pageSize });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one of my transfers' })
  getOne(@CurrentUser('id') userId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.transfersService.getById(userId, id);
  }
}
