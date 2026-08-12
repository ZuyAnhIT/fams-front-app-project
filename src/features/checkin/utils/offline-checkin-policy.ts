export const OFFLINE_EVIDENCE_TTL_MS = 24 * 60 * 60 * 1000;

export function isOfflineEvidenceExpired(
  checkinAt: string,
  now = Date.now(),
): boolean {
  const timestamp = Date.parse(checkinAt);
  return Number.isFinite(timestamp) && now - timestamp > OFFLINE_EVIDENCE_TTL_MS;
}
