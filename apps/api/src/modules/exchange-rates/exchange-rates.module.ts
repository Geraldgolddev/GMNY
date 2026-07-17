import { Module } from '@nestjs/common';
import { ExchangeRatesController } from './exchange-rates.controller';
import { ExchangeRatesService } from './exchange-rates.service';
import {
  ExchangeRatesRepository,
  PrismaExchangeRatesRepository,
} from './exchange-rates.repository';
import { RATE_PROVIDER, StaticRateProvider } from './rate-provider';

@Module({
  controllers: [ExchangeRatesController],
  providers: [
    ExchangeRatesService,
    { provide: ExchangeRatesRepository, useClass: PrismaExchangeRatesRepository },
    { provide: RATE_PROVIDER, useClass: StaticRateProvider },
  ],
  exports: [ExchangeRatesService],
})
export class ExchangeRatesModule {}
