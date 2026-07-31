import { router } from 'expo-router';

import { getAvailableTenants, type AvailableTenant } from '../rbac/api';
import { getMyProfile } from './api';
import { useAuthStore } from './store';
import type { UserProfile } from './types';

export interface AuthenticatedSession {
  user: UserProfile;
  /**
   * Tenants the user can act in (see `getAvailableTenants`). Backend has no
   * single "current tenant" concept, so when there is more than one the
   * caller must let the user pick before any tenant-scoped screen (Site,
   * Assignment, ...) can be used.
   */
  tenantCandidates: AvailableTenant[];
}

/**
 * Resolves the logged-in user's profile after a login/register/OTP/2FA flow
 * and figures out which tenant(s) they can act in, then applies the previous
 * active tenant. A sole candidate is selected automatically; accounts with
 * multiple companies must explicitly confirm a company so the backend can
 * issue a matching token pair through POST /auth/switch-tenant.
 */
export async function resolveAuthenticatedSession(
  presetUser: UserProfile | undefined,
  tokenActiveTenantId?: string,
): Promise<AuthenticatedSession> {
  const user = presetUser ?? (await getMyProfile());

  let tenantCandidates: AvailableTenant[] = [];
  try {
    tenantCandidates = await getAvailableTenants();
  } catch {
    // Leave candidates empty – caller falls back to manual tenant entry
  }

  const { activeTenantId, setActiveTenantId } = useAuthStore.getState();
  const tokenTenantIsAvailable =
    !!tokenActiveTenantId &&
    tenantCandidates.some((tenant) => tenant.id === tokenActiveTenantId);
  const storedTenantIsAvailable =
    !!activeTenantId && tenantCandidates.some((tenant) => tenant.id === activeTenantId);
  const resolvedTenantId = tokenTenantIsAvailable
    ? tokenActiveTenantId
    : tenantCandidates.length === 1
      ? tenantCandidates[0].id
      : storedTenantIsAvailable
        ? activeTenantId
        : null;
  await setActiveTenantId(resolvedTenantId);

  return {
    user: { ...user, tenant_id: resolvedTenantId ?? user.tenant_id },
    tenantCandidates,
  };
}

/**
 * Call right after `setUser()` in every login/register/OTP/2FA success handler.
 * Routes to the tenant picker when the user can act in more than one tenant
 * and none is currently active; otherwise goes straight to the app.
 */
export function navigateAfterAuth(session: AuthenticatedSession): void {
  if (session.tenantCandidates.length > 1) {
    router.replace('/(auth)/select-tenant' as never);
    return;
  }
  router.replace('/(tabs)/home');
}
