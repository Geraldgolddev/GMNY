import { Module } from '@nestjs/common';
import { FX_RATE_PROVIDER } from './fx-rate.provider';
import { OpenErApiProvider } from './open-er-api.provider';
import { RatesController } from './rates.controller';
import { RatesService } from './rates.service';

@Module({
  controllers: [RatesController],
  providers: [
    RatesService,
    OpenErApiProvider,
    { provide: FX_RATE_PROVIDER, useExisting: OpenErApiProvider },
  ],
  exports: [RatesService],
})
export class RatesModule {}
