import { Module } from '@nestjs/common';
import {
  CircleUsdcTransferAdapter,
  CircleWalletAdapter,
} from '@gmny/blockchain';
import { NotificationsModule } from '../notifications/notifications.module';
import { CircleConfigService } from './circle-config.service';
import { CircleSettlementAdapter } from './circle.settlement';
import { CIRCLE_TRANSFER_PORT, CIRCLE_WALLET_PORT } from './circle.tokens';
import { CircleWebhookController } from './circle-webhook.controller';
import { CircleWebhookService } from './circle-webhook.service';
import { WalletsController } from './wallets.controller';
import { WalletsService } from './wallets.service';

@Module({
  imports: [NotificationsModule],
  controllers: [WalletsController, CircleWebhookController],
  providers: [
    CircleConfigService,
    {
      provide: CIRCLE_WALLET_PORT,
      useFactory: (config: CircleConfigService) =>
        new CircleWalletAdapter(config.client),
      inject: [CircleConfigService],
    },
    {
      provide: CIRCLE_TRANSFER_PORT,
      useFactory: (config: CircleConfigService) =>
        new CircleUsdcTransferAdapter(config.client),
      inject: [CircleConfigService],
    },
    WalletsService,
    CircleSettlementAdapter,
    CircleWebhookService,
  ],
  exports: [
    CircleConfigService,
    WalletsService,
    CircleSettlementAdapter,
    CIRCLE_TRANSFER_PORT,
    CIRCLE_WALLET_PORT,
  ],
})
export class CircleModule {}
