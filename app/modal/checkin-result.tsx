import { useLocalSearchParams } from 'expo-router';

import { CheckinResult } from '@/features/checkin/components/CheckinResult';

export default function CheckinResultModal() {
  const { checkinId } = useLocalSearchParams<{ checkinId: string }>();
  return <CheckinResult checkinId={checkinId} />;
}
