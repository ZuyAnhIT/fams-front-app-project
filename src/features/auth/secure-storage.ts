import * as SecureStore from 'expo-secure-store';

/**
 * Thin re-export so `./secure-storage` resolves to the OS keychain/keystore on
 * native and to `secure-storage.web.ts` on web (see that file for why).
 */
export const getItemAsync = SecureStore.getItemAsync;
export const setItemAsync = SecureStore.setItemAsync;
export const deleteItemAsync = SecureStore.deleteItemAsync;
