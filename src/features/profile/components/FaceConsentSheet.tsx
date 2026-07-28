import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAuthTheme } from '@/features/auth/theme';

import { FACE_CONSENT_VERSION } from '@/features/face/utils/face-quality';

interface FaceConsentSheetProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

const CONSENT_BULLETS = [
  'Dữ liệu xử lý gồm ảnh thử thách người thật và mẫu đặc trưng khuôn mặt (biometric embedding).',
  'Mục đích sử dụng: đăng ký Face ID, xác thực chấm công và các lượt kiểm tra điểm danh được công ty cấu hình.',
  'Hồ sơ đăng ký chỉ có hiệu lực sau khi HR hoặc người có thẩm quyền phê duyệt.',
  'Bạn có thể rút lại đồng ý và yêu cầu thu hồi dữ liệu ngay trong mục Hồ sơ.',
  'Nếu không muốn dùng Face ID, hãy liên hệ HR để được hướng dẫn phương thức chấm công thay thế theo chính sách công ty.',
];

export function FaceConsentSheet({
  visible,
  onClose,
  onConfirm,
  isLoading = false,
}: FaceConsentSheetProps) {
  const theme = useAuthTheme();
  const insets = useSafeAreaInsets();
  const [checked, setChecked] = useState(false);

  const handleClose = () => {
    setChecked(false);
    onClose();
  };

  const handleConfirm = () => {
    if (!checked) return;
    onConfirm();
    setChecked(false);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.modalRoot}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={[styles.overlay, { backgroundColor: theme.overlay }]} onPress={handleClose} />
        <View style={[styles.sheet, { backgroundColor: theme.card, paddingBottom: insets.bottom + 16 }]}>
          <View style={[styles.handle, { backgroundColor: theme.border }]} />
          <Text style={[styles.title, { color: theme.text }]}>Đồng ý sử dụng Face ID</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Vui lòng đọc và xác nhận trước khi đăng ký nhận diện khuôn mặt.
          </Text>

          <ScrollView style={styles.bullets} showsVerticalScrollIndicator={false}>
            {CONSENT_BULLETS.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <Text style={[styles.bulletDot, { color: theme.primary }]}>•</Text>
                <Text style={[styles.bulletText, { color: theme.textSecondary }]}>
                  {item}
                </Text>
              </View>
            ))}
            <Text style={[styles.version, { color: theme.textMuted }]}>
              Phiên bản nội dung hiển thị trên App: v{FACE_CONSENT_VERSION}
            </Text>
          </ScrollView>

          <TouchableOpacity
            style={styles.checkboxRow}
            onPress={() => setChecked((v) => !v)}
            activeOpacity={0.8}
            accessibilityRole="checkbox"
            accessibilityLabel="Đồng ý cho phép sử dụng dữ liệu khuôn mặt theo điều khoản"
            accessibilityState={{ checked }}
          >
            <View
              style={[
                styles.checkbox,
                {
                  borderColor: checked ? theme.primary : theme.border,
                  backgroundColor: checked ? theme.primary : 'transparent',
                },
              ]}
            >
              {checked && <Text style={styles.checkmark}>✓</Text>}
            </View>
            <Text style={[styles.checkboxLabel, { color: theme.text }]}>
              Tôi đã đọc, hiểu và tự nguyện đồng ý cho công ty và hệ thống FAMS xử
              lý dữ liệu khuôn mặt của tôi đúng các mục đích nêu trên.
            </Text>
          </TouchableOpacity>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btnSecondary, { borderColor: theme.border }]}
              onPress={handleClose}
              disabled={isLoading}
            >
              <Text style={[styles.btnSecondaryText, { color: theme.textSecondary }]}>
                Huỷ
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btnPrimary,
                {
                  backgroundColor:
                    checked && !isLoading
                      ? theme.primary
                      : theme.primaryDisabled,
                },
              ]}
              onPress={handleConfirm}
              disabled={!checked || isLoading}
            >
              <Text style={styles.btnPrimaryText}>
                {isLoading ? 'Đang lưu...' : 'Đồng ý & Tiếp tục'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: { flex: 1, justifyContent: 'flex-end' },
  overlay: { ...StyleSheet.absoluteFillObject },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    maxHeight: '85%',
  },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 6 },
  subtitle: { fontSize: 14, lineHeight: 20, marginBottom: 16 },
  bullets: { maxHeight: 180, marginBottom: 16 },
  bulletRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  bulletDot: { fontSize: 16, lineHeight: 20 },
  bulletText: { flex: 1, fontSize: 14, lineHeight: 20 },
  version: { fontSize: 12, marginTop: 4 },
  checkboxRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', marginBottom: 20 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: '700' },
  checkboxLabel: { flex: 1, fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: 12 },
  btnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnSecondaryText: { fontSize: 15, fontWeight: '600' },
  btnPrimary: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
