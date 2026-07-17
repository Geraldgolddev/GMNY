import { ConfigService } from '@nestjs/config';
import {
  ConflictError,
  TokenType,
  UnauthorizedError,
  UserRole,
  UserStatus,
} from '@gmny/shared';
import { hashPassword } from '@gmny/auth';
import { AuthService } from './auth.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';

const FAST_ARGON = { memoryCost: 8, timeCost: 1, parallelism: 1 };

const configValues: Record<string, unknown> = {
  'jwt.accessSecret': 'test-access-secret-1234567890',
  'jwt.refreshSecret': 'test-refresh-secret-1234567890',
  'jwt.accessTtl': '15m',
  'jwt.refreshTtl': '7d',
  argon2: FAST_ARGON,
  'app.nodeEnv': 'development',
  'app.webUrl': 'http://localhost:3000',
  'tokenTtl.emailVerificationHours': 24,
  'tokenTtl.passwordResetMinutes': 30,
};

function build() {
  const prisma = {
    user: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
    refreshToken: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    verificationToken: {
      create: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
  } as unknown as PrismaService;

  const config = { get: (k: string) => configValues[k] } as unknown as ConfigService;
  const audit = { record: jest.fn().mockResolvedValue(undefined) } as unknown as AuditService;
  const mail = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
  } as unknown as MailService;

  return { service: new AuthService(prisma, config, audit, mail), prisma, mail };
}

const ctx = { ipAddress: '127.0.0.1', userAgent: 'jest' };

describe('AuthService — registration & login', () => {
  it('registers a PENDING user, sends verification, and issues a session', async () => {
    const { service, prisma, mail } = build();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    (prisma.user.create as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'jane@gmny.io',
      firstName: 'Jane',
      lastName: 'Doe',
      passwordHash: 'x',
      role: UserRole.USER,
      status: UserStatus.PENDING,
      emailVerifiedAt: null,
    });

    const session = await service.register(
      { email: 'Jane@Nairaflow.io', password: 'Str0ng!Pass', firstName: 'Jane', lastName: 'Doe' },
      ctx,
    );

    expect(session.result.user.email).toBe('jane@gmny.io');
    expect(session.result.user.emailVerified).toBe(false);
    expect(session.refreshToken).toBeTruthy();
    expect(session.result.tokens.accessToken).toBeTruthy();
    // No refresh token leaks into the JSON body (cookie-only).
    expect((session.result.tokens as unknown as Record<string, unknown>).refreshToken).toBeUndefined();
    expect(mail.sendVerificationEmail).toHaveBeenCalledTimes(1);
    expect(session.result.devVerificationUrl).toContain('/verify-email?token=');
  });

  it('rejects registration when the email is taken', async () => {
    const { service, prisma } = build();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });
    await expect(
      service.register(
        { email: 'dupe@x.io', password: 'Str0ng!Pass', firstName: 'A', lastName: 'B' },
        ctx,
      ),
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it('authenticates a valid login', async () => {
    const { service, prisma } = build();
    const passwordHash = await hashPassword('Str0ng!Pass', FAST_ARGON);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'jane@gmny.io',
      firstName: 'Jane',
      lastName: 'Doe',
      passwordHash,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      emailVerifiedAt: new Date(),
    });
    (prisma.user.update as jest.Mock).mockResolvedValue({});

    const session = await service.login({ email: 'jane@gmny.io', password: 'Str0ng!Pass' }, ctx);
    expect(session.result.user.id).toBe('u1');
    expect(session.result.user.emailVerified).toBe(true);
  });

  it('rejects a wrong password', async () => {
    const { service, prisma } = build();
    const passwordHash = await hashPassword('Str0ng!Pass', FAST_ARGON);
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({
      id: 'u1',
      email: 'jane@gmny.io',
      passwordHash,
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
    });
    await expect(
      service.login({ email: 'jane@gmny.io', password: 'wrong-password' }, ctx),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects unknown users without leaking existence', async () => {
    const { service, prisma } = build();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    await expect(
      service.login({ email: 'ghost@x.io', password: 'whatever12345' }, ctx),
    ).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe('AuthService — email verification', () => {
  it('consumes a valid token and activates the account', async () => {
    const { service, prisma } = build();
    (prisma.verificationToken.findUnique as jest.Mock).mockResolvedValue({
      id: 't1',
      userId: 'u1',
      type: TokenType.EMAIL_VERIFICATION,
      consumedAt: null,
      expiresAt: new Date(Date.now() + 10_000),
    });
    (prisma.verificationToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.user.update as jest.Mock).mockResolvedValue({});

    await service.verifyEmail('raw-token-abc', ctx);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'u1' } }),
    );
  });

  it('rejects an expired token', async () => {
    const { service, prisma } = build();
    (prisma.verificationToken.findUnique as jest.Mock).mockResolvedValue({
      id: 't1',
      userId: 'u1',
      type: TokenType.EMAIL_VERIFICATION,
      consumedAt: null,
      expiresAt: new Date(Date.now() - 1),
    });
    await expect(service.verifyEmail('raw', ctx)).rejects.toBeInstanceOf(UnauthorizedError);
  });

  it('rejects a token of the wrong type', async () => {
    const { service, prisma } = build();
    (prisma.verificationToken.findUnique as jest.Mock).mockResolvedValue({
      id: 't1',
      userId: 'u1',
      type: TokenType.PASSWORD_RESET,
      consumedAt: null,
      expiresAt: new Date(Date.now() + 10_000),
    });
    await expect(service.verifyEmail('raw', ctx)).rejects.toBeInstanceOf(UnauthorizedError);
  });
});

describe('AuthService — password reset', () => {
  it('does not reveal whether an email exists', async () => {
    const { service, prisma, mail } = build();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
    const res = await service.forgotPassword('nobody@x.io', ctx);
    expect(res).toBeUndefined();
    expect(mail.sendPasswordResetEmail).not.toHaveBeenCalled();
  });

  it('issues a reset link when the user exists', async () => {
    const { service, prisma, mail } = build();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 'u1', email: 'jane@x.io' });
    const link = await service.forgotPassword('jane@x.io', ctx);
    expect(link).toContain('/reset-password?token=');
    expect(mail.sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  it('resets the password and revokes all sessions', async () => {
    const { service, prisma } = build();
    (prisma.verificationToken.findUnique as jest.Mock).mockResolvedValue({
      id: 't1',
      userId: 'u1',
      type: TokenType.PASSWORD_RESET,
      consumedAt: null,
      expiresAt: new Date(Date.now() + 10_000),
    });
    (prisma.verificationToken.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
    (prisma.user.update as jest.Mock).mockResolvedValue({});
    (prisma.refreshToken.updateMany as jest.Mock).mockResolvedValue({ count: 2 });

    await service.resetPassword('raw', 'N3w!Str0ngPass', ctx);
    expect(prisma.refreshToken.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'u1', revokedAt: null } }),
    );
  });
});
