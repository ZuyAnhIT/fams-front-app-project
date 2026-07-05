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
 * active tenant or the sole candidate automatically.
 */
export async function resolveAuthenticatedSession(
  presetUser: UserProfile | undefined,
): Promise<AuthenticatedSession> {
  const user = presetUser ?? (await getMyProfile());

  let tenantCandidates: AvailableTenant[] = [];
  try {
    tenantCandidates = await getAvailableTenants();
  } catch {
    // Leave candidates empty – caller falls back to manual tenant entry
  }

  const { activeTenantId, setActiveTenantId } = useAuthStore.getState();
  const keepExisting =
    !!activeTenantId && tenantCandidates.some((t) => t.id === activeTenantId);

  let resolvedTenantId = keepExisting ? activeTenantId : null;
  if (!keepExisting) {
    resolvedTenantId = tenantCandidates.length === 1 ? tenantCandidates[0].id : null;
    await setActiveTenantId(resolvedTenantId);
  }

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
  if (session.tenantCandidates.length > 1 && !session.user.tenant_id) {
    router.replace('/(auth)/select-tenant' as never);
    return;
  }
  router.replace('/(tabs)/home');
}
