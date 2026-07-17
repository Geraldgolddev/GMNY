import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { verifyAccessToken } from '@nairaflow/auth';
import type { AuthenticatedUser } from '@nairaflow/shared';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

/**
 * Authenticates requests by verifying the Bearer access token. Routes marked
 * with `@Public()` bypass the check. On success, `request.user` is populated
 * with the authenticated principal.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest();
    const token = this.extractToken(request.headers?.authorization);
    if (!token) {
      throw new UnauthorizedException('Missing or malformed Authorization header');
    }

    try {
      const payload = verifyAccessToken(token, {
        accessSecret: this.config.get<string>('jwt.accessSecret') as string,
        refreshSecret: this.config.get<string>('jwt.refreshSecret') as string,
        accessTtl: this.config.get<string>('jwt.accessTtl') as string,
        refreshTtl: this.config.get<string>('jwt.refreshTtl') as string,
      });
      const user: AuthenticatedUser = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };
      request.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  private extractToken(header?: string): string | null {
    if (!header) return null;
    const [scheme, value] = header.split(' ');
    return scheme === 'Bearer' && value ? value : null;
  }
}
