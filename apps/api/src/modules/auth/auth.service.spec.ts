import { ConfigService } from '@nestjs/config';
import { ConflictError, UnauthorizedError, UserRole, UserStatus } from '@nairaflow/shared';
import { hashPassword } from '@nairaflow/auth';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';

const configValues: Record<string, unknown> = {
  'jwt.accessSecret': 'test-access-secret-1234567890',
  'jwt.refreshSecret': 'test-refresh-secret-1234567890',
  'jwt.accessTtl': '15m',
  'jwt.refreshTtl': '7d',
  'jwt.bcryptSaltRounds': 4,
};

function buildService() {
  const prisma = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    refreshToken: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  } as unknown as PrismaService;

  const config = { get: (key: string) => configValues[key] } as unknown as ConfigService;
  const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;

  return { service: new AuthService(prisma, config, audit), prisma, audit };
}

describe('AuthService', () => {
  const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

  it('registers a new user and issues tokens', async () => {
    const { service, prisma } = buildService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'jane@nairaflow.io',
      firstName: 'Jane',
      lastName: 'Doe',
      passwordHash: 'x',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    });

    const result = await service.register(
      { email: 'Jane@Nairaflow.io', password: 'Str0ng!Pass', firstName: 'Jane', lastName: 'Doe' },
      ctx,
    );

    expect(result.user.email).toBe('jane@nairaflow.io');
    expect(result.tokens.accessToken).toBeTruthy();
    expect(result.tokens.refreshToken).toBeTruthy();
    // Email is normalized to lowercase before persistence.
    expect((prisma.user.create as jest.Mock).mock.calls[0][0].data.email).toBe('jane@nairaflow.io');
  });

  it('rejects registration when the email is taken', async () => {
    const { service, prisma } = buildService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });
    await expect(
      service.register(
        { email: 'dupe@x.io', password: 'Str0ng!Pass', firstName: 'A', lastName: 'B' },
        ctx,
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('authenticates a valid login', async () => {
    const { service, prisma } = buildService();
    const passwordHash = await hashPassword('Str0ng!Pass', 4);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'jane@nairaflow.io',
      firstName: 'Jane',
      lastName: 'Doe',
      passwordHash,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    });
    (prisma.user.update as jest.Mock).mockResolvedValue({});

    const result = await service.login(
      { email: 'jane@nairaflow.io', password: 'Str0ng!Pass' },
      ctx,
    );
    expect(result.user.id).toBe('u1');
    expect(result.tokens.accessToken).toBeTruthy();
  });

  it('rejects login with a wrong password', async () => {
    const { service, prisma } = buildService();
    const passwordHash = await hashPassword('Str0ng!Pass', 4);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'jane@nairaflow.io',
      passwordHash,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    });
    await expect(
      service.login({ email: 'jane@nairaflow.io', password: 'wrong-password' }, ctx),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects login for unknown users without leaking existence', async () => {
    const { service, prisma } = buildService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      service.login({ email: 'ghost@x.io', password: 'whatever12345' }, ctx),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});
