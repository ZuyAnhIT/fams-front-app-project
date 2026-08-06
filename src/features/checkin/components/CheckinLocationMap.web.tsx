import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, radius, spacing } from '@/theme/tokens';

import type { AvailableSite } from '../types/checkin.type';

export function CheckinLocationMap({ site }: { site: AvailableSite }) {
  if (site.site.latitude == null || site.site.longitude == null) return null;
  const url = `https://www.google.com/maps/search/?api=1&query=${site.site.latitude},${site.site.longitude}`;
  return <View style={styles.card}><Text style={styles.title}>Vị trí và vùng chấm công</Text><Text style={styles.text}>Bản đồ tương tác khả dụng trên Android/iOS. Bạn vẫn có thể mở vị trí site trên Google Maps.</Text><Pressable onPress={() => void Linking.openURL(url)} style={styles.button}><Text style={styles.buttonText}>Mở Google Maps</Text></Pressable></View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.xl, borderWidth: 1, borderColor: palette.border, backgroundColor: palette.surface, padding: spacing.lg, gap: spacing.sm },
  title: { color: palette.text, fontSize: 15, fontWeight: '800' },
  text: { color: palette.textMuted, fontSize: 12, lineHeight: 18 },
  button: { minHeight: 42, borderRadius: radius.md, backgroundColor: palette.primarySoft, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: palette.primary, fontWeight: '700' },
});
