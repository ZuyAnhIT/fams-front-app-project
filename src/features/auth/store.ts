import * as SecureStore from './secure-storage';
import { create } from 'zustand';

import type { AuthActions, AuthState, UserProfile } from './types';

const KEY_ACCESS = 'fams_access_token';
const KEY_REFRESH = 'fams_refresh_token';
const KEY_ACTIVE_TENANT = 'fams_active_tenant_id';

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set) => ({
  // ─── Initial State ──────────────────────────────────────────────────────────
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
  isHydrating: true,
  is2FARequired: false,
  tempToken: null,
  activeTenantId: null,

  // ─── Actions ────────────────────────────────────────────────────────────────

  setTokens: async (access, refresh) => {
    await SecureStore.setItemAsync(KEY_ACCESS, access);
    await SecureStore.setItemAsync(KEY_REFRESH, refresh);
    set({ accessToken: access, refreshToken: refresh, isAuthenticated: true });
  },

  setTenantSession: async (access, refresh, tenantId) => {
    await Promise.all([
      SecureStore.setItemAsync(KEY_ACCESS, access),
      SecureStore.setItemAsync(KEY_REFRESH, refresh),
      SecureStore.setItemAsync(KEY_ACTIVE_TENANT, tenantId),
    ]);
    set({
      accessToken: access,
      refreshToken: refresh,
      activeTenantId: tenantId,
      isAuthenticated: true,
    });
  },

  setUser: (user: UserProfile) => set({ user }),

  set2FARequired: (required, tempToken = null) =>
    set({ is2FARequired: required, tempToken }),

  setActiveTenantId: async (tenantId: string | null) => {
    if (tenantId) {
      await SecureStore.setItemAsync(KEY_ACTIVE_TENANT, tenantId);
    } else {
      await SecureStore.deleteItemAsync(KEY_ACTIVE_TENANT);
    }
    set({ activeTenantId: tenantId });
  },

  hydrateFromSecureStore: async () => {
    try {
      const [access, refresh, activeTenantId] = await Promise.all([
        SecureStore.getItemAsync(KEY_ACCESS),
        SecureStore.getItemAsync(KEY_REFRESH),
        SecureStore.getItemAsync(KEY_ACTIVE_TENANT),
      ]);
      if (access && refresh) {
        // A stored token pair is only a session candidate. AppInit verifies it
        // against GET /auth/me before protected routes may render.
        set({
          accessToken: access,
          refreshToken: refresh,
          activeTenantId,
          isAuthenticated: false,
        });
        return;
      }
      set({ activeTenantId: null, isAuthenticated: false, isHydrating: false });
    } catch {
      // Hydration failure leaves the user unauthenticated – that's correct
      set({ isHydrating: false });
    }
  },

  finishHydration: () =>
    set((state) => ({
      isAuthenticated: Boolean(state.accessToken && state.refreshToken && state.user),
      isHydrating: false,
    })),

  clearAuth: async () => {
    await Promise.allSettled([
      SecureStore.deleteItemAsync(KEY_ACCESS),
      SecureStore.deleteItemAsync(KEY_REFRESH),
      SecureStore.deleteItemAsync(KEY_ACTIVE_TENANT),
    ]);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isHydrating: false,
      is2FARequired: false,
      tempToken: null,
      activeTenantId: null,
    });
  },
}));
