import { useLocalSearchParams } from 'expo-router';
import { Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text>Chi tiết phân công</Text>
      <Text style={{ marginTop: 8, color: '#64748B' }}>ID: {id}</Text>
    </SafeAreaView>
  );
}
