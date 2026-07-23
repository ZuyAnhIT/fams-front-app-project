/**
 * `expo-secure-store`'s web implementation is a literal empty stub (see
 * node_modules/expo-secure-store/src/ExpoSecureStore.web.ts) — the package has
 * no web support at all, so calling setItemAsync/getItemAsync on web throws
 * "is not a function" and breaks login. localStorage is the standard fallback
 * every SecureStore-based RN app uses for its web build; it's no less secure
 * than what any other web app already does for auth tokens in the browser.
 */
export async function getItemAsync(key: string): Promise<string | null> {
  return window.localStorage.getItem(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  window.localStorage.setItem(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  window.localStorage.removeItem(key);
}
