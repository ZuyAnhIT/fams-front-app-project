import { apiClient } from '@/services/api-client';
import { unwrapApiData } from '@/services/api-response';

export interface MyRoleAssignment {
  id: string;
  userId: string;
  roleId: string;
  roleName: string;
  tenantId: string | null;
  tenantName?: string;
  siteIds?: string[];
  sites?: { id: string; name: string }[];
  assignedAt: string;
  permissions: string[];
}

export interface AvailableTenant {
  id: string;
  /** Only known for platform admins (via GET /tenants); otherwise undefined. */
  name?: string;
}

/** Every role the authenticated user holds, across all tenants they belong to. */
export async function getMyRoles(): Promise<MyRoleAssignment[]> {
  const { data } = await apiClient.get('/roles/me');
  return unwrapApiData(data);
}

/**
 * Tenants the user can act in. Ordinary users get this from their own
 * `user_roles` rows (GET /roles/me). Platform admins typically hold no
 * `user_roles` at all (they bypass per-tenant checks via `isPlatformAdmin`),
 * so when that list is empty we fall back to GET /tenants — the
 * PLATFORM_ADMIN-only endpoint that lists every tenant in the system.
 */
export async function getAvailableTenants(): Promise<AvailableTenant[]> {
  const roles = await getMyRoles();
  const roleTenantIds = [
    ...new Set(
      roles
        .map((role) => role.tenantId)
        .filter((tenantId): tenantId is string => Boolean(tenantId)),
    ),
  ];
  if (roleTenantIds.length > 0) {
    return roleTenantIds.map((id) => ({ id }));
  }

  try {
    const { data } = await apiClient.get('/tenants');
    const payload = unwrapApiData<{
      content?: { id: string; name: string }[];
      items?: { id: string; name: string }[];
    }>(data);
    return (payload.content ?? payload.items ?? []).map((tenant) => ({
      id: tenant.id,
      name: tenant.name,
    }));
  } catch {
    return [];
  }
}
