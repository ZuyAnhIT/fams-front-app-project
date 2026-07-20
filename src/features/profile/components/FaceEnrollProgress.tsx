import { StyleSheet, Text, View } from 'react-native';

import { useAuthTheme } from '@/features/auth/theme';

import { FACE_MAX_PHOTOS, FACE_MIN_PHOTOS } from '@/features/face/utils/face-quality';

interface FaceEnrollProgressProps {
  current: number;
  total: number;
}

export function FaceEnrollProgress({ current, total }: FaceEnrollProgressProps) {
  const theme = useAuthTheme();
  const progress = Math.min(1, current / total);

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: theme.text }]}>
          Ảnh {current}/{total}
        </Text>
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Cần {FACE_MIN_PHOTOS}–{FACE_MAX_PHOTOS} ảnh
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: theme.borderLight }]}>
        <View
          style={[
            styles.fill,
            { width: `${progress * 100}%`, backgroundColor: theme.primary },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 15, fontWeight: '700' },
  hint: { fontSize: 12 },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
});
