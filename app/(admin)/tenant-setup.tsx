import { Redirect } from 'expo-router';

/**
 * Tenant creation is a back-office workflow and is intentionally Web-only.
 * Keep this compatibility route so old bookmarks/deep-links fail closed
 * instead of exposing the legacy mobile wizard guarded by a coarse role name.
 */
export default function TenantSetupCompatibilityRoute() {
  return <Redirect href="/(tabs)/home" />;
}
