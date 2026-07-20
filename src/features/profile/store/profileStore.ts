import { create } from 'zustand';

import type { ProfileActions, ProfileState } from '../types/Profile';

type ProfileStore = ProfileState & ProfileActions;

export const useProfileStore = create<ProfileStore>((set) => ({
  pendingInvitations: [],

  setPendingInvitations: (invitations) =>
    set({ pendingInvitations: invitations }),

  removeInvitation: (id) =>
    set((state) => ({
      pendingInvitations: state.pendingInvitations.filter((i) => i.id !== id),
    })),
}));
