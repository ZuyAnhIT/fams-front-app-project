import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import type { ConfigContext, ExpoConfig } from 'expo/config';

const AUTH_LINK_PATHS = ['/reset-password', '/verify-email'] as const;

function getPublicLinkHost(): string | null {
  const value = process.env.EXPO_PUBLIC_APP_URL?.trim();
  if (!value) return null;

  const url = new URL(value);
  if (url.protocol !== 'https:') {
    throw new Error('EXPO_PUBLIC_APP_URL must use HTTPS for App Links/Universal Links.');
  }
  if (url.pathname !== '/' || url.search || url.hash || url.port) {
    throw new Error('EXPO_PUBLIC_APP_URL must be an HTTPS origin without path, query, hash, or port.');
  }

  return url.hostname;
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function configureGoogleIosUrlScheme(
  plugins: ExpoConfig['plugins'],
): ExpoConfig['plugins'] {
  const iosUrlScheme = process.env.EXPO_PUBLIC_IOS_GOOGLE_URL_SCHEME?.trim();
  if (!iosUrlScheme) return plugins;

  return plugins?.map((plugin) => {
    if (!Array.isArray(plugin) || plugin[0] !== '@react-native-google-signin/google-signin') {
      return plugin;
    }

    const options =
      typeof plugin[1] === 'object' && plugin[1] !== null ? plugin[1] : {};
    return [plugin[0], { ...options, iosUrlScheme }];
  });
}

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
  const publicLinkHost = getPublicLinkHost();
  const backgroundModes = Array.isArray(iosConfig.infoPlist?.UIBackgroundModes)
    ? (iosConfig.infoPlist.UIBackgroundModes as string[])
    : [];
  const authIntentFilter = publicLinkHost
    ? {
        action: 'VIEW' as const,
        autoVerify: true,
        data: AUTH_LINK_PATHS.map((pathPrefix) => ({
          scheme: 'https',
          host: publicLinkHost,
          pathPrefix,
        })),
        category: ['BROWSABLE' as const, 'DEFAULT' as const],
      }
    : null;

  return {
    ...config,
    name: config.name ?? 'FAMS',
    slug: config.slug ?? 'fams-front-app-project',
    plugins: configureGoogleIosUrlScheme(config.plugins),
    android: {
      ...androidConfig,
      ...(authIntentFilter
        ? {
            intentFilters: [
              ...(androidConfig.intentFilters ?? []),
              authIntentFilter,
            ],
          }
        : {}),
      ...(hasAndroidGoogleServicesFile
        ? { googleServicesFile: androidGoogleServicesFile }
        : {}),
    },
    ios: {
      ...iosConfig,
      infoPlist: {
        ...iosConfig.infoPlist,
        // Firebase Phone Auth prefers silent APNs verification on iOS and
        // falls back to reCAPTCHA when APNs is unavailable.
        UIBackgroundModes: unique([
          ...backgroundModes,
          'fetch',
          'remote-notification',
        ]),
      },
      ...(publicLinkHost
        ? {
            associatedDomains: unique([
              ...(iosConfig.associatedDomains ?? []),
              `applinks:${publicLinkHost}`,
            ]),
          }
        : {}),
      ...(hasIosGoogleServicesFile
        ? { googleServicesFile: iosGoogleServicesFile }
        : {}),
    },
  };
};
