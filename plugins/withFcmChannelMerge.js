const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * react-native-firebase_messaging declares default_notification_channel_id with an empty
 * value, while expo-notifications sets it to our channel name. The manifest merger fails
 * on the duplicate. Adding tools:replace="android:value" tells the merger our value wins.
 */
module.exports = function withFcmChannelMerge(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;

    // Ensure xmlns:tools is declared on the root <manifest> element
    manifest.manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const app = manifest.manifest.application?.[0];
    if (!app) return config;

    const metaDataList = app['meta-data'] ?? [];
    const channelMeta = metaDataList.find(
      (m) => m.$?.['android:name'] === 'com.google.firebase.messaging.default_notification_channel_id'
    );

    if (channelMeta) {
      channelMeta.$['tools:replace'] = 'android:value';
    }

    return config;
  });
};
