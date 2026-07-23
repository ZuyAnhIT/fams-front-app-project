import { useLocalSearchParams } from 'expo-router';

import { AuthGate } from '@/features/auth/components/AuthGate';
import { CheckinResult } from '@/features/checkin/components/CheckinResult';

export default function CheckinResultModal() {
  const { checkinId } = useLocalSearchParams<{ checkinId: string }>();
  return (
    <AuthGate>
      <CheckinResult checkinId={checkinId} />
    </AuthGate>
  );
}
