import { StyleSheet, Text, View } from 'react-native';

import { useAuthTheme } from '@/features/auth/theme';

import type { TenantInvitation } from '../types/Profile';
import { formatInvitationExpiry, isInvitationExpired } from '../utils/profile.utils';

interface InvitationCardProps {
  invitation: TenantInvitation;
}

export function InvitationCard({ invitation }: InvitationCardProps) {
  const theme = useAuthTheme();
  const expired = isInvitationExpired(invitation);

  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.borderLight }]}>
      <View style={styles.header}>
        <Text style={styles.icon}>✉️</Text>
        <View style={styles.texts}>
          <Text style={[styles.title, { color: theme.text }]}>Lời mời tham gia</Text>
          <Text style={[styles.tenant, { color: theme.primary }]}>{invitation.tenant_name}</Text>
        </View>
      </View>

      <Text style={[styles.meta, { color: theme.textSecondary }]}>
        Mời bởi: {invitation.invited_by_name} · Vai trò: {invitation.role}
      </Text>
      {invitation.message && (
        <Text style={[styles.message, { color: theme.textSecondary }]}>{invitation.message}</Text>
      )}
      <Text style={[styles.expiry, { color: expired ? theme.error : theme.textMuted }]}>
        {expired ? 'Đã hết hạn' : `Hết hạn: ${formatInvitationExpiry(invitation.expires_at)}`}
      </Text>

      <View style={[styles.pendingNotice, { borderColor: theme.border }]}>
        <Text style={[styles.pendingNoticeText, { color: theme.textMuted }]}>
          Chức năng chấp nhận/từ chối đang chờ cập nhật
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 16,
    gap: 8,
    borderWidth: 1,
  },
  header: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  icon: { fontSize: 24 },
  texts: { flex: 1 },
  title: { fontSize: 13, fontWeight: '600' },
  tenant: { fontSize: 16, fontWeight: '700', marginTop: 2 },
  meta: { fontSize: 13 },
  message: { fontSize: 13, lineHeight: 18 },
  expiry: { fontSize: 12, fontWeight: '500' },
  pendingNotice: {
    marginTop: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  pendingNoticeText: { fontSize: 13, fontWeight: '500' },
});
