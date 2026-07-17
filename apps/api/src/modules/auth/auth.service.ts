import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  hashPassword,
  verifyPassword,
  issueTokenPair,
  verifyRefreshToken,
  hashToken,
  generateSecureToken,
  type TokenConfig,
} from '@gmny/auth';
import {
  AuditAction,
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  UserRole,
  UserStatus,
  TokenType,
} from '@gmny/shared';
import type { User } from '@gmny/database';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService, type AuditContext } from '../audit/audit.service';
import { MailService } from '../mail/mail.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import type { AuthResultDto, SessionDto } from './dto/auth-response.dto';

export interface IssuedSession {
  result: AuthResultDto;
  /** Raw refresh token — the controller places this in an httpOnly cookie. */
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly audit: AuditService,
    private readonly mail: MailService,
  ) {}

  // ── Registration & login ────────────────────────────────────────────────

  async register(dto: RegisterDto, ctx: AuditContext): Promise<IssuedSession> {
    const email = dto.email.toLowerCase().trim();
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new ConflictError('An account with this email already exists');
    }

    const passwordHash = await hashPassword(dto.password, this.argonParams());
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: UserRole.USER,
        status: UserStatus.PENDING,
      },
    });

    await this.audit.record({
      action: AuditAction.AUTH_REGISTER,
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      context: ctx,
    });

    const devUrl = await this.issueEmailVerification(user);
    const session = await this.issueSession(user, ctx);
    if (devUrl) session.result.devVerificationUrl = devUrl;
    return session;
  }

  async login(dto: LoginDto, ctx: AuditContext): Promise<IssuedSession> {
    const email = dto.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email } });
    // Verify even when the user is missing to equalize timing.
    const passwordOk = user
      ? await verifyPassword(dto.password, user.passwordHash)
      : await verifyPassword(dto.password, '$argon2id$v=19$m=19456,t=2,p=1$aaaaaaaaaaaaaaaa$aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');

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
      userId: user.id,
      context: ctx,
    });

    return this.issueSession(user, ctx);
  }

  async refresh(refreshToken: string, ctx: AuditContext): Promise<IssuedSession> {
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
    if (!user) throw new UnauthorizedError('Account not found');

    // Rotate: revoke the presented token, issue a fresh pair.
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({
      action: AuditAction.AUTH_REFRESH,
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      context: ctx,
    });

    return this.issueSession(user, ctx);
  }

  async logout(refreshToken: string | undefined, actorId?: string): Promise<void> {
    if (!refreshToken) return;
    const tokenHash = hashToken(refreshToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({
      action: AuditAction.AUTH_LOGOUT,
      entityType: 'User',
      entityId: actorId,
      userId: actorId,
    });
  }

  // ── Email verification ──────────────────────────────────────────────────

  async verifyEmail(token: string, ctx: AuditContext): Promise<void> {
    const userId = await this.consumeToken(TokenType.EMAIL_VERIFICATION, token);
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
        // Activate the account if it was still pending verification.
        status: UserStatus.ACTIVE,
      },
    });
    await this.audit.record({
      action: AuditAction.AUTH_EMAIL_VERIFY,
      entityType: 'User',
      entityId: userId,
      userId: userId,
      context: ctx,
    });
  }

  async resendVerification(userId: string): Promise<string | undefined> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundError('User not found');
    if (user.emailVerifiedAt) return undefined;
    return this.issueEmailVerification(user);
  }

  // ── Password reset ──────────────────────────────────────────────────────

  async forgotPassword(email: string, ctx: AuditContext): Promise<string | undefined> {
    const normalized = email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({ where: { email: normalized } });
    // Anti-enumeration: behave identically whether or not the user exists.
    if (!user) return undefined;

    const raw = generateSecureToken();
    const ttlMinutes = this.config.get<number>('tokenTtl.passwordResetMinutes') ?? 30;
    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        type: TokenType.PASSWORD_RESET,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + ttlMinutes * 60_000),
      },
    });

    const link = `${this.webUrl()}/reset-password?token=${raw}`;
    await this.mail.sendPasswordResetEmail(user.email, link);
    await this.audit.record({
      action: AuditAction.AUTH_FORGOT_PASSWORD,
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
      context: ctx,
    });
    return this.isDev() ? link : undefined;
  }

  async resetPassword(token: string, newPassword: string, ctx: AuditContext): Promise<void> {
    const userId = await this.consumeToken(TokenType.PASSWORD_RESET, token);
    const passwordHash = await hashPassword(newPassword, this.argonParams());

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { passwordHash } }),
      // Invalidate every existing session on password reset.
      this.prisma.refreshToken.updateMany({
        where: { userId, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.audit.record({
      action: AuditAction.AUTH_RESET_PASSWORD,
      entityType: 'User',
      entityId: userId,
      userId: userId,
      context: ctx,
    });
  }

  // ── Session management ──────────────────────────────────────────────────

  async listSessions(userId: string, currentRefreshToken?: string): Promise<SessionDto[]> {
    const currentHash = currentRefreshToken ? hashToken(currentRefreshToken) : null;
    const sessions = await this.prisma.refreshToken.findMany({
      where: { userId, revokedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    });
    return sessions.map((s) => ({
      id: s.id,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      current: currentHash !== null && s.tokenHash === currentHash,
    }));
  }

  async revokeSession(userId: string, sessionId: string): Promise<void> {
    const session = await this.prisma.refreshToken.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new NotFoundError('Session not found');
    await this.prisma.refreshToken.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    await this.audit.record({
      action: AuditAction.AUTH_SESSION_REVOKE,
      entityType: 'RefreshToken',
      entityId: session.id,
      userId: userId,
    });
  }

  // ── Internals ───────────────────────────────────────────────────────────

  private async issueEmailVerification(user: User): Promise<string | undefined> {
    const raw = generateSecureToken();
    const ttlHours = this.config.get<number>('tokenTtl.emailVerificationHours') ?? 24;
    await this.prisma.verificationToken.create({
      data: {
        userId: user.id,
        type: TokenType.EMAIL_VERIFICATION,
        tokenHash: hashToken(raw),
        expiresAt: new Date(Date.now() + ttlHours * 3_600_000),
      },
    });
    const link = `${this.webUrl()}/verify-email?token=${raw}`;
    await this.mail.sendVerificationEmail(user.email, link);
    await this.audit.record({
      action: AuditAction.AUTH_EMAIL_VERIFICATION_SENT,
      entityType: 'User',
      entityId: user.id,
      userId: user.id,
    });
    return this.isDev() ? link : undefined;
  }

  /** Atomically find, validate, and consume a one-time token; returns userId. */
  private async consumeToken(type: TokenType, rawToken: string): Promise<string> {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.verificationToken.findUnique({ where: { tokenHash } });
    if (!record || record.type !== type || record.consumedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedError('Invalid or expired token');
    }
    // Guard against races: only the first consumer wins.
    const consumed = await this.prisma.verificationToken.updateMany({
      where: { id: record.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count === 0) {
      throw new UnauthorizedError('Invalid or expired token');
    }
    return record.userId;
  }

  private async issueSession(user: User, ctx: AuditContext): Promise<IssuedSession> {
    const tokens = issueTokenPair(
      { id: user.id, email: user.email, role: user.role as UserRole },
      this.tokenConfig(),
    );
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
      refreshToken: tokens.refreshToken,
      result: {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role as UserRole,
          status: user.status as UserStatus,
          emailVerified: Boolean(user.emailVerifiedAt),
        },
        tokens: {
          accessToken: tokens.accessToken,
          expiresIn: this.config.get<string>('jwt.accessTtl') as string,
        },
      },
    };
  }

  private tokenConfig(): TokenConfig {
    return {
      accessSecret: this.config.get<string>('jwt.accessSecret') as string,
      refreshSecret: this.config.get<string>('jwt.refreshSecret') as string,
      accessTtl: this.config.get<string>('jwt.accessTtl') as string,
      refreshTtl: this.config.get<string>('jwt.refreshTtl') as string,
      issuer: 'gmny',
    };
  }

  private argonParams() {
    return this.config.get('argon2') as {
      memoryCost: number;
      timeCost: number;
      parallelism: number;
    };
  }

  private webUrl(): string {
    return (this.config.get<string>('app.webUrl') ?? 'http://localhost:3000').replace(/\/$/, '');
  }

  private isDev(): boolean {
    return this.config.get<string>('app.nodeEnv') !== 'production';
  }

  private parseTtlMs(ttl: string): number {
    const match = /^(\d+)([smhd])$/.exec(ttl.trim());
    if (!match) return 7 * 24 * 60 * 60 * 1000;
    const value = Number(match[1]);
    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60_000,
      h: 3_600_000,
      d: 86_400_000,
    };
    return value * multipliers[match[2]];
  }
}
