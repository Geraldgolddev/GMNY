import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import type { AuthenticatedUser } from '@nairaflow/shared';
import { AuthService, type IssuedSession } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { AuthResultDto, MessageDto, SessionDto } from './dto/auth-response.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { REFRESH_COOKIE, clearRefreshCookie, setRefreshCookie } from './cookie.util';

/** Stricter throttle for credential / enumeration-sensitive routes. */
const STRICT_THROTTLE = { default: { limit: 5, ttl: 60_000 } };

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Throttle(STRICT_THROTTLE)
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user and send a verification email' })
  @ApiResponse({ status: 201, type: AuthResultDto })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResultDto> {
    const session = await this.authService.register(dto, this.context(req));
    return this.finishSession(res, session);
  }

  @Public()
  @Throttle(STRICT_THROTTLE)
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate; returns an access token + sets refresh cookie' })
  @ApiResponse({ status: 200, type: AuthResultDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResultDto> {
    const session = await this.authService.login(dto, this.context(req));
    return this.finishSession(res, session);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate the refresh cookie for a new access token' })
  @ApiResponse({ status: 200, type: AuthResultDto })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<AuthResultDto> {
    const token = this.readRefreshToken(req, dto);
    const session = await this.authService.refresh(token, this.context(req));
    return this.finishSession(res, session);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current session and clear the refresh cookie' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    await this.authService.logout(this.readRefreshToken(req), userId);
    clearRefreshCookie(res, this.isProd());
  }

  @Public()
  @Throttle(STRICT_THROTTLE)
  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify an email address using the token from the email' })
  @ApiResponse({ status: 200, type: MessageDto })
  async verifyEmail(@Body() dto: VerifyEmailDto, @Req() req: Request): Promise<MessageDto> {
    await this.authService.verifyEmail(dto.token, this.context(req));
    return { message: 'Email verified successfully' };
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Re-send the email verification link' })
  @ApiResponse({ status: 200, type: MessageDto })
  async resendVerification(@CurrentUser('id') userId: string): Promise<MessageDto> {
    const devUrl = await this.authService.resendVerification(userId);
    return { message: 'Verification email sent', ...(devUrl ? { devActionUrl: devUrl } : {}) };
  }

  @Public()
  @Throttle(STRICT_THROTTLE)
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request a password-reset link (always succeeds)' })
  @ApiResponse({ status: 200, type: MessageDto })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: Request,
  ): Promise<MessageDto> {
    const devUrl = await this.authService.forgotPassword(dto.email, this.context(req));
    return {
      message: 'If an account exists for that email, a reset link has been sent',
      ...(devUrl ? { devActionUrl: devUrl } : {}),
    };
  }

  @Public()
  @Throttle(STRICT_THROTTLE)
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset a password using the token from the email' })
  @ApiResponse({ status: 200, type: MessageDto })
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request): Promise<MessageDto> {
    await this.authService.resetPassword(dto.token, dto.newPassword, this.context(req));
    return { message: 'Password reset successfully. Please log in.' };
  }

  @Get('sessions')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List the current user active sessions' })
  @ApiResponse({ status: 200, type: [SessionDto] })
  sessions(@Req() req: Request, @CurrentUser('id') userId: string): Promise<SessionDto[]> {
    return this.authService.listSessions(userId, this.readRefreshToken(req));
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke a specific session' })
  async revokeSession(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    await this.authService.revokeSession(userId, id);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the authenticated principal' })
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  // ── helpers ───────────────────────────────────────────────────────────

  private finishSession(res: Response, session: IssuedSession): AuthResultDto {
    setRefreshCookie(res, session.refreshToken, this.refreshMaxAgeMs(), this.isProd());
    return session.result;
  }

  private readRefreshToken(req: Request, dto?: RefreshDto): string {
    const fromCookie = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
    return fromCookie ?? dto?.refreshToken ?? '';
  }

  private context(req: Request): { ipAddress?: string; userAgent?: string } {
    return { ipAddress: req.ip, userAgent: req.headers['user-agent'] };
  }

  private isProd(): boolean {
    return this.config.get<string>('app.nodeEnv') === 'production';
  }

  private refreshMaxAgeMs(): number {
    const ttl = this.config.get<string>('jwt.refreshTtl') ?? '7d';
    const match = /^(\d+)([smhd])$/.exec(ttl.trim());
    if (!match) return 7 * 86_400_000;
    const mult: Record<string, number> = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 };
    return Number(match[1]) * mult[match[2]];
  }
}
