import { Image } from 'expo-image';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuthTheme } from '@/features/auth/theme';

import type { CapturedFacePhoto } from '../types';

interface FacePhotoPreviewProps {
  photos: CapturedFacePhoto[];
  onRemoveLast?: () => void;
}

export function FacePhotoPreview({ photos, onRemoveLast }: FacePhotoPreviewProps) {
  const theme = useAuthTheme();

  if (photos.length === 0) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Ảnh đã chụp</Text>
        {onRemoveLast && (
          <TouchableOpacity onPress={onRemoveLast} hitSlop={8}>
            <Text style={[styles.remove, { color: theme.error }]}>Xóa ảnh cuối</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {photos.map((photo, index) => (
          <View key={`${photo.uri}-${index}`} style={styles.thumbWrap}>
            <Image source={{ uri: photo.uri }} style={styles.thumb} contentFit="cover" />
            <View style={[styles.badge, { backgroundColor: theme.primary }]}>
              <Text style={styles.badgeText}>{index + 1}</Text>
            </View>
            <Text style={[styles.score, { color: theme.success }]}>
              {(photo.quality.score * 100).toFixed(0)}%
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 14, fontWeight: '600' },
  remove: { fontSize: 13, fontWeight: '600' },
  row: { gap: 10, paddingVertical: 4 },
  thumbWrap: { position: 'relative' },
  thumb: { width: 72, height: 96, borderRadius: 12 },
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  score: { fontSize: 11, textAlign: 'center', marginTop: 4, fontWeight: '600' },
});
