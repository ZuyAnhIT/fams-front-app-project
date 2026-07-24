import { Ionicons } from '@expo/vector-icons';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { z } from 'zod';

import { formatCountdown } from '../utils';
import { useRegister } from '../hooks/use-register';
import { useAuthTheme } from '../theme';
import { OTPInput } from './OTPInput';

type RegisterMethod = 'email' | 'phone';

const registerSchema = z
  .object({
    full_name: z.string().trim().min(2, 'Họ tên ít nhất 2 ký tự').max(100, 'Họ tên quá dài'),
    identifier: z.string().trim().min(1, 'Vui lòng nhập email hoặc số điện thoại'),
    password: z
      .string()
      .min(8, 'Mật khẩu ít nhất 8 ký tự')
      .regex(/[A-Z]/, 'Phải có ít nhất 1 chữ hoa')
      .regex(/[a-z]/, 'Phải có ít nhất 1 chữ thường')
      .regex(/[0-9]/, 'Phải có ít nhất 1 chữ số'),
    confirm_password: z.string().min(1, 'Vui lòng xác nhận mật khẩu'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Mật khẩu xác nhận không khớp',
    path: ['confirm_password'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;
const PHONE_PATTERN = /^\+?[0-9]{8,15}$/;
const OTP_EXPIRY_SECONDS = 5 * 60;

export function RegisterForm() {
  const [method, setMethod] = useState<RegisterMethod>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const theme = useAuthTheme();
  const {
    register,
    sendPhoneOTP,
    isPending,
    isSendingOTP,
    error,
    otpError,
  } = useRegister();

  const {
    control,
    getValues,
    handleSubmit,
    resetField,
    setError,
    trigger,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      full_name: '',
      identifier: '',
      password: '',
      confirm_password: '',
    },
  });

  const stopTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = null;
  };

  const startCountdown = () => {
    stopTimer();
    setCountdown(OTP_EXPIRY_SECONDS);
    timerRef.current = setInterval(() => {
      setCountdown((previous) => {
        if (previous <= 1) {
          stopTimer();
          return 0;
        }
        return previous - 1;
      });
    }, 1000);
  };

  useEffect(() => stopTimer, []);

  const switchMethod = (nextMethod: RegisterMethod) => {
    if (nextMethod === method) return;
    setMethod(nextMethod);
    setOtpSent(false);
    setOtp('');
    setCountdown(0);
    setLocalError(null);
    stopTimer();
    resetField('identifier');
  };

  const validateIdentifier = (identifier: string): boolean => {
    if (method === 'email') {
      if (!z.string().email().safeParse(identifier).success) {
        setError('identifier', { message: 'Email không hợp lệ' });
        return false;
      }
      return true;
    }

    const compact = identifier.replace(/[\s().-]/g, '');
    if (!PHONE_PATTERN.test(compact)) {
      setError('identifier', { message: 'Số điện thoại phải có 8–15 chữ số' });
      return false;
    }
    return true;
  };

  const handleSendOTP = async () => {
    setLocalError(null);
    const formValid = await trigger([
      'full_name',
      'identifier',
      'password',
      'confirm_password',
    ]);
    const phone = getValues('identifier').trim();
    if (!formValid || !validateIdentifier(phone)) return;

    try {
      await sendPhoneOTP({ phone });
      setOtpSent(true);
      setOtp('');
      startCountdown();
    } catch {
      // React Query exposes the translated error through otpError.
    }
  };

  const onSubmit = (data: RegisterFormData) => {
    setLocalError(null);
    if (!validateIdentifier(data.identifier)) return;

    if (method === 'email') {
      register({
        email: data.identifier,
        full_name: data.full_name,
        password: data.password,
      });
      return;
    }

    if (!otpSent) {
      setLocalError('Vui lòng gửi mã OTP trước khi tạo tài khoản.');
      return;
    }
    if (!/^\d{6}$/.test(otp)) {
      setLocalError('Mã OTP phải gồm đúng 6 chữ số.');
      return;
    }
    register({
      phone: data.identifier,
      full_name: data.full_name,
      password: data.password,
      otp_code: otp,
    });
  };

  const busy = isPending || isSendingOTP;

  return (
    <View style={styles.container}>
      <View style={styles.methodTabs}>
        {(['email', 'phone'] as RegisterMethod[]).map((item) => (
          <TouchableOpacity
            key={item}
            style={[styles.methodTab, method === item && styles.methodTabActive]}
            onPress={() => switchMethod(item)}
            disabled={busy}
            accessibilityRole="tab"
            accessibilityState={{ selected: method === item }}
          >
            <Ionicons
              name={item === 'email' ? 'mail-outline' : 'call-outline'}
              size={17}
              color={method === item ? theme.primary : theme.textSecondary}
            />
            <Text style={[styles.methodText, method === item && { color: theme.primary }]}>
              {item === 'email' ? 'Bằng email' : 'Bằng số điện thoại'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>Họ và tên</Text>
        <Controller
          control={control}
          name="full_name"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={[styles.input, errors.full_name && styles.inputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              editable={!busy}
              placeholder="Nguyễn Văn A"
              placeholderTextColor="#94A3B8"
              autoCapitalize="words"
              accessibilityLabel="Họ và tên"
            />
          )}
        />
        {errors.full_name && <Text style={styles.fieldError}>{errors.full_name.message}</Text>}
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{method === 'email' ? 'Email' : 'Số điện thoại'}</Text>
        <Controller
          control={control}
          name="identifier"
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={[styles.input, errors.identifier && styles.inputError]}
              value={value}
              onChangeText={(nextValue) => {
                onChange(nextValue);
                if (method === 'phone' && otpSent) {
                  setOtpSent(false);
                  setOtp('');
                  stopTimer();
                }
              }}
              onBlur={onBlur}
              editable={!busy}
              placeholder={method === 'email' ? 'nguyen.van.a@company.com' : '0912345678'}
              placeholderTextColor="#94A3B8"
              keyboardType={method === 'email' ? 'email-address' : 'phone-pad'}
              autoCapitalize="none"
              autoCorrect={false}
              accessibilityLabel={method === 'email' ? 'Email' : 'Số điện thoại'}
            />
          )}
        />
        {errors.identifier && <Text style={styles.fieldError}>{errors.identifier.message}</Text>}
      </View>

      <PasswordField
        control={control}
        name="password"
        label="Mật khẩu"
        visible={showPassword}
        onToggle={() => setShowPassword((value) => !value)}
        error={errors.password?.message}
        editable={!busy}
      />
      <PasswordField
        control={control}
        name="confirm_password"
        label="Xác nhận mật khẩu"
        visible={showConfirm}
        onToggle={() => setShowConfirm((value) => !value)}
        error={errors.confirm_password?.message}
        editable={!busy}
      />

      {method === 'phone' && otpSent && (
        <View style={styles.otpSection}>
          <Text style={styles.label}>Mã OTP đăng ký</Text>
          <OTPInput value={otp} onChange={setOtp} hasError={!!error} autoFocus />
          {countdown > 0 ? (
            <Text style={styles.countdownText}>
              Mã có hiệu lực trong {formatCountdown(countdown)}
            </Text>
          ) : (
            <TouchableOpacity onPress={handleSendOTP} disabled={busy}>
              <Text style={[styles.resendText, { color: theme.primary }]}>Gửi lại mã OTP</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {(localError || error || otpError) && (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{localError ?? error ?? otpError}</Text>
        </View>
      )}

      {method === 'phone' && !otpSent ? (
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.primary }, busy && styles.disabled]}
          onPress={handleSendOTP}
          disabled={busy}
        >
          {isSendingOTP ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Gửi OTP</Text>}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: theme.primary }, busy && styles.disabled]}
          onPress={handleSubmit(onSubmit)}
          disabled={busy}
        >
          {isPending ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Tạo tài khoản</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}

type PasswordFieldProps = {
  control: ReturnType<typeof useForm<RegisterFormData>>['control'];
  name: 'password' | 'confirm_password';
  label: string;
  visible: boolean;
  onToggle: () => void;
  error?: string;
  editable: boolean;
};

function PasswordField({ control, name, label, visible, onToggle, error, editable }: PasswordFieldProps) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.passwordWrapper}>
        <Controller
          control={control}
          name={name}
          render={({ field: { value, onChange, onBlur } }) => (
            <TextInput
              style={[styles.passwordInput, error && styles.inputError]}
              value={value}
              onChangeText={onChange}
              onBlur={onBlur}
              editable={editable}
              placeholder={name === 'password' ? 'Ít nhất 8 ký tự, hoa, thường và số' : 'Nhập lại mật khẩu'}
              placeholderTextColor="#94A3B8"
              secureTextEntry={!visible}
              autoCapitalize="none"
              accessibilityLabel={label}
            />
          )}
        />
        <TouchableOpacity style={styles.eyeButton} onPress={onToggle} accessibilityLabel={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}>
          <Ionicons name={visible ? 'eye-off-outline' : 'eye-outline'} size={20} color="#64748B" />
        </TouchableOpacity>
      </View>
      {error && <Text style={styles.fieldError}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 14 },
  methodTabs: { flexDirection: 'row', gap: 8, padding: 4, borderRadius: 12, backgroundColor: '#F1F5F9' },
  methodTab: { flex: 1, minHeight: 42, borderRadius: 9, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  methodTabActive: { backgroundColor: '#FFFFFF' },
  methodText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  fieldGroup: { gap: 6 },
  label: { fontSize: 14, fontWeight: '600', color: '#1E293B' },
  input: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: '#1E293B', backgroundColor: '#F8FAFC' },
  inputError: { borderColor: '#EF4444' },
  fieldError: { fontSize: 12, color: '#EF4444' },
  passwordWrapper: { position: 'relative', justifyContent: 'center' },
  passwordInput: { borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 12, paddingHorizontal: 14, paddingRight: 48, paddingVertical: 13, fontSize: 15, color: '#1E293B', backgroundColor: '#F8FAFC' },
  eyeButton: { position: 'absolute', right: 8, padding: 8 },
  otpSection: { gap: 10 },
  countdownText: { textAlign: 'center', color: '#64748B', fontSize: 13 },
  resendText: { textAlign: 'center', fontSize: 14, fontWeight: '700' },
  errorBanner: { backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA', borderRadius: 10, padding: 12 },
  errorText: { fontSize: 13, color: '#DC2626' },
  primaryButton: { borderRadius: 12, minHeight: 50, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  disabled: { opacity: 0.6 },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
