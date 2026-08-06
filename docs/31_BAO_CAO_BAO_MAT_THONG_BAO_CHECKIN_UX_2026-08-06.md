# Báo cáo App — 2FA, thông báo và trải nghiệm chấm công

Ngày kiểm tra: 06/08/2026  
Nguồn đối chiếu: `auth-api.md`, `notification-api.md`, `checkin-management-api.md` của Backend.

## Kết quả theo tính năng

| Tính năng | Kết quả App |
| --- | --- |
| Bật/tắt TOTP 2FA | Đã có đầy đủ setup, QR/manual key, xác nhận mã đầu tiên, bắt buộc xác nhận đã lưu backup codes và xác thực lại khi tắt bằng password/TOTP/backup code. |
| Đăng nhập có 2FA | Đã có nhánh `totpRequired + pendingToken`, màn nhập TOTP hoặc backup code và hoàn tất session/tenant sau xác minh. |
| Audit hành động quan trọng | Backend chịu trách nhiệm ghi audit. App bổ sung UUID `X-Request-Id` cho mọi request để truy vết cùng audit/log Backend. Không dựng màn audit cho nhân viên. |
| Tạo/gửi notification | Là hành vi nội bộ Backend; App không gọi endpoint gửi. |
| Đăng ký thiết bị push | Đã đăng ký FCM token sau đăng nhập/khởi động, cập nhật khi token refresh và hủy token trước logout. |
| Nhận push | Xử lý foreground, background và cold-start; refresh cache và deep-link theo `eventType`/metadata. |
| Hộp thư thông báo | Có badge unread, danh sách phân trang, lọc chưa đọc, pull-to-refresh và deep-link tới nội dung liên quan. |
| Đánh dấu đã đọc | Hỗ trợ một mục, tất cả và nhóm được chọn qua endpoint batch mới. |
| Cài đặt thông báo | Có hai toggle độc lập `inAppEnabled`/`pushEnabled`; danh sách, nhãn và giá trị mặc định lấy từ `GET /me/notification-settings`, không hard-code event type. |
| Lỗi chấm công thân thiện | Ưu tiên `userMessage`, ánh xạ các lỗi nhân viên/site/ca/Face ID/duplicate/network thành hướng dẫn tiếng Việt. |
| Bản đồ site và vị trí | Hiện site marker, polygon geofence, vị trí hiện tại, vòng accuracy và khoảng cách tham khảo; Backend vẫn quyết định hợp lệ. |

## Quy tắc nghiệp vụ giữ nguyên

- Push là bổ trợ; hộp thư in-app vẫn hoạt động khi thiết bị không nhận được push.
- FCM token thuộc user/device, không thuộc tenant. Dữ liệu hộp thư vẫn theo tenant đang active.
- App không tự quyết định ở trong geofence; bản đồ chỉ giúp người dùng giảm thao tác sai.
- Audit log, tạo notification và gửi push là server-side; client chỉ gửi request ID, đăng ký thiết bị và xử lý payload.
- TOTP backup code chỉ hiện một lần và không được lưu lâu dài trong App.

## Giới hạn kiểm thử

- TOTP và hộp thư có thể kiểm tra trong Expo Go.
- Push FCM thật cần development/production build có native Firebase; Expo Go cố ý bỏ qua đăng ký thiết bị.
- Cần tài khoản test có TOTP, notification seed và Firebase project thật để chạy live end-to-end. Lượt này kiểm tra bằng code contract, TypeScript/lint và Android production bundle.
- Development/production build Android phải cấu hình `EXPO_ANDROID_GOOGLE_MAPS_API_KEY` (Maps SDK for Android, giới hạn theo `com.fams.mobile` + SHA certificate) để nền bản đồ hiển thị; GPS/check-in không phụ thuộc key này.

## Cập nhật sau bản vá Backend notification catalog

- Backend đã có catalog chính thức tại `GET /api/v1/notification-event-types`; event thật hiện tại là `RANDOM_CHECK_SENT`.
- Màn cài đặt App dùng `GET /me/notification-settings` vì endpoint này đã trả phép hợp giữa toàn bộ catalog và các event type tùy chỉnh người dùng từng lưu. Do đó event mới tự xuất hiện, đồng thời không làm mất cấu hình riêng tenant.
- App dùng `label` do Backend trả; nếu event riêng tenant có `label: null`, App hiện nguyên mã `eventType` thay vì tự đoán tên.
- `id`/`updatedAt` được xử lý nullable khi `customized: false`. Hai toggle hiển thị đúng giá trị mặc định Backend trả, không còn giả định mặc định luôn bật.
- Đã loại bỏ chuỗi sai `RANDOM_CHECK_DISPATCHED` khỏi ánh xạ App.

## Kiểm thử tự động

| Hạng mục | Kết quả |
| --- | --- |
| Expo ESLint | Pass |
| TypeScript | Pass |
| `git diff --check` | Pass |
| Android production export | Pass, bundle 1.728 modules |
