import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  generateRefreshToken,
  hashPassword,
  hashToken,
  signAccessToken,
  ttlToDate,
  verifyPassword,
} from '@gmny/auth';
import { AuditAction, Role } from '@gmny/database';
import type { AuthResponse, PublicUser } from '@gmny/shared';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';

type RequestMeta = { userAgent?: string; ipAddress?: string };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async register(
    input: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    },
    meta: RequestMeta = {},
  ): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();
    this.assertPassword(input.password);
    if (!email.includes('@') || !input.firstName?.trim() || !input.lastName?.trim()) {
      throw new BadRequestException({
        error: 'VALIDATION_ERROR',
        message: 'Email, first name, and last name are required',
      });
    }

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictException({
        error: 'EMAIL_IN_USE',
        message: 'An account with this email already exists',
      });
    }

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await hashPassword(input.password),
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        role: Role.USER,
      },
    });

    const tokens = await this.issueTokens(user, meta);
    await this.audit(AuditAction.USER_REGISTERED, user.id, meta);

    return { user: this.toPublicUser(user), tokens };
  }

  async login(
    input: { email: string; password: string },
    meta: RequestMeta = {},
  ): Promise<AuthResponse> {
    const email = input.email.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    const valid = await verifyPassword(user.passwordHash, input.password);
    if (!valid) {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      });
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const tokens = await this.issueTokens(user, meta);
    await this.audit(AuditAction.USER_LOGIN, user.id, meta);

    return { user: this.toPublicUser(user), tokens };
  }

  async refresh(refreshToken: string, meta: RequestMeta = {}) {
    const tokenHash = hashToken(refreshToken);
    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !existing ||
      existing.revokedAt ||
      existing.expiresAt.getTime() <= Date.now() ||
      !existing.user.isActive
    ) {
      throw new UnauthorizedException({
        error: 'INVALID_REFRESH_TOKEN',
        message: 'Refresh token is invalid or expired',
      });
    }

    await this.prisma.refreshToken.update({
      where: { id: existing.id },
      data: { revokedAt: new Date() },
    });

    const tokens = await this.issueTokens(existing.user, meta);
    await this.audit(AuditAction.TOKEN_REFRESHED, existing.user.id, meta);
    return tokens;
  }

  async logout(userId: string, refreshToken: string | undefined, meta: RequestMeta = {}) {
    if (refreshToken) {
      await this.prisma.refreshToken.updateMany({
        where: { tokenHash: hashToken(refreshToken), revokedAt: null },
        data: { revokedAt: new Date() },
      });
    } else {
      await this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
    }
    await this.audit(AuditAction.USER_LOGOUT, userId, meta);
    return { success: true as const };
  }

  async me(userId: string): Promise<PublicUser> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.isActive) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'User not found or inactive',
      });
    }
    return this.toPublicUser(user);
  }

  private async issueTokens(
    user: { id: string; email: string; role: Role },
    meta: RequestMeta,
  ) {
    const accessTtl = this.config.get<string>('JWT_ACCESS_TTL') ?? '15m';
    const refreshTtl = this.config.get<string>('JWT_REFRESH_TTL') ?? '7d';
    const accessToken = signAccessToken(
      { sub: user.id, email: user.email, role: user.role },
      this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      accessTtl,
    );

    const refreshToken = generateRefreshToken();
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: ttlToDate(refreshTtl),
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
      },
    });

    return {
      accessToken,
      refreshToken,
      expiresIn: accessTtl,
      tokenType: 'Bearer' as const,
    };
  }

  private toPublicUser(user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: Role;
    isActive: boolean;
    createdAt: Date;
  }): PublicUser {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role as PublicUser['role'],
      isActive: user.isActive,
      createdAt: user.createdAt.toISOString(),
    };
  }

  private assertPassword(password: string) {
    const ok =
      password.length >= 12 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /[0-9]/.test(password) &&
      /[^A-Za-z0-9]/.test(password);
    if (!ok) {
      throw new BadRequestException({
        error: 'WEAK_PASSWORD',
        message:
          'Password must be at least 12 characters and include upper, lower, number, and special character',
      });
    }
  }

  private async audit(action: AuditAction, actorId: string, meta: RequestMeta) {
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action,
        entityType: 'User',
        entityId: actorId,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      },
    });
  }
}
