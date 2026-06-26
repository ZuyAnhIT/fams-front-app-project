import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { AuthActions, AuthState, UserProfile } from './types';

const KEY_ACCESS = 'fams_access_token';
const KEY_REFRESH = 'fams_refresh_token';

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

  // ─── Actions ────────────────────────────────────────────────────────────────

  setTokens: async (access, refresh) => {
    await SecureStore.setItemAsync(KEY_ACCESS, access);
    await SecureStore.setItemAsync(KEY_REFRESH, refresh);
    set({ accessToken: access, refreshToken: refresh, isAuthenticated: true });
  },

  setUser: (user: UserProfile) => set({ user }),

  set2FARequired: (required, tempToken = null) =>
    set({ is2FARequired: required, tempToken }),

  hydrateFromSecureStore: async () => {
    try {
      const [access, refresh] = await Promise.all([
        SecureStore.getItemAsync(KEY_ACCESS),
        SecureStore.getItemAsync(KEY_REFRESH),
      ]);
      if (access && refresh) {
        set({ accessToken: access, refreshToken: refresh, isAuthenticated: true });
      }
    } catch {
      // Hydration failure leaves the user unauthenticated – that's correct
    } finally {
      set({ isHydrating: false });
    }
  },

  clearAuth: async () => {
    await Promise.allSettled([
      SecureStore.deleteItemAsync(KEY_ACCESS),
      SecureStore.deleteItemAsync(KEY_REFRESH),
    ]);
    set({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      is2FARequired: false,
      tempToken: null,
    });
  },
}));
