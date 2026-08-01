import { useLocalSearchParams } from 'expo-router';

import { AuthGate } from '@/features/auth/components/AuthGate';
import { RandomCheckResult } from '@/features/random-check/components/RandomCheckResult';
import type { RandomCheckMode } from '@/features/random-check/types/random-check.type';

export default function RandomCheckResultModal() {
  const params = useLocalSearchParams<{
    checkId?: string;
    mode?: string;
    outcome?: string;
    failureReason?: string;
    locationVerified?: string;
    faceVerified?: string;
    livenessVerified?: string;
    score?: string;
    hasPhotoEvidence?: string;
    processing?: string;
  }>();
  const parseOptionalBoolean = (value?: string): boolean | null =>
    value === 'pending' || value === undefined ? null : value === 'true';

  return (
    <AuthGate>
      <RandomCheckResult
        checkId={params.checkId ?? ''}
        mode={(params.mode ?? 'location_only') as RandomCheckMode}
        outcome={params.outcome === 'fail' ? 'fail' : 'pass'}
        failureReason={params.failureReason || null}
        locationVerified={params.locationVerified === 'true'}
        faceVerified={parseOptionalBoolean(params.faceVerified)}
        livenessVerified={parseOptionalBoolean(params.livenessVerified)}
        score={params.score ? Number(params.score) : null}
        hasPhotoEvidence={params.hasPhotoEvidence === 'true'}
        processing={params.processing === 'true'}
      />
    </AuthGate>
  );
}
