import { Body, Controller, Get, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { Auth, CurrentUser, type AuthUser } from '../../common/auth.decorator';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register a new USER account' })
  register(
    @Body()
    body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
    },
    @Req() req: Request,
  ) {
    return this.auth.register(body, this.meta(req));
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login with email and password' })
  login(@Body() body: { email: string; password: string }, @Req() req: Request) {
    return this.auth.login(body, this.meta(req));
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token' })
  refresh(@Body() body: { refreshToken: string }, @Req() req: Request) {
    return this.auth.refresh(body.refreshToken, this.meta(req));
  }

  @Auth()
  @ApiBearerAuth()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Revoke refresh session(s)' })
  logout(
    @CurrentUser() user: AuthUser,
    @Body() body: { refreshToken?: string },
    @Req() req: Request,
  ) {
    return this.auth.logout(user.id, body.refreshToken, this.meta(req));
  }

  @Auth()
  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Current authenticated user' })
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  private meta(req: Request) {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    };
  }
}
