import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { useFaceEnrollStore } from '../store/face-enroll.store';
import { isFaceIdDetectionError } from '../utils/face-id.utils';
import { useCurrentEmployeeId } from './use-current-employee-id';
import { useFaceIdConsent, useFaceIdEnroll, useFaceIdStatus } from './use-face-id';

export type FaceEnrollStep = 'consent' | 'capture' | 'done';

export function useFaceEnroll() {
  const router = useRouter();
  const { employeeId, isLoading: isLoadingEmployeeId } = useCurrentEmployeeId();
  const { faceIdStatus, isLoading: isLoadingStatus } = useFaceIdStatus(employeeId);
  const { saveConsent, isPending: isSavingConsent } = useFaceIdConsent(employeeId);
  const { enroll, isPending: isRegistering } = useFaceIdEnroll(employeeId);

  const startEnrollSession = useFaceEnrollStore((s) => s.startEnrollSession);
  const clearEnrollSession = useFaceEnrollStore((s) => s.clearEnrollSession);
  const enrollSession = useFaceEnrollStore((s) => s.enrollSession);
  const consentAccepted = useFaceEnrollStore((s) => s.enrollSession?.consentAccepted ?? false);
  const setConsentAccepted = useFaceEnrollStore((s) => s.setConsentAccepted);

  const [step, setStep] = useState<FaceEnrollStep>('consent');
  const [consentVisible, setConsentVisible] = useState(false);

  const isLoading = isLoadingEmployeeId || (!!employeeId && isLoadingStatus);

  useEffect(() => {
    startEnrollSession();
    return () => clearEnrollSession();
  }, [startEnrollSession, clearEnrollSession]);

  useEffect(() => {
    if (isLoading || !employeeId) return;
    if (faceIdStatus?.status === 'enrolled') {
      setStep('done');
    } else if (faceIdStatus?.consentGiven || consentAccepted) {
      // API là nguồn sự thật, nhưng consentAccepted (optimistic, face-enroll.store)
      // che khoảng trễ giữa lúc POST /consent thành công và lúc GET status
      // refetch (do invalidateQueries) thực sự phản ánh consentGiven=true —
      // tránh dialog consent bật lại ngay sau khi vừa đồng ý.
      setStep('capture');
    } else {
      setConsentVisible(true);
    }
  }, [faceIdStatus, isLoading, employeeId, consentAccepted]);

  const handleConsentConfirm = useCallback(() => {
    saveConsent(undefined, {
      onSuccess: () => {
        setConsentAccepted(true);
        setConsentVisible(false);
        setStep('capture');
      },
    });
  }, [saveConsent, setConsentAccepted]);

  const handleRegister = useCallback(() => {
    const photos = enrollSession?.photos ?? [];
    if (photos.length < 3) return;

    enroll(
      photos.map((p) => ({ uri: p.uri, width: p.width, height: p.height })),
      {
        onSuccess: () => {
          clearEnrollSession();
          setStep('done');
        },
        onError: (error) => {
          // Backend không cho biết ảnh nào lỗi — buộc chụp lại toàn bộ batch.
          if (isFaceIdDetectionError(error)) {
            clearEnrollSession();
            startEnrollSession();
          }
        },
      },
    );
  }, [enrollSession?.photos, enroll, clearEnrollSession, startEnrollSession]);

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
    employeeId,
    isSavingConsent,
    isRegistering,
    handleConsentConfirm,
    handleRegister,
    handleBack,
    goToProfile,
  };
}
