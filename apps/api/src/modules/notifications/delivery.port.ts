export type NotificationDeliveryMessage = {
  notificationId: string;
  userId: string;
  email?: string;
  channel: 'IN_APP' | 'EMAIL';
  type: string;
  title: string;
  body: string;
  metadata?: Record<string, unknown> | null;
};

export interface NotificationDeliveryPort {
  deliver(message: NotificationDeliveryMessage): Promise<void>;
}

export const NOTIFICATION_DELIVERY_PORT = Symbol('NOTIFICATION_DELIVERY_PORT');
