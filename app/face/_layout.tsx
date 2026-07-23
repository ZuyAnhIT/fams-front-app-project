import { Stack } from 'expo-router';

import { AuthGate } from '@/features/auth/components/AuthGate';

export default function FaceLayout() {
  return (
    <AuthGate>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthGate>
  );
}
