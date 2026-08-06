# Báo cáo tích hợp Site Presence trên App Supervisor

Ngày kiểm tra: 05/08/2026

## Phân định nghiệp vụ

- Báo cáo công ngày/tháng, export, báo cáo vi phạm, Face ID và global search là nghiệp vụ quản trị đặt trên Web.
- App chỉ bổ sung báo cáo hiện diện real-time vào màn “Hiện trường của tôi” của SITE_SUPERVISOR, vì đây là dữ liệu tác nghiệp tại công trình.

## Kết quả triển khai

- Gọi `GET /tenants/{tenantId}/reports/sites/presence` theo tenant đang active.
- Poll lại mỗi 60 giây và hỗ trợ kéo để làm mới.
- Ghép snapshot report với Supervisor Dashboard theo `siteId`.
- Hiển thị tổng có mặt/phân công/thiếu và số liệu riêng từng site.
- Hiển thị trực tiếp tên và mã nhân viên chưa có mặt từ `absentEmployees`; không gọi thêm API danh bạ và không còn fallback UUID.
- Nếu report tạm lỗi, vẫn giữ Dashboard Supervisor và hiện cảnh báo có thể thử lại; không làm mất toàn bộ màn hiện trường.
- Site-scope do Backend áp dụng, App không cache hay trộn dữ liệu giữa các tenant.

## Kiểm thử

| Hạng mục | Kết quả |
| --- | --- |
| Expo ESLint | Pass |
| TypeScript | Pass |
| Android production export | Pass, bundle 1.723 module |

## Kết luận

Phần cần thiết trên App đã được tích hợp mà không tạo thêm một màn trùng với Supervisor Dashboard. Export và các báo cáo quản trị tiếp tục chỉ nằm trên Web.

Backend đã hoàn thành `EmployeeRef` cho `presentEmployees`/`absentEmployees`. App đã chuyển sang contract mới và có thể hiển thị đầy đủ người vắng mặt trong phạm vi site của Supervisor.
