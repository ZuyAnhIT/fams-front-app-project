import { useLocalSearchParams } from 'expo-router';
import { Text, View } from 'react-native';

export default function AssignmentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
      <Text>Chi tiết phân công</Text>
      <Text style={{ marginTop: 8, color: '#64748B' }}>ID: {id}</Text>
    </View>
  );
}
