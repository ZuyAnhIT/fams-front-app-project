# Báo cáo App — Hộp thư giải trình hợp nhất (2026-08-04)

## Đã triển khai

- Route ẩn trong tab navigator: `/(tabs)/exceptions`, mở từ quick action Trang chủ.
- Trang chủ chỉ badge số mục chưa giải trình, đồng thời mô tả riêng số mục đã gửi đang chờ HR.
- Gọi `GET /tenants/{tenantId}/me/exceptions?size=50` để hợp nhất check-in `pending_review` và violation chưa resolve.
- Phân biệt nguồn bằng icon/badge, hiển thị reason/date/description và empty/error/loading state.
- Form note bắt buộc, tối đa 1000 ký tự; POST trực tiếp theo `explainEndpoint` server trả.
- Trước khi POST, App xác minh endpoint thuộc `/api/v1/tenants/{activeTenantId}/`; sau submit làm mới inbox và check-in cache.
- Copy nghiệp vụ nhắc rõ giải trình không tự đổi kết quả hoặc xóa vi phạm.
- Cho chọn ảnh JPEG/PNG/WEBP tối đa 5MB và gửi multipart vào private evidence storage.
- Với `hasExplanation=true`, hiện “Đã giải trình · đang chờ HR”, nạp note cũ và cho cập nhật nội dung/ảnh.

## Hợp đồng backend sau tích hợp

- Backend đã hỗ trợ multipart trực tiếp trên explain endpoint; không dùng `photoUrl`/avatar upload.
- `/me/exceptions` đã trả `hasExplanation` và `employeeNote`, giải quyết gửi lặp và giữ item trong hàng chờ cho tới khi HR resolve.
- Evidence được bảo vệ theo tenant và permission. Production cần cấu hình retention/lifecycle phù hợp chính sách dữ liệu tranh chấp.

## Kiểm thử

- `npm run lint`: pass.
- `npm run typecheck`: pass.
- Android Expo production export: pass, xác nhận route/module được bundle.
- Đã kiểm tra tenant-prefix của endpoint, loading/error/empty, refresh, note validation và cache invalidation bằng code/typecheck.

## Kết luận

App đã có luồng self-service cần thiết cho cả check-in lỗi và violation. Các chức năng quản trị danh sách, evidence, confirm/dismiss, override check-in và chỉnh bảng công tiếp tục nằm trên Web đúng phân định nghiệp vụ.
