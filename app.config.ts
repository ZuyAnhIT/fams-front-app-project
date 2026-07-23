import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Keep Firebase service files outside source control while still allowing EAS
 * file secrets (or local files) to be injected for native builds.
 */
export default ({ config }: ConfigContext): ExpoConfig => {
  const androidGoogleServicesFile =
    process.env.EXPO_ANDROID_GOOGLE_SERVICES_FILE?.trim() ||
    './google-services.json';
  const iosGoogleServicesFile =
    process.env.EXPO_IOS_GOOGLE_SERVICES_FILE?.trim() ||
    './GoogleService-Info.plist';
  const hasAndroidGoogleServicesFile = existsSync(
    resolve(process.cwd(), androidGoogleServicesFile),
  );
  const hasIosGoogleServicesFile = existsSync(
    resolve(process.cwd(), iosGoogleServicesFile),
  );
  const { googleServicesFile: _ignoredAndroid, ...androidConfig } =
    config.android ?? {};
  const { googleServicesFile: _ignored, ...iosConfig } = config.ios ?? {};

  return {
    ...config,
    name: config.name ?? 'FAMS',
    slug: config.slug ?? 'fams-front-app-project',
    android: {
      ...androidConfig,
      ...(hasAndroidGoogleServicesFile
        ? { googleServicesFile: androidGoogleServicesFile }
        : {}),
    },
    ios: {
      ...iosConfig,
      ...(hasIosGoogleServicesFile
        ? { googleServicesFile: iosGoogleServicesFile }
        : {}),
    },
  };
};
