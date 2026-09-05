/* eslint-disable import/first */
// Custom entry point (#19, 2026-09-03): register the Firebase Cloud Messaging background
// message handler BEFORE expo-router boots. React Native Firebase requires the background
// handler to be set from the JS entry, outside React, or push messages that arrive while the
// app is backgrounded/killed are dropped and it logs a warning on every launch.
import { registerPushBackgroundHandler } from './src/features/notification/push-background';

registerPushBackgroundHandler();

// Hand off to the normal Expo Router entry (must run after the handler is registered).
import 'expo-router/entry';
