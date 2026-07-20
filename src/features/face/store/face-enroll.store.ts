import { create } from 'zustand';

import type { CapturedFacePhoto, FaceEnrollActions, FaceEnrollState } from '../types/FaceId';

type FaceEnrollStore = FaceEnrollState & FaceEnrollActions;

const emptySession = () => ({
  photos: [] as CapturedFacePhoto[],
  currentStep: 0,
  consentAccepted: false,
});

export const useFaceEnrollStore = create<FaceEnrollStore>((set) => ({
  enrollSession: null,

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
}));
