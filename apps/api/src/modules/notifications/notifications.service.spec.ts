import { NotFoundException } from '@nestjs/common';
import { NotificationType } from '@gmny/shared';
import { NotificationsService } from './notifications.service';

describe('NotificationsService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    notification: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      count: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const delivery = {
    deliver: jest.fn(),
  };

  const service = new NotificationsService(prisma as never, delivery as never);

  beforeEach(() => {
    jest.resetAllMocks();
    delete process.env.NOTIFICATIONS_EMAIL_ENABLED;
  });

  it('creates an in-app notification and marks it sent', async () => {
    const pending = {
      id: 'n1',
      type: 'TRANSFER_COMPLETED',
      channel: 'IN_APP',
      deliveryStatus: 'PENDING',
      title: 'Transfer completed',
      body: 'Your send finished',
      entityType: 'Transfer',
      entityId: 't1',
      metadata: { amountUsd: 100 },
      readAt: null,
      sentAt: null,
      createdAt: new Date('2026-07-01T00:00:00.000Z'),
    };
    prisma.notification.create.mockResolvedValue(pending);
    delivery.deliver.mockResolvedValue(undefined);
    prisma.notification.update.mockResolvedValue({
      ...pending,
      deliveryStatus: 'SENT',
      sentAt: new Date('2026-07-01T00:00:01.000Z'),
    });

    const result = await service.notify({
      userId: 'user-1',
      type: NotificationType.TRANSFER_COMPLETED,
      title: 'Transfer completed',
      body: 'Your send finished',
      entityType: 'Transfer',
      entityId: 't1',
      metadata: { amountUsd: 100 },
    });

    expect(result).toHaveLength(1);
    expect(result[0]?.deliveryStatus).toBe('SENT');
    expect(delivery.deliver).toHaveBeenCalledWith(
      expect.objectContaining({ channel: 'IN_APP', title: 'Transfer completed' }),
    );
  });

  it('lists notifications with unread count', async () => {
    prisma.notification.findMany.mockResolvedValue([
      {
        id: 'n1',
        type: 'WALLET_CREATED',
        channel: 'IN_APP',
        deliveryStatus: 'SENT',
        title: 'Wallet ready',
        body: 'Your USDC wallet is ready',
        entityType: 'Wallet',
        entityId: 'w1',
        metadata: null,
        readAt: null,
        sentAt: new Date(),
        createdAt: new Date(),
      },
    ]);
    prisma.notification.count.mockResolvedValue(1);

    const list = await service.list('user-1');
    expect(list.items).toHaveLength(1);
    expect(list.unreadCount).toBe(1);
  });

  it('marks a notification read', async () => {
    prisma.notification.findFirst.mockResolvedValue({
      id: 'n1',
      type: 'SYSTEM',
      channel: 'IN_APP',
      deliveryStatus: 'SENT',
      title: 'Hello',
      body: 'World',
      entityType: null,
      entityId: null,
      metadata: null,
      readAt: null,
      sentAt: new Date(),
      createdAt: new Date(),
    });
    prisma.notification.update.mockResolvedValue({
      id: 'n1',
      type: 'SYSTEM',
      channel: 'IN_APP',
      deliveryStatus: 'SENT',
      title: 'Hello',
      body: 'World',
      entityType: null,
      entityId: null,
      metadata: null,
      readAt: new Date('2026-07-01T00:00:00.000Z'),
      sentAt: new Date(),
      createdAt: new Date(),
    });

    const view = await service.markRead('user-1', 'n1');
    expect(view.readAt).toBeTruthy();
  });

  it('throws when marking missing notification', async () => {
    prisma.notification.findFirst.mockResolvedValue(null);
    await expect(service.markRead('user-1', 'n-missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('marks delivery failed when adapter throws', async () => {
    prisma.notification.create.mockResolvedValue({
      id: 'n2',
      type: 'TRANSFER_FAILED',
      channel: 'IN_APP',
      deliveryStatus: 'PENDING',
      title: 'Failed',
      body: 'Transfer failed',
      entityType: 'Transfer',
      entityId: 't2',
      metadata: null,
      readAt: null,
      sentAt: null,
      createdAt: new Date(),
    });
    delivery.deliver.mockRejectedValue(new Error('SMTP down'));
    prisma.notification.update.mockResolvedValue({
      id: 'n2',
      type: 'TRANSFER_FAILED',
      channel: 'IN_APP',
      deliveryStatus: 'FAILED',
      title: 'Failed',
      body: 'Transfer failed',
      entityType: 'Transfer',
      entityId: 't2',
      metadata: null,
      readAt: null,
      sentAt: null,
      failureReason: 'SMTP down',
      createdAt: new Date(),
    });

    const result = await service.notify({
      userId: 'user-1',
      type: NotificationType.TRANSFER_FAILED,
      title: 'Failed',
      body: 'Transfer failed',
    });
    expect(result[0]?.deliveryStatus).toBe('FAILED');
  });
});
