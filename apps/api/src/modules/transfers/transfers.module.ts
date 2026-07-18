import { Module } from '@nestjs/common';
import { RatesModule } from '../exchange-rates/rates.module';
import { CircleModule } from '../circle/circle.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CircleConfigService } from '../circle/circle-config.service';
import { CircleSettlementAdapter } from '../circle/circle.settlement';
import { InternalSettlementAdapter } from './internal.settlement';
import { SETTLEMENT_PORT } from './settlement.port';
import { TransfersController } from './transfers.controller';
import { TransfersService } from './transfers.service';

@Module({
  imports: [RatesModule, CircleModule, NotificationsModule],
  controllers: [TransfersController],
  providers: [
    TransfersService,
    InternalSettlementAdapter,
    {
      provide: SETTLEMENT_PORT,
      useFactory: (
        config: CircleConfigService,
        internal: InternalSettlementAdapter,
        circle: CircleSettlementAdapter,
      ) => (config.settlementProvider === 'CIRCLE' ? circle : internal),
      inject: [
        CircleConfigService,
        InternalSettlementAdapter,
        CircleSettlementAdapter,
      ],
    },
  ],
  exports: [TransfersService],
})
export class TransfersModule {}
