import { Redirect } from 'expo-router';

import { AuthGate } from '@/features/auth/components/AuthGate';

export default function RandomCheckResultModal() {
  return (
    <AuthGate>
      <Redirect href="/(tabs)/home" />
    </AuthGate>
  );
}
