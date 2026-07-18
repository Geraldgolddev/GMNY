import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service';

describe('AdminService', () => {
  const prisma = {
    user: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    transfer: {
      count: jest.fn(),
      aggregate: jest.fn(),
      findMany: jest.fn(),
    },
    wallet: { count: jest.fn() },
    notification: { count: jest.fn() },
    auditLog: { findMany: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  };

  const service = new AdminService(prisma as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('builds overview KPIs', async () => {
    prisma.user.count
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(1);
    prisma.transfer.count
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(15)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2);
    prisma.transfer.aggregate.mockResolvedValue({
      _sum: { sourceAmount: 1500, destAmount: 2_400_000 },
    });
    prisma.wallet.count.mockResolvedValue(7);
    prisma.notification.count.mockResolvedValue(4);

    const overview = await service.overview();
    expect(overview.users.total).toBe(10);
    expect(overview.transfers.volumeUsd).toBe(1500);
    expect(overview.notifications.unreadInApp).toBe(4);
  });

  it('lists users with transfer counts', async () => {
    prisma.user.count.mockResolvedValue(1);
    prisma.user.findMany.mockResolvedValue([
      {
        id: 'u1',
        email: 'ada@gmny.com',
        firstName: 'Ada',
        lastName: 'Okoro',
        role: 'USER',
        isActive: true,
        lastLoginAt: null,
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        _count: { transfers: 3 },
      },
    ]);

    const result = await service.listUsers({ page: 1 });
    expect(result.items[0]?.transferCount).toBe(3);
    expect(result.totalPages).toBe(1);
  });

  it('prevents self-deactivation', async () => {
    await expect(
      service.updateUser('admin-1', 'admin-1', { isActive: false }),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects missing isActive', async () => {
    await expect(service.updateUser('admin-1', 'u1', {})).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('deactivates a user and audits', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'ada@gmny.com',
    });
    prisma.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        user: {
          update: jest.fn().mockResolvedValue({
            id: 'u1',
            email: 'ada@gmny.com',
            firstName: 'Ada',
            lastName: 'Okoro',
            role: 'USER',
            isActive: false,
            lastLoginAt: null,
            createdAt: new Date(),
            _count: { transfers: 0 },
          }),
        },
        auditLog: { create: jest.fn() },
      };
      return fn(tx);
    });

    const view = await service.updateUser('admin-1', 'u1', { isActive: false });
    expect(view.isActive).toBe(false);
  });

  it('throws when user missing', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.updateUser('admin-1', 'missing', { isActive: true }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
