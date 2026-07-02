import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { useProfileStore } from '../store/profileStore';
import { FACE_CONSENT_VERSION } from '../utils/face-quality';
import { useFaceConsent, useFaceRegister, useFaceStatus } from './useFaceRegistration';

export type FaceEnrollStep = 'consent' | 'capture' | 'done';

export function useFaceEnroll() {
  const router = useRouter();
  const { faceStatus, isLoading } = useFaceStatus();
  const { saveConsent, isPending: isSavingConsent } = useFaceConsent();
  const { register, isPending: isRegistering } = useFaceRegister();

  const startEnrollSession = useProfileStore((s) => s.startEnrollSession);
  const clearEnrollSession = useProfileStore((s) => s.clearEnrollSession);
  const enrollSession = useProfileStore((s) => s.enrollSession);

  const [step, setStep] = useState<FaceEnrollStep>('consent');
  const [consentVisible, setConsentVisible] = useState(false);

  useEffect(() => {
    startEnrollSession();
    return () => clearEnrollSession();
  }, [startEnrollSession, clearEnrollSession]);

  useEffect(() => {
    if (!isLoading && faceStatus?.status === 'registered') {
      setStep('done');
    } else if (!isLoading && faceStatus?.consent_given) {
      setStep('capture');
    } else if (!isLoading) {
      setConsentVisible(true);
    }
  }, [faceStatus, isLoading]);

  const handleConsentConfirm = useCallback(() => {
    saveConsent(
      { accepted: true, consent_version: FACE_CONSENT_VERSION },
      {
        onSuccess: () => {
          setConsentVisible(false);
          setStep('capture');
        },
      },
    );
  }, [saveConsent]);

  const handleRegister = useCallback(() => {
    const photos = enrollSession?.photos ?? [];
    if (photos.length < 3) return;

    register(
      photos.map((p) => ({ uri: p.uri, width: p.width, height: p.height })),
      {
        onSuccess: () => {
          clearEnrollSession();
          setStep('done');
        },
      },
    );
  }, [enrollSession?.photos, register, clearEnrollSession]);

  const handleBack = useCallback(() => {
    clearEnrollSession();
    router.back();
  }, [clearEnrollSession, router]);

  const goToProfile = useCallback(() => {
    router.replace('/(tabs)/profile');
  }, [router]);

  return {
    step,
    consentVisible,
    isLoading,
    isSavingConsent,
    isRegistering,
    handleConsentConfirm,
    handleRegister,
    handleBack,
    goToProfile,
  };
}
