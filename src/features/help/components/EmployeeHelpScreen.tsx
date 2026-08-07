import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ResponsiveContainer } from '@/components/ui/responsive-container';
import { palette, radius, shadows, spacing } from '@/theme/tokens';

interface GuideSection {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  items: string[];
}

const GUIDE_SECTIONS: GuideSection[] = [
  {
    icon: 'business-outline',
    title: 'Trước khi bắt đầu ca',
    items: [
      'Kiểm tra đúng công ty đang thao tác nếu bạn làm việc cho nhiều công ty.',
      'Mở “Nơi làm hôm nay” để xem công trình, ca và thời gian được phép chấm công.',
      'Nếu công trình yêu cầu Face ID, hồ sơ khuôn mặt phải được HR duyệt trước.',
    ],
  },
  {
    icon: 'finger-print-outline',
    title: 'Chấm công đúng cách',
    items: [
      'Bật GPS và Camera, đứng tại vùng công trình rồi kiểm tra vị trí trên bản đồ.',
      'Thực hiện Face ID/liveness đúng hướng dẫn nếu chính sách công trình yêu cầu.',
      'Chờ màn kết quả xác nhận Hợp lệ hoặc Chờ duyệt trước khi đóng ứng dụng.',
      'Khi kết thúc ca, mở lại Chấm công và thực hiện Check-out.',
    ],
  },
  {
    icon: 'scan-outline',
    title: 'Kiểm tra ngẫu nhiên',
    items: [
      'Phản hồi trước thời gian đếm ngược; yêu cầu hết hạn sẽ không được gửi lại từ App.',
      'Cung cấp GPS, ảnh khuôn mặt hoặc liveness đúng mode công ty đã cấu hình.',
      'Nếu mất mạng hoặc thiết bị lỗi, mở “Cần giải thích” để gửi ghi chú và ảnh minh chứng.',
    ],
  },
  {
    icon: 'stats-chart-outline',
    title: 'Kiểm tra công của bạn',
    items: [
      'Lịch sử chấm công hiển thị từng lần vào/ra và trạng thái xử lý.',
      'Bảng công hiển thị tổng giờ, đi muộn, về sớm và OT do Backend tổng hợp.',
      'App không tự sửa hoặc tự tính lại công; dữ liệu chưa đúng cần gửi giải trình để HR xử lý.',
    ],
  },
  {
    icon: 'shield-checkmark-outline',
    title: 'Bảo mật và quyền riêng tư',
    items: [
      'Bạn luôn thấy đầy đủ email, số điện thoại của chính mình; dữ liệu HR xem có thể được che theo quyền.',
      'Ẩn một chức năng chỉ là trải nghiệm giao diện; Backend vẫn kiểm tra quyền và công ty ở mọi API.',
      'Bật xác thực hai lớp và không chia sẻ mã OTP, mã dự phòng hoặc link mời cho người khác.',
      'Khi thu hồi Face ID, ảnh đăng ký gốc và embedding được hệ thống xoá theo policy Backend.',
    ],
  },
];

const TROUBLESHOOTING = [
  ['Không thấy công trình', 'Kiểm tra đúng công ty và phân công hôm nay; nếu vẫn thiếu, liên hệ HR.'],
  ['Không chấm công được', 'Kiểm tra GPS, giờ ca, trạng thái công trình và Face ID đã được duyệt.'],
  ['Không nhận được thông báo', 'Kiểm tra quyền thông báo của điện thoại và hai công tắc trong Cài đặt thông báo.'],
  ['Báo không có quyền', 'Không thử đổi tenantId hoặc gọi lại liên tục; kiểm tra công ty đang chọn và liên hệ quản trị viên.'],
  ['Lỗi có “Mã hỗ trợ”', 'Gửi nguyên mã đó cho đội kỹ thuật để họ trace đúng request trong audit log.'],
] as const;

export function EmployeeHelpScreen() {
  return (
    <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
      <ResponsiveContainer style={styles.content}>
        <View style={styles.intro}>
          <Ionicons name="help-buoy-outline" size={28} color={palette.primary} />
          <View style={styles.introCopy}>
            <Text style={styles.introTitle}>Hướng dẫn dành cho người dùng App</Text>
            <Text style={styles.introText}>
              Các thao tác quản trị nhân viên, tenant, audit log và trạng thái hệ thống được thực hiện trên Web theo quyền Admin/HR.
            </Text>
          </View>
        </View>

        {GUIDE_SECTIONS.map((section) => (
          <View key={section.title} style={styles.card}>
            <View style={styles.sectionHeader}>
              <View style={styles.iconWrap}>
                <Ionicons name={section.icon} size={20} color={palette.primary} />
              </View>
              <Text style={styles.sectionTitle}>{section.title}</Text>
            </View>
            {section.items.map((item) => (
              <View key={item} style={styles.itemRow}>
                <View style={styles.bullet} />
                <Text style={styles.itemText}>{item}</Text>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.card}>
          <View style={styles.sectionHeader}>
            <View style={styles.iconWrap}>
              <Ionicons name="construct-outline" size={20} color={palette.primary} />
            </View>
            <Text style={styles.sectionTitle}>Xử lý sự cố thường gặp</Text>
          </View>
          {TROUBLESHOOTING.map(([question, answer], index) => (
            <View key={question} style={[styles.faq, index > 0 && styles.faqBorder]}>
              <Text style={styles.faqQuestion}>{question}</Text>
              <Text style={styles.faqAnswer}>{answer}</Text>
            </View>
          ))}
        </View>

        <Text style={styles.version}>Hướng dẫn App · cập nhật 06/08/2026</Text>
      </ResponsiveContainer>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  content: { gap: spacing.md },
  intro: {
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.xl,
    backgroundColor: palette.primarySoft,
  },
  introCopy: { flex: 1, gap: 4 },
  introTitle: { color: palette.primary, fontSize: 16, fontWeight: '800' },
  introText: { color: palette.textSecondary, fontSize: 13, lineHeight: 20 },
  card: {
    padding: spacing.lg,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    ...shadows.card,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  iconWrap: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: palette.primarySoft,
  },
  sectionTitle: { flex: 1, color: palette.text, fontSize: 16, fontWeight: '800' },
  itemRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  bullet: { width: 6, height: 6, borderRadius: 3, marginTop: 7, backgroundColor: palette.primary },
  itemText: { flex: 1, color: palette.textSecondary, fontSize: 13, lineHeight: 20 },
  faq: { paddingVertical: spacing.sm },
  faqBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: palette.border, marginTop: spacing.xs },
  faqQuestion: { color: palette.text, fontSize: 14, fontWeight: '700' },
  faqAnswer: { color: palette.textMuted, fontSize: 13, lineHeight: 20, marginTop: 3 },
  version: { color: palette.textMuted, fontSize: 11, textAlign: 'center', marginTop: spacing.sm },
});
