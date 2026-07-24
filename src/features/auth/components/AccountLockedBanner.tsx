import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { formatLockRemaining } from '../utils';
import { useAuthTheme } from '../theme';

interface AccountLockedBannerProps {
  lockedUntil?: string;
  message?: string;
  onResetPassword: () => void;
}

/**
 * Prominent banner shown when login fails due to account lockout.
 * Shows countdown when locked_until is known.
 */
export function AccountLockedBanner({
  lockedUntil,
  message,
  onResetPassword,
}: AccountLockedBannerProps) {
  const theme = useAuthTheme();
  const [remaining, setRemaining] = useState('');

  useEffect(() => {
    if (!lockedUntil) return;

    const tick = () => setRemaining(formatLockRemaining(lockedUntil));
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  if (!message && !lockedUntil) return null;

  const timeLabel = lockedUntil
    ? new Date(lockedUntil).toLocaleString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : null;

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: theme.errorBg, borderColor: theme.errorBorder },
      ]}
    >
      <Ionicons name="lock-closed-outline" size={22} color={theme.error} style={styles.icon} />
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.error }]}>
          Tài khoản tạm thời bị khóa
        </Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>
          {message ??
            'Bạn đã nhập sai thông tin đăng nhập quá nhiều lần. Tài khoản bị khóa trong 1 giờ.'}
        </Text>
        {timeLabel && (
          <Text style={[styles.time, { color: theme.textSecondary }]}>
            Tự động mở khóa lúc <Text style={styles.bold}>{timeLabel}</Text>
            {remaining ? ` — còn ${remaining}` : ''}.
          </Text>
        )}
        <Text style={[styles.hint, { color: theme.textMuted }]}>
          Nếu tài khoản có email, hãy đặt lại mật khẩu để mở khóa ngay mà không
          cần chờ hết thời gian.
        </Text>
        <TouchableOpacity
          style={[styles.resetButton, { backgroundColor: theme.primary }]}
          onPress={onResetPassword}
          accessibilityRole="button"
          accessibilityLabel="Đặt lại mật khẩu để mở khóa tài khoản"
          activeOpacity={0.85}
        >
          <Ionicons name="key-outline" size={17} color="#FFFFFF" />
          <Text style={styles.resetButtonText}>Đặt lại mật khẩu để mở khóa ngay</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
  },
  icon: { marginTop: 2 },
  content: {
    flex: 1,
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
  },
  body: {
    fontSize: 13,
    lineHeight: 20,
  },
  time: {
    fontSize: 13,
    lineHeight: 20,
  },
  bold: {
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
  },
  resetButton: {
    minHeight: 44,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 2,
  },
  resetButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },
});
