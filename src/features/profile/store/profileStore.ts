import { create } from 'zustand';

import type { CapturedFacePhoto, ProfileActions, ProfileState, TenantInvitation } from '../types';

type ProfileStore = ProfileState & ProfileActions;

const emptySession = () => ({
  photos: [] as CapturedFacePhoto[],
  currentStep: 0,
  consentAccepted: false,
});

export const useProfileStore = create<ProfileStore>((set) => ({
  enrollSession: null,
  pendingInvitations: [],

  startEnrollSession: () =>
    set({ enrollSession: emptySession() }),

  addCapturedPhoto: (photo) =>
    set((state) => {
      if (!state.enrollSession) return state;
      return {
        enrollSession: {
          ...state.enrollSession,
          photos: [...state.enrollSession.photos, photo],
          currentStep: state.enrollSession.currentStep + 1,
        },
      };
    }),

  removeLastPhoto: () =>
    set((state) => {
      if (!state.enrollSession || state.enrollSession.photos.length === 0) return state;
      const photos = state.enrollSession.photos.slice(0, -1);
      return {
        enrollSession: {
          ...state.enrollSession,
          photos,
          currentStep: Math.max(0, state.enrollSession.currentStep - 1),
        },
      };
    }),

  setConsentAccepted: (accepted) =>
    set((state) => {
      if (!state.enrollSession) {
        return { enrollSession: { ...emptySession(), consentAccepted: accepted } };
      }
      return {
        enrollSession: { ...state.enrollSession, consentAccepted: accepted },
      };
    }),

  clearEnrollSession: () => set({ enrollSession: null }),

  setPendingInvitations: (invitations: TenantInvitation[]) =>
    set({ pendingInvitations: invitations }),

  removeInvitation: (id) =>
    set((state) => ({
      pendingInvitations: state.pendingInvitations.filter((i) => i.id !== id),
    })),
}));
