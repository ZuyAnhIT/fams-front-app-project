import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

export interface MyRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  roleName: string;
  tenantId: string | null;
  tenantName?: string;
  tenantSlug?: string;
  siteIds?: string[];
  sites?: { id: string; name: string }[];
  assignedAt: string;
  permissions: string[];
}

export interface AvailableTenant {
  id: string;
  name?: string;
  slug?: string;
  roleNames: string[];
}

/** Every role the authenticated user holds, across all tenants they belong to. */
export async function getMyRoles(): Promise<MyRoleAssignment[]> {
  const { data } = await apiClient.get('/roles/me');
  return unwrapApiData(data);
}

/** Tenants with an active role that POST /auth/switch-tenant will accept. */
export async function getAvailableTenants(): Promise<AvailableTenant[]> {
  const roles = await getMyRoles();
  const grouped = new Map<string, AvailableTenant>();
  for (const role of roles) {
    if (!role.tenantId) continue;
    const existing = grouped.get(role.tenantId);
    if (existing) {
      if (!existing.roleNames.includes(role.roleName)) {
        existing.roleNames.push(role.roleName);
      }
      existing.name ??= role.tenantName;
      existing.slug ??= role.tenantSlug;
      continue;
    }
    grouped.set(role.tenantId, {
      id: role.tenantId,
      name: role.tenantName,
      slug: role.tenantSlug,
      roleNames: [role.roleName],
    });
  }
  return [...grouped.values()];
}
