import { SafeAreaView } from 'react-native-safe-area-context';

import { NotificationList } from '@/features/notification/components/NotificationList';

export default function NotificationScreen() {
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1 }}>
      <NotificationList />
    </SafeAreaView>
  );
}
