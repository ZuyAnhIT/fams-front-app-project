import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { parseFaceIdError } from '../utils/face-id.utils';
import { useCurrentEmployeeId } from './use-current-employee-id';
import { useFaceIdConsent, useFaceIdEnroll, useFaceIdStatus } from './use-face-id';

export type FaceEnrollStep = 'consent' | 'capture' | 'submitted';

export function useFaceEnroll() {
  const router = useRouter();
  const { employeeId, isLoading: isLoadingEmployeeId } = useCurrentEmployeeId();
  const {
    faceIdStatus,
    isLoading: isLoadingStatus,
    isError: isStatusError,
    refetch: refetchStatus,
  } = useFaceIdStatus(employeeId);
  const { saveConsent, isPending: isSavingConsent } = useFaceIdConsent(employeeId);
  const {
    enrollAsync,
    isPending: isRegistering,
    reset: resetEnroll,
  } = useFaceIdEnroll(employeeId);

  const [step, setStep] = useState<FaceEnrollStep>('consent');
  const [consentVisible, setConsentVisible] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const isLoading = isLoadingEmployeeId || (!!employeeId && isLoadingStatus);
  const hasApprovedFace = faceIdStatus?.status === 'enrolled';

  useEffect(() => {
    if (isLoading || !employeeId) return;

    if (faceIdStatus?.reviewStatus === 'pending') {
      setStep('submitted');
      setConsentVisible(false);
    } else if (faceIdStatus?.consentGiven) {
      setStep('capture');
      setConsentVisible(false);
    } else {
      setStep('consent');
      setConsentVisible(true);
    }
  }, [employeeId, faceIdStatus, isLoading]);

  const handleConsentConfirm = useCallback(() => {
    saveConsent(undefined, {
      onSuccess: () => {
        setConsentVisible(false);
        setStep('capture');
      },
    });
  }, [saveConsent]);

  const handleChallengePassed = useCallback(
    async (challengeId: string) => {
      setSubmitError(null);
      try {
        await enrollAsync(challengeId);
        setStep('submitted');
      } catch (error) {
        const message = parseFaceIdError(error);
        setSubmitError(message);
        resetEnroll();
        throw new Error(message);
      }
    },
    [enrollAsync, resetEnroll],
  );

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const goToProfile = useCallback(() => {
    router.replace('/(tabs)/profile');
  }, [router]);

  return {
    step,
    consentVisible,
    isLoading,
    employeeId,
    faceIdStatus,
    hasApprovedFace,
    isStatusError,
    submitError,
    isSavingConsent,
    isRegistering,
    handleConsentConfirm,
    handleChallengePassed,
    handleBack,
    goToProfile,
    refetchStatus,
  };
}
