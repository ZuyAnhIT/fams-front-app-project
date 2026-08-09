# Báo cáo App — tích hợp 6 Backend fixes ngày 07/08/2026

Nguồn đối chiếu: `docs/api/2026-08-07-backend-fixes-frontend-guide.md` của Backend.

## Kết quả phân định

| Hạng mục | Phạm vi App | Kết quả |
| --- | --- | --- |
| #60 — OT limit | Bắt buộc hiển thị | Đã thêm `otDailyLimitExceeded`, `otWeeklyLimitExceeded` vào type bảng công và badge cảnh báo trên từng ngày. Khi mở chi tiết, App nói rõ cảnh báo không trừ OT và không khóa check-out. |
| #130 — Toạ độ dashboard | Web, tuỳ chọn | Không dựng bản đồ trong App. Supervisor Dashboard App tiếp tục hiển thị số người tại site; không diễn giải toạ độ check-in thành vị trí trực tiếp. |
| #31 — Audit entity mới | Web Platform Admin | App không có Audit Viewer và không whitelist `entityType`, nên không cần sửa. |
| #145 — Masking mở rộng | Backend nội bộ | Không có field mới được trả cho App; không cần sửa. |
| #118 — Attendance recompute | HR Web mutation | App không gọi `PATCH .../violations/{id}/attendance-impact`. Các mutation check-in/random check hiện có đã invalidate cache `attendance`; không bổ sung invalidation không liên quan. |
| #113 — Giải trình | App Employee | Luồng App hiện dùng endpoint do Backend cung cấp trong `explainEndpoint` (tương ứng `POST /checkin/{id}/explain`); My Exceptions chỉ tổng hợp danh sách, không dùng làm endpoint ghi. Không cần đổi contract. |

## Quy tắc UI OT đã áp dụng

- Cờ ngày và tuần được hiển thị độc lập; một ngày có thể có cả hai badge.
- Badge màu cảnh báo, không đổi `otMinutes`, `totalWorkMinutes` hoặc trạng thái bản ghi.
- Không disable check-out, không ẩn OT và không suy diễn rằng phần vượt giới hạn bị loại khỏi lương.
- Cảnh báo tuần là tổng OT của nhân viên trên mọi site trong tuần ISO do Backend tính; App không tự cộng lại phía client.
- Nếu Backend trả cả hai cờ `false`, giao diện giữ nguyên như trước.

## Checklist App

- [x] Thêm hai field mới vào `AttendanceSummary`.
- [x] Hiển thị badge “Vượt giới hạn OT ngày”.
- [x] Hiển thị badge “Vượt giới hạn OT tuần”.
- [x] Thêm giải thích cảnh báo không ảnh hưởng số phút OT/check-out.
- [x] Không dựng nhầm bản đồ live tracking từ toạ độ lúc check-in.
- [x] Xác nhận App không có Audit Viewer/entity whitelist.
- [x] Xác nhận mutation giải trình vẫn dùng endpoint check-in thật.
- [x] Xác nhận cache attendance đã được invalidate ở các mutation App có thể làm thay đổi bảng công.

## Việc dành cho Web, không thuộc repo App

- Form OT config thêm `maxOtMinutesPerDay`, `clearMaxOtMinutesPerDay`, `maxOtMinutesPerWeek`, `clearMaxOtMinutesPerWeek`.
- Bảng công HR hiển thị hai cảnh báo OT.
- Audit Viewer render generic sáu `entityType` mới và hiển thị `actorId=null` thành “Hệ thống tự động”.
- Nếu dựng bản đồ Supervisor, ghi rõ “Vị trí lúc check-in lúc …”, không gọi là vị trí hiện tại/realtime.
- Sau mutation attendance-impact, invalidate/refetch bảng công HR.

## Kết quả xác minh

- API sống `GET /attendance/me/monthly` của tài khoản có dữ liệu trả đủ `otDailyLimitExceeded` và `otWeeklyLimitExceeded` trong từng phần tử `dailySummaries`.
- Dữ liệu seed tại thời điểm kiểm tra có 3 ngày công nhưng chưa có ngày nào vượt giới hạn; cần tạo ca có limit thấp hoặc dữ liệu UAT riêng để kiểm tra trực quan trạng thái `true` trên thiết bị.
- `npm run quality`: đạt (Expo ESLint + TypeScript).
- `git diff --check`: đạt.
- Expo export Android: đạt, 1.730 modules.
- Expo export iOS: đạt, 1.732 modules.
