/** Standard envelope returned by the Spring Boot backend. */
export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/** Extracts `data` from `{ success, message, data }` when present. */
export function unwrapApiData<T>(payload: unknown): T {
  if (
    payload &&
    typeof payload === 'object' &&
    'success' in payload &&
    'data' in payload
  ) {
    return (payload as ApiEnvelope<T>).data;
  }
  return payload as T;
}
