import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  NotificationChannel as DbChannel,
  NotificationDeliveryStatus as DbDelivery,
  NotificationType as DbType,
  Prisma,
} from '@gmny/database';
import {
  NotificationChannel,
  NotificationDeliveryStatus,
  NotificationType,
  type NotificationListResult,
  type NotificationUnreadCount,
  type NotificationView,
} from '@gmny/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import {
  NOTIFICATION_DELIVERY_PORT,
  type NotificationDeliveryPort,
} from './delivery.port';

export type NotifyInput = {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  /** Also enqueue an EMAIL channel copy when email delivery is enabled. */
  email?: boolean;
};

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(NOTIFICATION_DELIVERY_PORT)
    private readonly delivery: NotificationDeliveryPort,
  ) {}

  async notify(input: NotifyInput): Promise<NotificationView[]> {
    const created: NotificationView[] = [];

    const inApp = await this.createAndDeliver({
      ...input,
      channel: NotificationChannel.IN_APP,
    });
    created.push(inApp);

    if (input.email && this.emailEnabled()) {
      const emailNote = await this.createAndDeliver({
        ...input,
        channel: NotificationChannel.EMAIL,
      });
      created.push(emailNote);
    }

    return created;
  }

  async list(
    userId: string,
    opts: { unreadOnly?: boolean; take?: number } = {},
  ): Promise<NotificationListResult> {
    const take = Math.min(Math.max(opts.take ?? 50, 1), 100);
    const where: Prisma.NotificationWhereInput = {
      userId,
      channel: DbChannel.IN_APP,
      ...(opts.unreadOnly ? { readAt: null } : {}),
    };

    const [rows, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
      }),
      this.prisma.notification.count({
        where: { userId, channel: DbChannel.IN_APP, readAt: null },
      }),
    ]);

    return {
      items: rows.map((row) => this.toView(row)),
      unreadCount,
    };
  }

  async unreadCount(userId: string): Promise<NotificationUnreadCount> {
    const unreadCount = await this.prisma.notification.count({
      where: { userId, channel: DbChannel.IN_APP, readAt: null },
    });
    return { unreadCount };
  }

  async markRead(userId: string, id: string): Promise<NotificationView> {
    const existing = await this.prisma.notification.findFirst({
      where: { id, userId, channel: DbChannel.IN_APP },
    });
    if (!existing) {
      throw new NotFoundException({
        error: 'NOTIFICATION_NOT_FOUND',
        message: 'Notification not found',
      });
    }
    if (existing.readAt) {
      return this.toView(existing);
    }
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return this.toView(updated);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, channel: DbChannel.IN_APP, readAt: null },
      data: { readAt: new Date() },
    });
    return { updated: result.count };
  }

  private emailEnabled(): boolean {
    const value = (process.env.NOTIFICATIONS_EMAIL_ENABLED ?? 'false')
      .trim()
      .toLowerCase();
    return value === 'true' || value === '1' || value === 'yes';
  }

  private async createAndDeliver(input: NotifyInput & {
    channel: NotificationChannel;
  }): Promise<NotificationView> {
    const user =
      input.channel === NotificationChannel.EMAIL
        ? await this.prisma.user.findUnique({
            where: { id: input.userId },
            select: { email: true },
          })
        : null;

    const row = await this.prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type as DbType,
        channel: input.channel as DbChannel,
        deliveryStatus: DbDelivery.PENDING,
        title: input.title.slice(0, 200),
        body: input.body.slice(0, 1000),
        entityType: input.entityType ?? null,
        entityId: input.entityId ?? null,
        metadata: (input.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
      },
    });

    try {
      await this.delivery.deliver({
        notificationId: row.id,
        userId: input.userId,
        email: user?.email,
        channel: input.channel,
        type: input.type,
        title: row.title,
        body: row.body,
        metadata: input.metadata ?? null,
      });

      const sent = await this.prisma.notification.update({
        where: { id: row.id },
        data: {
          deliveryStatus: DbDelivery.SENT,
          sentAt: new Date(),
        },
      });
      return this.toView(sent);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Notification delivery failed';
      const failed = await this.prisma.notification.update({
        where: { id: row.id },
        data: {
          deliveryStatus: DbDelivery.FAILED,
          failureReason: message.slice(0, 1000),
        },
      });
      return this.toView(failed);
    }
  }

  private toView(row: {
    id: string;
    type: DbType;
    channel: DbChannel;
    deliveryStatus: DbDelivery;
    title: string;
    body: string;
    entityType: string | null;
    entityId: string | null;
    metadata: Prisma.JsonValue | null;
    readAt: Date | null;
    sentAt: Date | null;
    createdAt: Date;
  }): NotificationView {
    return {
      id: row.id,
      type: row.type as NotificationType,
      channel: row.channel as NotificationChannel,
      deliveryStatus: row.deliveryStatus as NotificationDeliveryStatus,
      title: row.title,
      body: row.body,
      entityType: row.entityType,
      entityId: row.entityId,
      metadata:
        row.metadata && typeof row.metadata === 'object' && !Array.isArray(row.metadata)
          ? (row.metadata as Record<string, unknown>)
          : null,
      readAt: row.readAt?.toISOString() ?? null,
      sentAt: row.sentAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
