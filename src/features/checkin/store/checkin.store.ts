import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

import type { OpenCheckinContext } from '../types/checkin.type';

const LEGACY_STORAGE_KEY = '@fams_open_checkin_id';

function storageKey(userId: string, tenantId: string): string {
  return `@fams_open_checkin_id:${encodeURIComponent(userId)}:${encodeURIComponent(tenantId)}`;
}

interface OpenCheckinState {
  /** Kept as a derived convenience value for existing consumers. */
  openCheckinId: string | null;
  openCheckin: OpenCheckinContext | null;
  contextKey: string | null;
  isHydrating: boolean;
  hydrate: (userId: string | null, tenantId: string | null) => Promise<void>;
  setOpenCheckin: (context: OpenCheckinContext) => Promise<void>;
  setOpenCheckinId: (checkinId: string) => Promise<void>;
  clearOpenCheckinId: () => Promise<void>;
  /** Clears only in-memory context. Scoped persisted records remain recoverable. */
  resetContext: () => void;
}

export const useCheckinStore = create<OpenCheckinState>((set, get) => ({
  openCheckinId: null,
  openCheckin: null,
  contextKey: null,
  isHydrating: true,

  hydrate: async (userId, tenantId) => {
    if (!userId || !tenantId) {
      set({
        openCheckinId: null,
        openCheckin: null,
        contextKey: null,
        isHydrating: false,
      });
      return;
    }

    const nextContextKey = storageKey(userId, tenantId);
    set({
      openCheckinId: null,
      openCheckin: null,
      contextKey: nextContextKey,
      isHydrating: true,
    });

    try {
      // Never migrate the unscoped legacy value: its owner/tenant is unknown.
      const [, stored] = await Promise.all([
        AsyncStorage.removeItem(LEGACY_STORAGE_KEY),
        AsyncStorage.getItem(nextContextKey),
      ]);
      if (get().contextKey === nextContextKey) {
        let openCheckin: OpenCheckinContext | null = null;
        if (stored) {
          try {
            const parsed = JSON.parse(stored) as OpenCheckinContext;
            if (parsed?.checkinId) openCheckin = parsed;
          } catch {
            // Backward compatibility for the former raw checkinId value.
            openCheckin = {
              checkinId: stored,
              siteId: null,
              siteName: null,
              effectiveCheckinPolicy: null,
            };
          }
        }
        set({
          openCheckinId: openCheckin?.checkinId ?? null,
          openCheckin,
          isHydrating: false,
        });
      }
    } catch {
      if (get().contextKey === nextContextKey) {
        set({ openCheckinId: null, openCheckin: null, isHydrating: false });
      }
    }
  },

  setOpenCheckin: async (context) => {
    const currentContextKey = get().contextKey;
    if (!currentContextKey) {
      set({ openCheckinId: context.checkinId, openCheckin: context });
      return;
    }
    await AsyncStorage.setItem(currentContextKey, JSON.stringify(context));
    if (get().contextKey === currentContextKey) {
      set({ openCheckinId: context.checkinId, openCheckin: context });
    }
  },

  setOpenCheckinId: async (checkinId) =>
    get().setOpenCheckin({
      checkinId,
      siteId: null,
      siteName: null,
      effectiveCheckinPolicy: null,
    }),

  clearOpenCheckinId: async () => {
    const currentContextKey = get().contextKey;
    if (currentContextKey) {
      await AsyncStorage.removeItem(currentContextKey);
    }
    if (get().contextKey === currentContextKey) {
      set({ openCheckinId: null, openCheckin: null });
    }
  },

  resetContext: () =>
    set({
      openCheckinId: null,
      openCheckin: null,
      contextKey: null,
      isHydrating: false,
    }),
}));
