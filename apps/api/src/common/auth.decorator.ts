import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  UseGuards,
  applyDecorators,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { verifyAccessToken } from '@gmny/auth';
import { Role } from '@gmny/shared';
import type { Request } from 'express';

export type AuthUser = { id: string; email: string; role: string };

export const ROLES_KEY = 'roles';
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'Missing bearer token',
      });
    }
    try {
      const payload = verifyAccessToken(
        header.slice(7),
        this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      );
      req.user = { id: payload.sub, email: payload.email, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired access token',
      });
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;

    const req = context.switchToHttp().getRequest<{ user?: AuthUser }>();
    if (!req.user || !roles.includes(req.user.role as Role)) {
      throw new ForbiddenException({
        error: 'FORBIDDEN',
        message: 'Admin role required',
      });
    }
    return true;
  }
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser => {
    const req = ctx.switchToHttp().getRequest<{ user: AuthUser }>();
    return req.user;
  },
);

export const Auth = () => applyDecorators(UseGuards(AuthGuard), SetMetadata('auth', true));

/** Bearer auth + ADMIN role. */
export const AdminAuth = () =>
  applyDecorators(
    SetMetadata('auth', true),
    Roles(Role.ADMIN),
    UseGuards(AuthGuard, RolesGuard),
  );
