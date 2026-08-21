import type { MyRoleAssignment } from './api';

/** Role checks are always scoped to the active tenant; global roles must not unlock tenant data. */
export function hasTenantRole(
  assignments: MyRoleAssignment[] | undefined,
  tenantId: string | null,
  roleName: string,
): boolean {
  if (!tenantId) return false;
  const expected = roleName.trim().toUpperCase();
  return Boolean(assignments?.some(
    (assignment) =>
      assignment.tenantId === tenantId && assignment.roleName.trim().toUpperCase() === expected,
  ));
}

export function hasTenantPermission(
  assignments: MyRoleAssignment[] | undefined,
  tenantId: string | null,
  permissions: readonly string[],
): boolean {
  if (!tenantId || permissions.length === 0) return false;
  const expected = new Set(permissions);
  return Boolean(assignments?.some(
    (assignment) =>
      (assignment.tenantId === null || assignment.tenantId === tenantId) &&
      assignment.permissions.some((permission) => expected.has(permission)),
  ));
}
