import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { Site } from '../types/Site';
import { SITE_STATUS_LABELS } from '../utils/site.utils';

const STATUS_COLORS: Record<Site['status'], { bg: string; text: string }> = {
  active: { bg: '#DCFCE7', text: '#15803D' },
  inactive: { bg: '#F1F5F9', text: '#64748B' },
};

export interface SiteListItemProps {
  site: Site;
  onPress: (site: Site) => void;
}

export function SiteListItem({ site, onPress }: SiteListItemProps) {
  const statusColor = STATUS_COLORS[site.status];

  return (
    <Pressable
      style={styles.card}
      onPress={() => onPress(site)}
      accessibilityRole="button"
      accessibilityLabel={`Công trình ${site.name}`}
    >
      <View style={styles.header}>
        <Text style={styles.code}>{site.code ?? '—'}</Text>
        <View style={[styles.badge, { backgroundColor: statusColor.bg }]}>
          <Text style={[styles.badgeText, { color: statusColor.text }]}>
            {SITE_STATUS_LABELS[site.status]}
          </Text>
        </View>
      </View>
      <Text style={styles.name}>{site.name}</Text>
      {!!site.address && (
        <Text style={styles.address} numberOfLines={1}>
          {site.address}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginVertical: 6,
    gap: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#E2E8F0',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  code: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  badge: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  name: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  address: {
    fontSize: 13,
    color: '#475569',
  },
});
