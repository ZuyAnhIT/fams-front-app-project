import { Stack } from 'expo-router';

/** Stack navigator for all auth screens – no visible header */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
  );
}
