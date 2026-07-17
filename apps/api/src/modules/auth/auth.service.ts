import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  hashPassword,
  verifyPassword,
  issueTokenPair,
  verifyRefreshToken,
  hashToken,
  type TokenConfig,
} from '@nairaflow/auth';
import {
  AuditAction,
  ConflictError,
  UnauthorizedError,
  UserRole,
  UserStatus,
} from '@nairaflow/shared';
import type { User } from '@nairaflow/database';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService, type AuditContext } from '../audit/audit.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { AuthResultDto } from './dto/auth-response.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
  ) {}

  /** Register a new USER account and issue an initial token pair. */
  async register(dto: RegisterDto, ctx: AuditContext): Promise<AuthResultDto> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await hashPassword(
      dto.password,
      this.config.get<number>('jwt.bcryptSaltRounds'),
    );

    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: UserRole.USER,
        status: UserStatus.ACTIVE,
      },
    });

    await this.audit.record({
      action: AuditAction.AUTH_REGISTER,
      entityType: 'User',
      entityId: user.id,
      actorId: user.id,
      context: ctx,
    });

    return this.buildAuthResult(user, ctx);
  }

  /** Validate credentials and issue a fresh token pair. */
  async login(dto: LoginDto, ctx: AuditContext): Promise<AuthResultDto> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Run verify even when the user is missing to reduce timing side-channels.
    const passwordOk = user
      ? await verifyPassword(dto.password, user.passwordHash)
      : await verifyPassword(dto.password, '$2a$12$invalidinvalidinvalidinvalidinvalidinv');

    if (!user || !passwordOk) {
      throw new UnauthorizedError('Invalid email or password');
    }
    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.DISABLED) {
      throw new UnauthorizedError('Account is not active');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.audit.record({
      action: AuditAction.AUTH_LOGIN,
      entityType: 'User',
      entityId: user.id,
      actorId: user.id,
      context: ctx,
    });

    return this.buildAuthResult(user, ctx);
  }

  /**
   * Rotate a refresh token: verify signature, ensure the stored token is not
   * revoked/expired, revoke it, and issue a new pair. Rotation defeats replay.
   */
  async refresh(refreshToken: string, ctx: AuditContext): Promise<AuthResultDto> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken, this.tokenConfig());
    } catch {
      throw new UnauthorizedError('Invalid or expired refresh token');
    }

    const tokenHash = hashToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
      throw new UnauthorizedError('Refresh token is no longer valid');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      throw new UnauthorizedError('Account not found');
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    await this.audit.record({
      action: AuditAction.AUTH_REFRESH,
      entityType: 'User',
      entityId: user.id,
      actorId: user.id,
      context: ctx,
    });

    return this.buildAuthResult(user, ctx);
  }

  /** Revoke a refresh token (logout). Idempotent. */
  async logout(refreshToken: string, actorId?: string): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({
      action: AuditAction.AUTH_LOGOUT,
      entityType: 'User',
      entityId: actorId,
      actorId,
    });
  }

  private tokenConfig(): TokenConfig {
    return {
      accessSecret: this.config.get<string>('jwt.accessSecret') as string,
      refreshSecret: this.config.get<string>('jwt.refreshSecret') as string,
      accessTtl: this.config.get<string>('jwt.accessTtl') as string,
      refreshTtl: this.config.get<string>('jwt.refreshTtl') as string,
      issuer: 'nairaflow',
    };
  }

  private async buildAuthResult(user: User, ctx: AuditContext): Promise<AuthResultDto> {
    const tokens = issueTokenPair(
      { id: user.id, email: user.email, role: user.role as UserRole },
      this.tokenConfig(),
    );

    // Persist a hash of the refresh token so it can be rotated/revoked.
    const refreshTtlMs = this.parseTtlMs(this.config.get<string>('jwt.refreshTtl') ?? '7d');
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(tokens.refreshToken),
        userAgent: ctx.userAgent,
        ipAddress: ctx.ipAddress,
        expiresAt: new Date(Date.now() + refreshTtlMs),
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as UserRole,
        status: user.status as UserStatus,
      },
      tokens: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: this.config.get<string>('jwt.accessTtl') as string,
      },
    };
  }

  /** Parse a compact TTL string (e.g. "15m", "7d", "3600s") into milliseconds. */
  private parseTtlMs(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl.trim());
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = Number(match[1]);
    const unit = match[2];
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return value * multipliers[unit];
  }
}
