import { Ionicons } from '@expo/vector-icons';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuthTheme } from '../theme';
import { useGoogleLogin } from '../hooks/use-google-login';
import { shadows } from '@/theme/tokens';

interface GoogleSignInButtonProps {
  disabled?: boolean;
}

export function GoogleSignInButton({ disabled }: GoogleSignInButtonProps) {
  const theme = useAuthTheme();
  const { signInWithGoogle, isReady, isPending, error } = useGoogleLogin();

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: theme.card,
            borderColor: theme.border,
          },
          (disabled || !isReady || isPending) && styles.buttonDisabled,
        ]}
        onPress={signInWithGoogle}
        disabled={disabled || !isReady || isPending}
        activeOpacity={0.85}
      >
        {isPending ? (
          <ActivityIndicator color={theme.textSecondary} size="small" />
        ) : (
          <>
            <Ionicons name="logo-google" size={18} color="#EA4335" />
            <Text style={[styles.label, { color: theme.text }]}>
              Đăng nhập bằng Google
            </Text>
          </>
        )}
      </TouchableOpacity>

      {error && (
        <View
          style={[
            styles.errorBanner,
            { backgroundColor: theme.errorBg, borderColor: theme.errorBorder },
          ]}
        >
          <Text style={[styles.errorText, { color: theme.error }]}>{error}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 14,
    ...shadows.subtle,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  errorBanner: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  errorText: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
  },
});
