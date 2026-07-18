export enum NotificationType {
  TRANSFER_CREATED = 'TRANSFER_CREATED',
  TRANSFER_COMPLETED = 'TRANSFER_COMPLETED',
  TRANSFER_FAILED = 'TRANSFER_FAILED',
  WALLET_CREATED = 'WALLET_CREATED',
  SYSTEM = 'SYSTEM',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
}

export enum NotificationDeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

export type NotificationView = {
  id: string;
  type: NotificationType;
  channel: NotificationChannel;
  deliveryStatus: NotificationDeliveryStatus;
  title: string;
  body: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  sentAt: string | null;
  createdAt: string;
};

export type NotificationListResult = {
  items: NotificationView[];
  unreadCount: number;
};

export type NotificationUnreadCount = {
  unreadCount: number;
};
