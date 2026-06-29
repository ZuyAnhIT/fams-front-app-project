import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useAuthTheme } from '@/features/auth/theme';

import type { TenantInvitation } from '../types';
import { formatInvitationExpiry, isInvitationExpired } from '../utils/profile.utils';

interface InvitationCardProps {
  invitation: TenantInvitation;
  onAccept: (id: string) => void;
  onDecline: (id: string) => void;
  isAccepting?: boolean;
  isDeclining?: boolean;
}

export function InvitationCard({
  invitation,
  onAccept,
  onDecline,
  isAccepting,
  isDeclining,
}: InvitationCardProps) {
  const theme = useAuthTheme();
  const expired = isInvitationExpired(invitation);
  const busy = isAccepting || isDeclining;

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

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.btnSecondary, { borderColor: theme.border }]}
          onPress={() => onDecline(invitation.id)}
          disabled={busy || expired}
        >
          {isDeclining ? (
            <ActivityIndicator size="small" color={theme.textMuted} />
          ) : (
            <Text style={[styles.btnSecondaryText, { color: theme.textSecondary }]}>Từ chối</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.btnPrimary,
            { backgroundColor: expired ? theme.primaryDisabled : theme.primary },
          ]}
          onPress={() => onAccept(invitation.id)}
          disabled={busy || expired}
        >
          {isAccepting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.btnPrimaryText}>Chấp nhận</Text>
          )}
        </TouchableOpacity>
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
  actions: { flexDirection: 'row', gap: 10, marginTop: 8 },
  btnSecondary: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnSecondaryText: { fontSize: 14, fontWeight: '600' },
  btnPrimary: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
