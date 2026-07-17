import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@gmny/shared';
import { ExchangeRatesService } from './exchange-rates.service';
import { CreateExchangeRateDto } from './dto/exchange-rate.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('exchange-rates')
@ApiBearerAuth()
@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly service: ExchangeRatesService) {}

  @Get('latest')
  @ApiOperation({ summary: 'Get the latest valid USD→NGN rate' })
  latest() {
    return this.service.getLatest();
  }

  @Get()
  @ApiOperation({ summary: 'Exchange-rate history' })
  history(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
  ) {
    return this.service.history({ page, pageSize });
  }

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Publish a new USD→NGN rate (admin only)' })
  create(@Body() dto: CreateExchangeRateDto, @CurrentUser('id') actorId: string) {
    return this.service.createManual(dto, actorId);
  }
}
