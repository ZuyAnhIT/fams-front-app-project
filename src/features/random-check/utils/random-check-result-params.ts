import type { RandomCheckMode } from '../types/random-check.type';

type SearchParam = string | string[] | undefined;

export interface ParsedRandomCheckResultParams {
  checkId: string;
  mode: RandomCheckMode;
  outcome: 'pass' | 'fail';
  failureReason: string | null;
  locationVerified: boolean;
  faceVerified: boolean | null;
  livenessVerified: boolean | null;
  score: number | null;
  hasPhotoEvidence: boolean;
  processing: boolean;
}

const MODES = new Set<RandomCheckMode>([
  'location_only',
  'location_face',
  'location_face_liveness',
]);

function single(value: SearchParam): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function requiredBoolean(value: SearchParam): boolean | null {
  const raw = single(value);
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return null;
}

function verification(value: SearchParam): boolean | null | undefined {
  const raw = single(value);
  if (raw === 'pending' || raw === undefined) return null;
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  return undefined;
}

/** Rejects incomplete/tampered modal params so the UI can never fabricate a PASS result. */
export function parseRandomCheckResultParams(
  params: Record<string, SearchParam>,
): ParsedRandomCheckResultParams | null {
  const checkId = single(params.checkId)?.trim();
  const mode = single(params.mode);
  const outcome = single(params.outcome);
  const locationVerified = requiredBoolean(params.locationVerified);
  const faceVerified = verification(params.faceVerified);
  const livenessVerified = verification(params.livenessVerified);
  const hasPhotoEvidence = requiredBoolean(params.hasPhotoEvidence);
  const processing = requiredBoolean(params.processing);

  if (
    !checkId ||
    !mode ||
    !MODES.has(mode as RandomCheckMode) ||
    (outcome !== 'pass' && outcome !== 'fail') ||
    locationVerified === null ||
    faceVerified === undefined ||
    livenessVerified === undefined ||
    hasPhotoEvidence === null ||
    processing === null
  ) {
    return null;
  }

  const rawScore = single(params.score);
  const parsedScore = rawScore ? Number(rawScore) : null;
  const score = parsedScore !== null && Number.isFinite(parsedScore) && parsedScore >= 0 && parsedScore <= 1
    ? parsedScore
    : null;

  return {
    checkId,
    mode: mode as RandomCheckMode,
    outcome,
    failureReason: single(params.failureReason)?.trim() || null,
    locationVerified,
    faceVerified,
    livenessVerified,
    score,
    hasPhotoEvidence,
    processing,
  };
}
