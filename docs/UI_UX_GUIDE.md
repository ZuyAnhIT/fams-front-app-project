# FAMS UI/UX Guide

Tài liệu này là nguồn tham chiếu cho giao diện sau đợt chuẩn hóa ngày 2026-07-23. Mục tiêu là giữ trải nghiệm nhất quán giữa iOS, Android và web, đồng thời không hiển thị tùy chọn mà frontend chưa thực thi.

## 1. Nguyên tắc sản phẩm

1. Mỗi màn chỉ có một hành động chính nổi bật.
2. Hành động thay đổi trạng thái quan trọng phải có xác nhận rõ ràng.
3. Không hiển thị placeholder, công cụ test hoặc ghi chú kỹ thuật cho người dùng.
4. Loading, empty, forbidden và error phải có nội dung hướng dẫn tiếp theo.
5. Màn con và modal luôn có nút quay lại hoặc đóng hiển thị rõ.
6. Tùy chọn cấu hình chỉ được hiển thị khi frontend và backend đều hỗ trợ đầy đủ.

## 2. Design tokens

Toàn bộ giao diện mới dùng `src/theme/tokens.ts`:

- `palette`: màu nền, surface, text, border và semantic colors.
- `spacing`: thang khoảng cách 4–32 px.
- `radius`: bán kính card/button/chip.
- `layout`: content width và touch target tối thiểu.
- `shadows`: shadow tương thích native và web.

Không thêm mã màu mới trực tiếp trong screen nếu màu đó có thể biểu diễn bằng token hiện có.

## 3. Component nền tảng

| Component | Mục đích |
|---|---|
| `AppButton` | Primary/secondary/danger/ghost button, loading và accessibility |
| `AppHeader` | Title, subtitle, back/close action thống nhất |
| `ResponsiveContainer` | Giới hạn chiều rộng nội dung trên tablet/web |
| `FeedbackState` | Empty/error/forbidden state có icon và CTA |
| `ConfirmDialog` | Xác nhận hành động nhạy cảm trên native và web |
| `ToastProvider` | Phản hồi ngắn sau mutation, có live-region cho screen reader |

## 4. Information architecture

Tab bar chỉ chứa bốn tác vụ cấp cao:

1. Trang chủ
2. Chấm công
3. Thông báo
4. Hồ sơ

Phân công, công trình và lịch sử là màn nghiệp vụ cấp hai, truy cập từ dashboard hoặc hồ sơ. Attendance và Random Check tiếp tục bị ẩn cho đến khi có luồng UI hoàn chỉnh.

## 5. Luồng chấm công

Màn chấm công hiển thị một hành động dựa trên trạng thái:

- Chưa có ca mở: chọn nơi làm việc → `Bắt đầu ca làm việc`.
- Đang có ca mở: ẩn chọn site → `Kết thúc ca làm việc`.
- Check-out cần xác nhận và mô tả rõ rằng hệ thống sẽ lấy GPS.
- Kết quả mở dưới dạng modal có header đóng, chi tiết thời gian/vị trí và form giải trình tối đa 500 ký tự.

Không dùng đồng thời hai nút CHECK IN/CHECK OUT khi chỉ một hành động hợp lệ.

## 6. Responsive và accessibility

- Nội dung form thông thường: tối đa 520–720 px.
- Nội dung admin rộng: tối đa 960 px.
- Touch target mục tiêu: tối thiểu 44 px.
- Mọi icon-only action phải có `accessibilityLabel`.
- Chip/radio/plan phải khai báo trạng thái `selected`.
- Input OTP co giãn từ 36–48 px và hỗ trợ autofill one-time-code.
- Màn có form dài phải dùng ScrollView và keyboard avoidance.

## 7. Trạng thái còn lại

- Cần bộ logo/vector FAMS chính thức để thay icon/splash Expo hiện tại.
- Cần tiếp tục chuyển style cũ của auth, site, assignment và tenant sang token chung.
- Cần kiểm tra thực tế bằng screen reader, font scale 200%, thiết bị 320 px và tablet/web.
- Notification chưa có detail route/reference ID; event đã biết hiện điều hướng đến module liên quan.
- Chỉ bật lại Face Verify bắt buộc, Random Check, đa ngôn ngữ và brand color khi luồng runtime tương ứng đã hoàn chỉnh.

## 8. Checklist khi thêm màn hình

1. Dùng token và component nền tảng.
2. Có header/back/close phù hợp.
3. Có loading/error/empty/forbidden khi cần.
4. Có accessibility label/state cho control.
5. Kiểm tra ở 320 px, mobile phổ biến và web 1440 px.
6. Không để developer note hoặc placeholder trong UI.
7. Chạy `npm run quality` và `npx expo export --platform web`.
