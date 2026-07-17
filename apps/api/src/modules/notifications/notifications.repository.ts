import { Injectable } from '@nestjs/common';
import { Prisma, type Notification } from '@gmny/database';
import { PrismaService } from '../../prisma/prisma.service';

export abstract class NotificationsRepository {
  abstract create(data: Prisma.NotificationUncheckedCreateInput): Promise<Notification>;
  abstract listForUser(userId: string, skip: number, take: number): Promise<[Notification[], number]>;
  abstract markRead(id: string, userId: string): Promise<number>;
  abstract markAllRead(userId: string): Promise<number>;
}

@Injectable()
export class PrismaNotificationsRepository extends NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  create(data: Prisma.NotificationUncheckedCreateInput): Promise<Notification> {
    return this.prisma.notification.create({ data });
  }

  listForUser(userId: string, skip: number, take: number): Promise<[Notification[], number]> {
    return Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]) as Promise<[Notification[], number]>;
  }

  async markRead(id: string, userId: string): Promise<number> {
    const res = await this.prisma.notification.updateMany({
      where: { id, userId, read: false },
      data: { read: true },
    });
    return res.count;
  }

  async markAllRead(userId: string): Promise<number> {
    const res = await this.prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    return res.count;
  }
}
