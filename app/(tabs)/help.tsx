import { router } from 'expo-router';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppHeader } from '@/components/ui/app-header';
import { EmployeeHelpScreen } from '@/features/help/components/EmployeeHelpScreen';
import { palette } from '@/theme/tokens';

export default function HelpScreen() {
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/profile');
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <AppHeader
        title="Hướng dẫn sử dụng"
        subtitle="Chấm công, Face ID và bảo mật"
        onBack={goBack}
      />
      <EmployeeHelpScreen />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: palette.canvas },
});
