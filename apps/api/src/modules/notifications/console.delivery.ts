import { Injectable, Logger } from '@nestjs/common';
import type {
  NotificationDeliveryMessage,
  NotificationDeliveryPort,
} from './delivery.port';

/**
 * Default delivery adapter — records outbound notifications in logs.
 * Swap for SES/Postmark later without changing NotificationsService.
 */
@Injectable()
export class ConsoleNotificationDelivery implements NotificationDeliveryPort {
  private readonly logger = new Logger(ConsoleNotificationDelivery.name);

  async deliver(message: NotificationDeliveryMessage): Promise<void> {
    this.logger.log(
      `[${message.channel}] ${message.type} → user=${message.userId}` +
        (message.email ? ` email=${message.email}` : '') +
        ` | ${message.title}`,
    );
  }
}
