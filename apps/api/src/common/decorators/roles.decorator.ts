import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@gmny/shared';

export const ROLES_KEY = 'roles';

/** Restricts a route to the given RBAC roles (ADMIN inherits USER access). */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
