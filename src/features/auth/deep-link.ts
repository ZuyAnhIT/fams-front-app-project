/** Expo Router query params may be repeated, producing an array. Auth links
 * accept exactly one non-empty token and reject ambiguous input. */
export function getAuthLinkToken(
  value: string | string[] | undefined,
): string | null {
  if (typeof value !== 'string') return null;
  const token = value.trim();
  return token.length > 0 ? token : null;
}
