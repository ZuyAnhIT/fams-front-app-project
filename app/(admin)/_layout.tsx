import { Stack } from 'expo-router';

/** Stack navigator for admin-only screens */
export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />
  );
}
