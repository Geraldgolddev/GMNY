import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { QuoteDirection } from '@gmny/shared';
import { Auth } from '../../common/auth.decorator';
import { RatesService } from './rates.service';

@ApiTags('rates')
@Controller('rates')
export class RatesController {
  constructor(private readonly rates: RatesService) {}

  @Get()
  @ApiOperation({
    summary: 'Current USD/NGN rate',
    description:
      'Returns the cached mid-market rate. Refreshes automatically when stale (>15m) unless refresh=false.',
  })
  getRate(@Query('refresh') refresh?: string) {
    return this.rates.getCurrent({
      refreshIfStale: refresh !== 'false',
    });
  }

  @Auth()
  @ApiBearerAuth()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force refresh USD/NGN from the live FX provider' })
  refresh() {
    return this.rates.refresh(true);
  }

  @Auth()
  @ApiBearerAuth()
  @Post('quote')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Quote a USD↔NGN conversion using the live/cached rate' })
  quote(@Body() body: { direction: QuoteDirection; amount: number }) {
    return this.rates.quote(body.direction, Number(body.amount));
  }
}
