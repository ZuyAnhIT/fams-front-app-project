# Báo cáo App — Notification Template, Delivery, Settings, Jobs và Retention

Ngày kiểm tra: 06/08/2026  
Nguồn đối chiếu: `notification-api.md` và `notification-jobs-retention-audit-2026-08-06.md` của Backend.

## Phân định tính năng

| Story | Nơi triển khai đúng | Kết quả App |
| --- | --- | --- |
| Quản lý template thông báo | Web Company Portal/Admin | Không dựng CRUD trên Mobile App nhân viên. App hiển thị nguyên title/body đã được Backend render. |
| Retry và fallback notification | Backend; delivery-log ở Web Platform Ops | App không tự retry gửi và không được xem log toàn hệ thống. Inbox vẫn là nguồn dự phòng phía client khi push không tới. |
| Cấu hình nhận thông báo cá nhân | Web và App | Đã có màn hai toggle độc lập theo catalog động từ `GET /me/notification-settings`. |
| Cron refresh attendance nightly | Backend job | Không có màn App. Bảng công App đọc summary do Backend chốt, không tự tính lại công. |
| Monitor scheduled random-check job | Backend + Web Platform Ops | App không monitor Redis/job. Check được phục hồi và gửi vẫn đi qua push/deep-link hiện tại. |
| Data retention | Backend + AI service | App không tự xóa dữ liệu server. Inbox chấp nhận notification đã đọc cũ biến mất theo policy; App không cache ảnh sinh trắc học server. |

## Thay đổi thực hiện trên App

- Foreground push dùng đúng `title` và `body` Backend đã render từ template, thay vì ghi đè random-check bằng một câu cố định. Nội dung vì vậy nhất quán giữa App đang mở, notification tray và inbox.
- Điều hướng vẫn dựa vào `eventType` + `metadata`, không dựa vào title/body có thể được Admin dịch hoặc thay đổi.
- Toggle settings cập nhật optimistic để không nảy về trạng thái cũ trong lúc chờ mạng; nếu API lỗi, App rollback về giá trị trước đó và hiện `userMessage`/mã hỗ trợ từ Backend.
- Danh sách settings tiếp tục là phép hợp catalog + event tùy chỉnh tenant do Backend trả; `label:null` hiện nguyên `eventType`.

## Quy tắc nghiệp vụ giữ nguyên

- Template khớp `eventType + tenant locale` có hiệu lực ở lần gửi tiếp theo; App không cần nút “Áp dụng”.
- Không có template khớp thì Backend fallback nội dung mặc định; App không tự dựng lại template.
- In-app và push là hai lựa chọn độc lập.
- Retry FCM, fallback email, delivery log, nightly attendance, reconciliation random-check và retention đều là server-side. Không nhân bản logic đó trong App.
- Notification đã đọc cũ có thể bị retention xóa; notification chưa đọc không bị job hiện tại xóa.

## Kiểm thử thủ công cần dữ liệu thật

1. Tạo/sửa template `RANDOM_CHECK_SENT` đúng locale tenant, gửi random check khi App đang foreground và xác nhận toast hiện đúng title/body mới.
2. Đưa App về background/đóng hẳn, gửi lại và xác nhận notification tray dùng cùng nội dung, bấm vào mở đúng `checkId`.
3. Tắt riêng in-app nhưng giữ push: push vẫn đến, inbox không tạo dòng mới.
4. Bật in-app nhưng tắt push: inbox có dòng mới, thiết bị không nhận push.
5. Ngắt mạng khi đổi toggle: UI rollback và báo lỗi; nối lại rồi lưu thành công.
6. Kiểm tra bảng công ngày hôm trước sau cron 01:00 UTC; App chỉ hiển thị summary mới từ API.

## Kết quả kiểm tra tự động App

| Hạng mục | Kết quả |
| --- | --- |
| Expo ESLint | Pass |
| TypeScript | Pass |
| `git diff --check` | Pass |
| Android production export | Pass, bundle 1.728 modules |

## Kết quả live-test contract Backend

Thực hiện trực tiếp ngày 06/08/2026 trên Backend local, không reseed và không xóa dữ liệu:

- `/actuator/health`: `UP` sau khi khởi động lại container MinIO đang bị dừng; không sửa code Backend.
- `GET /api/v1/notification-event-types`: trả đúng 1 event chính thức `RANDOM_CHECK_SENT`.
- `GET /api/v1/me/notification-settings`: trả 9 dòng gồm catalog chính thức và 8 setting test tùy chỉnh đã tồn tại; dòng catalog có `label="Kiểm tra ngẫu nhiên"`, hai kênh bật, `customized=false`, `id/updatedAt=null` — khớp type và UI App.
- `PUT /api/v1/me/notification-settings/SETTING_TEST_ENABLED`: ghi lại đúng giá trị hiện có, trả `customized=true`; không thay đổi hành vi cấu hình.
- Hai endpoint catalog/settings không có JWT đều trả `401`.

Không có Android/iOS device kết nối với môi trường chạy Codex và CLI EAS không cung cấp session, nên kiểm thử FCM foreground/background thật vẫn cần thực hiện trên development build ở điện thoại theo bước 1–4 phía trên. Expo Go không thể chứng minh FCM native.
