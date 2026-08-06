# Báo cáo App — Saved Filters, Export, Tenant Operations và Audit Viewer

Ngày kiểm tra: 06/08/2026  
Nguồn đối chiếu: `saved-filters-api.md`, `audit-log-api.md`, `saved-filters-audit-viewer-tenant-ops-2026-08-06.md` của Backend.

## Kết luận phạm vi giao diện

| Tính năng | Nơi triển khai đúng | Kết quả đối với App |
| --- | --- | --- |
| Lưu bộ lọc thường dùng | Web Company Portal, tại các danh sách lớn của HR/Admin | Không dựng màn App. App hiện không có danh sách quản trị vi phạm/check-in/nhân viên tương ứng để áp lại `filterParams`. |
| Export danh sách vi phạm | Web Company Portal | Không dựng App. Đây là nghiệp vụ lập báo cáo nội bộ và tải Excel của HR/Admin. |
| Suspend/reactivate tenant | Web Admin Console | Không đưa quyền Platform Admin lên Mobile App nhân viên. |
| Xem chi tiết tenant vận hành | Web Admin Console | Không dựng App; subscription, usage và limits là dữ liệu back-office. |
| Enforce giới hạn gói | Backend | App không tự tính hoặc tự chặn. Riêng bước chấp nhận lời mời đã xử lý thân thiện mã `PLAN_LIMIT_EXCEEDED`. |
| Danh sách/chi tiết audit log | Web Admin Console và Company Portal theo quyền | Không dựng App; dữ liệu có IP, user-agent và diff nhạy cảm, cần màn hình quản trị lớn và route bảo vệ riêng. |
| Trace theo `requestId` | Web Audit Viewer/công cụ hỗ trợ | App gửi `X-Request-Id` cho mọi API để Backend ghi và đội hỗ trợ tra cứu, nhưng không cho nhân viên truy cập Audit Viewer. |

## Điều chỉnh thực hiện trên App

- Giữ cơ chế sinh UUID `X-Request-Id` trên mọi request. Backend echo cùng giá trị và ghi vào audit log, cho phép kỹ thuật viên trace một thao tác cụ thể.
- Với lỗi máy chủ `5xx`, App bổ sung `Mã hỗ trợ: <request-id>` vào thông báo thân thiện. Người dùng có thể gửi mã này cho hỗ trợ; lỗi validation/nghiệp vụ `4xx` vẫn ngắn gọn và không bị chèn UUID gây rối.
- Khi chấp nhận lời mời gặp `PLAN_LIMIT_EXCEEDED`, App không yêu cầu nhân viên tự nâng cấp gói. Giao diện hướng dẫn liên hệ HR hoặc người gửi lời mời vì chỉ quản trị công ty mới xử lý được giới hạn số ghế.
- Không gọi API audit, tenant operations, saved filters hoặc export từ App. Việc này tránh mở rộng bề mặt quyền quản trị và giữ đúng định hướng Mobile App phục vụ công việc hằng ngày.

## Yêu cầu dành cho Frontend Web

- Saved filter phải dùng namespace ổn định theo màn hình, ví dụ `violations`, `checkins`, `employees`, `reports`; lưu nguyên query params và luôn truyền `tenantId` hiện hành.
- Chỉ tự áp bản ghi `isDefault=true`; đổi default phải refetch vì Backend tự bỏ default cũ.
- Export vi phạm dùng đúng bộ lọc hiện hành và xử lý file tải xuống ở Web.
- Audit Viewer phải luôn truyền `tenantId` hiện hành với user không phải Platform Admin; người có nhiều tenant sẽ nhận `403` nếu bỏ trống.
- `oldValue`/`newValue` phải render như JSON động, không giả định schema theo entity.
- Trace `requestId` hiển thị thành luồng hành động, nhưng vẫn phải tôn trọng tenant scope do Backend trả.
- Tenant suspend/reactivate và operational detail chỉ xuất hiện trong route Admin Console đã kiểm tra Platform Admin, không chỉ ẩn menu bằng CSS.

## Kiểm thử cần thực hiện

- App: mở link lời mời của tenant đã đầy giới hạn và xác nhận thông báo hướng dẫn liên hệ HR.
- App: lời mời tenant còn chỗ vẫn chấp nhận và đăng nhập bình thường.
- Web: test saved-filter tạo/đổi default/đổi tên trùng/xóa và cách ly user + tenant.
- Web: test audit viewer với Platform Admin, admin một tenant và user thuộc nhiều tenant; đặc biệt `GET /{id}` ngoài scope phải hiện như không tìm thấy.
- Web: test suspend giữ nguyên dữ liệu và reactivate khôi phục truy cập.

## Kết quả kiểm tra tự động App

| Hạng mục | Kết quả |
| --- | --- |
| Expo ESLint | Pass |
| TypeScript | Pass |
| `git diff --check` | Pass |
| Android production export | Pass, bundle 1.728 modules |
