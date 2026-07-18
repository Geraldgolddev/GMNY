import { UnauthorizedException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  const prisma = {
    user: { findUnique: jest.fn() },
    auditLog: { findMany: jest.fn() },
  };

  const service = new DashboardService(prisma as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('returns overview for an active user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'ada@gmny.com',
      firstName: 'Ada',
      lastName: 'Okoro',
      role: 'USER',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      lastLoginAt: new Date('2026-07-18T10:00:00.000Z'),
    });
    prisma.auditLog.findMany.mockResolvedValue([
      {
        id: 'a1',
        action: 'USER_LOGIN',
        createdAt: new Date('2026-07-18T10:00:00.000Z'),
        ipAddress: '127.0.0.1',
      },
    ]);

    const overview = await service.getOverview('u1');

    expect(overview.user.email).toBe('ada@gmny.com');
    expect(overview.user.lastLoginAt).toBe('2026-07-18T10:00:00.000Z');
    expect(overview.security.recentEvents).toHaveLength(1);
    expect(overview.security.recentEvents[0].action).toBe('USER_LOGIN');
  });

  it('rejects inactive users', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'ada@gmny.com',
      firstName: 'Ada',
      lastName: 'Okoro',
      role: 'USER',
      isActive: false,
      createdAt: new Date(),
      lastLoginAt: null,
    });

    await expect(service.getOverview('u1')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
