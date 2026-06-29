import { create } from 'zustand';

interface NotificationStoreState {
  unreadCount: number;
}

interface NotificationStoreActions {
  setUnreadCount: (count: number) => void;
  decrementUnreadCount: (by?: number) => void;
  resetUnreadCount: () => void;
}

type NotificationStore = NotificationStoreState & NotificationStoreActions;

export const useNotificationStore = create<NotificationStore>((set) => ({
  unreadCount: 0,

  setUnreadCount: (count) => set({ unreadCount: Math.max(0, count) }),

  decrementUnreadCount: (by = 1) =>
    set((state) => ({ unreadCount: Math.max(0, state.unreadCount - by) })),

  resetUnreadCount: () => set({ unreadCount: 0 }),
}));
