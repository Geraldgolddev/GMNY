import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  const config = {
    get: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_TTL') return '15m';
      if (key === 'JWT_REFRESH_TTL') return '7d';
      return undefined;
    }),
    getOrThrow: jest.fn((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'test-access-secret-min-32-characters!!';
      throw new Error(`missing ${key}`);
    }),
  };

  const service = new AuthService(prisma as never, config as never);

  beforeEach(() => {
    jest.resetAllMocks();
    config.get.mockImplementation((key: string) => {
      if (key === 'JWT_ACCESS_TTL') return '15m';
      if (key === 'JWT_REFRESH_TTL') return '7d';
      return undefined;
    });
    config.getOrThrow.mockImplementation((key: string) => {
      if (key === 'JWT_ACCESS_SECRET') return 'test-access-secret-min-32-characters!!';
      throw new Error(`missing ${key}`);
    });
  });

  it('registers a user and returns tokens', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: '11111111-1111-1111-1111-111111111111',
      email: 'ada@gmny.com',
      firstName: 'Ada',
      lastName: 'Okoro',
      role: 'USER',
      isActive: true,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    prisma.refreshToken.create.mockResolvedValue({});
    prisma.auditLog.create.mockResolvedValue({});

    const result = await service.register({
      email: 'ada@gmny.com',
      password: 'SecurePass1!xyz',
      firstName: 'Ada',
      lastName: 'Okoro',
    });

    expect(result.user.email).toBe('ada@gmny.com');
    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();
  });

  it('rejects duplicate email', async () => {
    prisma.user.findUnique.mockResolvedValue({ id: 'x' });
    await expect(
      service.register({
        email: 'ada@gmny.com',
        password: 'SecurePass1!xyz',
        firstName: 'Ada',
        lastName: 'Okoro',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects invalid login', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(
      service.login({ email: 'ada@gmny.com', password: 'SecurePass1!xyz' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
