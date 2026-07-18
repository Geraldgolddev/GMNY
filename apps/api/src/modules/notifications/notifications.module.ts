import { Module } from '@nestjs/common';
import { ConsoleNotificationDelivery } from './console.delivery';
import { NOTIFICATION_DELIVERY_PORT } from './delivery.port';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';

@Module({
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    ConsoleNotificationDelivery,
    {
      provide: NOTIFICATION_DELIVERY_PORT,
      useExisting: ConsoleNotificationDelivery,
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
