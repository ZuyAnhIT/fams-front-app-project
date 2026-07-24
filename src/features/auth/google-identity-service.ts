/** Native placeholder; web bundling resolves `google-identity-service.web.ts`. */
export async function requestGoogleIdTokenWeb(): Promise<string> {
  throw new Error('Google Identity Services chỉ khả dụng trên web');
}
