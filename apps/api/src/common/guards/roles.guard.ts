import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasRequiredRole } from '@nairaflow/auth';
import { UserRole, type AuthenticatedUser } from '@nairaflow/shared';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Enforces RBAC. Reads required roles from `@Roles()` metadata and compares
 * against the authenticated principal using the shared role hierarchy.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user || !hasRequiredRole(user.role, required)) {
      throw new ForbiddenException('Insufficient role privileges');
    }
    return true;
  }
}
