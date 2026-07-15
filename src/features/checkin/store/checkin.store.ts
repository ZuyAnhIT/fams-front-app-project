import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';

const STORAGE_KEY = '@fams_open_checkin_id';

interface OpenCheckinState {
  /** checkinId của lần check-in đang mở (chưa checkout) trong ca hiện tại, null nếu không có. */
  openCheckinId: string | null;
  isHydrating: boolean;
  hydrate: () => Promise<void>;
  setOpenCheckinId: (checkinId: string) => Promise<void>;
  clearOpenCheckinId: () => Promise<void>;
}

export const useCheckinStore = create<OpenCheckinState>((set) => ({
  openCheckinId: null,
  isHydrating: true,

  hydrate: async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      set({ openCheckinId: stored, isHydrating: false });
    } catch {
      set({ openCheckinId: null, isHydrating: false });
    }
  },

  setOpenCheckinId: async (checkinId: string) => {
    await AsyncStorage.setItem(STORAGE_KEY, checkinId);
    set({ openCheckinId: checkinId });
  },

  clearOpenCheckinId: async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    set({ openCheckinId: null });
  },
}));
