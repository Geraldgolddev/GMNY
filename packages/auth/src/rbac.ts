import { UserRole } from '@gmny/shared';

/**
 * Role hierarchy: an ADMIN implicitly satisfies any USER-level requirement.
 * Higher number == more privilege.
 */
const ROLE_RANK: Record<UserRole, number> = {
  [UserRole.USER]: 1,
  [UserRole.ADMIN]: 2,
};

/** Returns true if `role` satisfies at least one of the `required` roles. */
export function hasRequiredRole(role: UserRole, required: UserRole[]): boolean {
  if (required.length === 0) return true;
  const rank = ROLE_RANK[role] ?? 0;
  return required.some((r) => rank >= ROLE_RANK[r]);
}
