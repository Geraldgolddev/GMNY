import { hasRequiredRole } from './rbac';
import { UserRole } from '@gmny/shared';

describe('hasRequiredRole', () => {
  it('allows any role when no requirement is set', () => {
    expect(hasRequiredRole(UserRole.USER, [])).toBe(true);
  });

  it('grants ADMIN access to USER-gated resources (hierarchy)', () => {
    expect(hasRequiredRole(UserRole.ADMIN, [UserRole.USER])).toBe(true);
  });

  it('denies USER access to ADMIN-gated resources', () => {
    expect(hasRequiredRole(UserRole.USER, [UserRole.ADMIN])).toBe(false);
  });

  it('grants matching-role access', () => {
    expect(hasRequiredRole(UserRole.ADMIN, [UserRole.ADMIN])).toBe(true);
  });
});
