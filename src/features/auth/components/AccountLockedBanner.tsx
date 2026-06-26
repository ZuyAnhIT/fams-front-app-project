import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { formatLockRemaining } from '../utils';
import { useAuthTheme } from '../theme';

interface AccountLockedBannerProps {
  lockedUntil?: string;
  message?: string;
}

/**
 * Prominent banner shown when login fails due to account lockout.
 * Shows countdown when locked_until is known.
 */
export function AccountLockedBanner({ lockedUntil, message }: AccountLockedBannerProps) {
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
    ? new Date(lockedUntil).toLocaleTimeString('vi-VN', {
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
      })
    : null;

  return (
    <View
      style={[
        styles.banner,
        { backgroundColor: theme.errorBg, borderColor: theme.errorBorder },
      ]}
    >
      <Text style={styles.icon}>🔒</Text>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.error }]}>Tài khoản tạm khóa</Text>
        {message ? (
          <Text style={[styles.body, { color: theme.textSecondary }]}>{message}</Text>
        ) : (
          <>
            <Text style={[styles.body, { color: theme.textSecondary }]}>
              Bạn đã nhập sai mật khẩu quá nhiều lần. Tài khoản sẽ được mở khóa lúc{' '}
              <Text style={styles.bold}>{timeLabel}</Text>
              {remaining ? ` (còn ${remaining})` : ''}.
            </Text>
            <Text style={[styles.hint, { color: theme.textMuted }]}>
              Hãy đợi hết thời gian khóa hoặc liên hệ quản trị viên nếu cần hỗ trợ.
            </Text>
          </>
        )}
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
  icon: {
    fontSize: 22,
    marginTop: 2,
  },
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
  bold: {
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    lineHeight: 18,
  },
});
