import { useLocalSearchParams } from 'expo-router';

import { AuthGate } from '@/features/auth/components/AuthGate';
import { CheckinResult } from '@/features/checkin/components/CheckinResult';

export default function CheckinResultModal() {
  const { checkinId, policy } = useLocalSearchParams<{
    checkinId: string;
    policy?: string;
  }>();
  return (
    <AuthGate>
      <CheckinResult checkinId={checkinId} policy={policy} />
    </AuthGate>
  );
}
