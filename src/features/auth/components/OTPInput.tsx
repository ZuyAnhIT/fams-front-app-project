import { useEffect, useRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

interface OTPInputProps {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
}

/**
 * Renders `length` individual TextInput boxes for OTP entry.
 *
 * Features:
 * - Auto-advances focus to the next box on digit entry
 * - Backspace on an empty box moves focus to the previous box
 * - Handles paste: splits a pasted string of digits across all boxes
 */
export function OTPInput({
  value,
  onChange,
  length = 6,
  disabled = false,
  hasError = false,
  autoFocus = false,
}: OTPInputProps) {
  const refs = useRef<(TextInput | null)[]>(Array(length).fill(null));

  // Focus the first empty box when autoFocus is set
  useEffect(() => {
    if (autoFocus) {
      const firstEmptyIndex = Math.min(value.length, length - 1);
      refs.current[firstEmptyIndex]?.focus();
    }
  }, [autoFocus, length, value.length]);

  const handleChangeText = (text: string, index: number) => {
    // Handle paste: if user pastes multiple digits at once
    if (text.length > 1) {
      const digits = text.replace(/\D/g, '').slice(0, length);
      onChange(digits);
      const nextIndex = Math.min(digits.length, length - 1);
      refs.current[nextIndex]?.focus();
      return;
    }

    const digit = text.replace(/\D/g, '');
    const chars = value.split('');

    if (digit) {
      chars[index] = digit;
      const next = chars.join('').slice(0, length);
      onChange(next);
      if (index < length - 1) {
        refs.current[index + 1]?.focus();
      }
    } else {
      // Empty text means digit was cleared
      chars[index] = '';
      onChange(chars.join(''));
    }
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !value[index] && index > 0) {
      // Current box empty on backspace → move to previous
      const chars = value.split('');
      chars[index - 1] = '';
      onChange(chars.join(''));
      refs.current[index - 1]?.focus();
    }
  };

  return (
    <View style={styles.row}>
      {Array.from({ length }, (_, i) => (
        <TextInput
          key={i}
          ref={(ref) => {
            refs.current[i] = ref;
          }}
          value={value[i] ?? ''}
          onChangeText={(text) => handleChangeText(text, i)}
          onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
          style={[
            styles.box,
            value[i] && styles.boxFilled,
            hasError && styles.boxError,
            disabled && styles.boxDisabled,
          ]}
          maxLength={6}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          textAlign="center"
          editable={!disabled}
          selectTextOnFocus
          caretHidden
          accessibilityLabel={`Chữ số OTP thứ ${i + 1}`}
          accessibilityState={{ disabled }}
        />
      ))}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  box: {
    flex: 1,
    minWidth: 36,
    maxWidth: 48,
    height: 54,
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    fontSize: 22,
    fontWeight: '700',
    color: '#1E293B',
    backgroundColor: '#F8FAFC',
  },
  boxFilled: {
    borderColor: '#2563EB',
    backgroundColor: '#EFF6FF',
  },
  boxError: {
    borderColor: '#EF4444',
    backgroundColor: '#FEF2F2',
  },
  boxDisabled: {
    opacity: 0.5,
  },
});
