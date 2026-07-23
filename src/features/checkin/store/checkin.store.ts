import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const LEGACY_STORAGE_KEY = '@fams_open_checkin_id';

function storageKey(userId: string, tenantId: string): string {
  return `@fams_open_checkin_id:${encodeURIComponent(userId)}:${encodeURIComponent(tenantId)}`;
}

interface OpenCheckinState {
  /** checkinId của lần check-in đang mở (chưa checkout) trong ca hiện tại, null nếu không có. */
  openCheckinId: string | null;
  contextKey: string | null;
  isHydrating: boolean;
  hydrate: (userId: string | null, tenantId: string | null) => Promise<void>;
  setOpenCheckinId: (checkinId: string) => Promise<void>;
  clearOpenCheckinId: () => Promise<void>;
  /** Clears only in-memory context. Scoped persisted records remain recoverable. */
  resetContext: () => void;
}

export const useCheckinStore = create<OpenCheckinState>((set, get) => ({
  openCheckinId: null,
  contextKey: null,
  isHydrating: true,

  hydrate: async (userId, tenantId) => {
    if (!userId || !tenantId) {
      set({ openCheckinId: null, contextKey: null, isHydrating: false });
      return;
    }

    const nextContextKey = storageKey(userId, tenantId);
    set({ openCheckinId: null, contextKey: nextContextKey, isHydrating: true });

    try {
      // Never migrate the unscoped legacy value: its owner/tenant is unknown.
      const [, stored] = await Promise.all([
        AsyncStorage.removeItem(LEGACY_STORAGE_KEY),
        AsyncStorage.getItem(nextContextKey),
      ]);
      if (get().contextKey === nextContextKey) {
        set({ openCheckinId: stored, isHydrating: false });
      }
    } catch {
      if (get().contextKey === nextContextKey) {
        set({ openCheckinId: null, isHydrating: false });
      }
    }
  },

  setOpenCheckinId: async (checkinId: string) => {
    const currentContextKey = get().contextKey;
    if (!currentContextKey) {
      // The backend check-in may already have succeeded; retain the ID in RAM
      // instead of throwing from onSuccess and reporting a false failure.
      set({ openCheckinId: checkinId });
      return;
    }
    await AsyncStorage.setItem(currentContextKey, checkinId);
    if (get().contextKey === currentContextKey) {
      set({ openCheckinId: checkinId });
    }
  },

  clearOpenCheckinId: async () => {
    const currentContextKey = get().contextKey;
    if (currentContextKey) {
      await AsyncStorage.removeItem(currentContextKey);
    }
    if (get().contextKey === currentContextKey) {
      set({ openCheckinId: null });
    }
  },

  resetContext: () =>
    set({ openCheckinId: null, contextKey: null, isHydrating: false }),
}));
