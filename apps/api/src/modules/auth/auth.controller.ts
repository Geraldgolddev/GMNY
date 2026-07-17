import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import type { AuthenticatedUser } from '@nairaflow/shared';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { AuthResultDto } from './dto/auth-response.dto';
import { Public } from '../../common/decorators/public.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new user account' })
  @ApiResponse({ status: 201, type: AuthResultDto })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  register(@Body() dto: RegisterDto, @Req() req: Request): Promise<AuthResultDto> {
    return this.authService.register(dto, this.context(req));
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate and receive access + refresh tokens' })
  @ApiResponse({ status: 200, type: AuthResultDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  login(@Body() dto: LoginDto, @Req() req: Request): Promise<AuthResultDto> {
    return this.authService.login(dto, this.context(req));
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a refresh token for a new token pair' })
  @ApiResponse({ status: 200, type: AuthResultDto })
  refresh(@Body() dto: RefreshDto, @Req() req: Request): Promise<AuthResultDto> {
    return this.authService.refresh(dto.refreshToken, this.context(req));
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Revoke a refresh token (logout)' })
  async logout(
    @Body() dto: RefreshDto,
    @CurrentUser('id') userId: string,
  ): Promise<void> {
    await this.authService.logout(dto.refreshToken, userId);
  }

  @Get('me')
  @ApiOperation({ summary: 'Return the authenticated principal' })
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  private context(req: Request): { ipAddress?: string; userAgent?: string } {
    return {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    };
  }
}
