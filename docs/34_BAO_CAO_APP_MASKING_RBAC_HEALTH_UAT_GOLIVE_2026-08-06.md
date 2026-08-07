# Báo cáo App — Data Masking, RBAC, Health, UAT và Go-live

Ngày kiểm tra: 06/08/2026 · cập nhật follow-up: 07/08/2026  
Nguồn đối chiếu: `system-status-api.md`, `data-masking-permission-health-uat-golive-audit-2026-08-06.md`, hướng dẫn theo vai trò, UAT B.8 và Go-live Checklist của Backend.

## Kết quả theo story

| Story | Phân định đúng | Kết quả App |
| --- | --- | --- |
| Data Masking | Backend là nguồn bảo mật | App hiển thị nguyên response được phép; không tự unmask và không log token/OTP/backup code. Hồ sơ “của tôi” vẫn hiện đầy đủ theo contract `/auth/me`. |
| Permission Guard | Backend service enforce tenant + permission | App pre-gate menu Công trình bằng permissions của `/roles/me`, nhưng vẫn xử lý `403` là nguồn sự thật khi quyền đổi hoặc tenant switch. |
| System Health | Web Platform Admin | Không dựng dashboard toàn hệ thống trong Mobile App nhân viên; không gọi `/platform/system-status` từ App. |
| UAT end-to-end | PO/QA trên staging + thiết bị thật | Đã lập checklist mobile bên dưới, nối vào luồng B.8 từ mời nhân viên tới báo cáo. |
| Hướng dẫn sử dụng | Web theo vai trò + App Employee | Đã thêm màn Hướng dẫn trong Hồ sơ, gồm chấm công, Face ID, random check, bảng công, bảo mật và xử lý lỗi. |
| Go-live Checklist | Deployment/Platform Ops | Không biến thành màn end-user; bổ sung các gate riêng cho mobile bên dưới. |

## Quyết định bảo mật quan trọng

- Ẩn menu không phải permission guard. App chỉ dùng permission để tránh dẫn người dùng vào màn chắc chắn bị từ chối; Backend vẫn phải kiểm tra lại đúng `tenantId` trên path.
- App không nhận hoặc lưu dữ liệu audit diff, health component, delivery token hay dữ liệu xuyên tenant của Platform Admin.
- Email/SĐT của chính người dùng không bị che trong Hồ sơ App là đúng nghiệp vụ self-profile. Dữ liệu Admin/HR xem người khác được Backend che trước khi trả về.
- Không phát hiện lệnh `console.log/error` ghi access token, refresh token, OTP, invitation token hoặc backup code trong source App.
- Lỗi máy chủ 5xx có `Mã hỗ trợ` để kỹ thuật viên trace request; App không mở Audit Viewer cho nhân viên.

## UAT Mobile nối với luồng B.8

Chạy trên development/production build, không dùng Expo Go cho Firebase Phone/Google/FCM native:

1. Mở link mời trên điện thoại, chấp nhận và đăng nhập đúng tenant mới.
2. Xác nhận Hồ sơ hiển thị đầy đủ thông tin của chính nhân viên và đúng vai trò/tenant.
3. Với Employee không có `sites:list/sites:read`, xác nhận không có mục “Công trình quản lý”; “Nơi làm hôm nay” vẫn xuất hiện.
4. Chuyển sang tài khoản Supervisor có quyền site, xác nhận mục Công trình xuất hiện nhưng Backend chỉ trả đúng scope.
5. Đăng ký Face ID: consent → chụp → pending review; sau HR duyệt, App refetch thành enrolled.
6. Check-in trong geofence bằng policy thật; chờ kết quả AI hoàn tất và xác nhận trạng thái hợp lệ/chờ duyệt đúng response.
7. Check-out; mở Lịch sử và Bảng công để kiểm tra giờ vào/ra, work minutes và trạng thái.
8. Gửi random check thật; kiểm tra push foreground/background, đếm ngược và deep-link đúng `checkId`.
9. Tạo một tình huống lỗi hợp lệ, gửi giải trình kèm ảnh và xác nhận trạng thái sau HR xử lý.
10. Đổi tenant trong cùng tài khoản; kiểm tra cache site, Face ID, bảng công và notification không lẫn tenant cũ.
11. Thu hồi một permission khi App đang mở; gọi lại màn cũ phải nhận 403 thân thiện dù menu trước đó đã hiện.
12. Mở Hồ sơ → Hướng dẫn sử dụng và đối chiếu các CTA/tên màn hình với bản build thật.

## Gate App trước go-live tenant đầu tiên

- [ ] `EXPO_PUBLIC_API_URL` là HTTPS production, không phải localhost/IP Wi-Fi.
- [ ] Universal Links/App Links và domain email token hoạt động trên Android + iOS.
- [ ] Development/production build đã cấu hình Firebase; FCM token đăng ký và bị thu hồi khi logout.
- [ ] Google Client ID, package/bundle ID và signing certificate khớp môi trường production.
- [ ] Camera, GPS, notification permission có giải thích và đường mở Settings khi bị từ chối vĩnh viễn.
- [ ] Tenant switch xóa/refetch toàn bộ cache theo tenant.
- [ ] Employee thường không thấy menu quản trị; thử gọi URL/API trực tiếp vẫn bị Backend chặn.
- [ ] Test Face ID/liveness bằng người và camera thật trên ít nhất một Android và một iPhone mục tiêu.
- [ ] Test mạng yếu/offline queue, đồng bộ lại và conflict sau khi có mạng.
- [ ] Test push foreground, background và cold-start từ notification tray.
- [ ] Tất cả lỗi 5xx hiển thị mã hỗ trợ có thể trace; không hiển thị stack trace/token.
- [ ] Platform Admin xác nhận Web System Status toàn bộ `UP` trước khi bàn giao; App không thay thế gate này.

## Việc thuộc Frontend Web, không triển khai trong repo App

- Dashboard System Status: overall badge, từng health component, job status và queue depth; poll 30–60 giây.
- UI Data Masking cho danh sách/chi tiết/export nhân viên phải hiển thị đúng giá trị Backend trả, không tự suy ra dữ liệu gốc.
- Hướng dẫn Platform Admin và Company Admin/HR.
- Giao diện chạy/ghi nhận UAT B.8, audit trace, delivery logs và Go-live checklist cho đội triển khai.

## Kết quả kiểm tra sống API System Status

Đã gọi API trên Backend local đang chạy và đối chiếu quyền thực tế:

- Platform Admin nhận `200`, `overallHealth=UP`, DB/Redis/queue/notification/AI đều `UP`, queue depth bằng `0` tại thời điểm kiểm tra.
- Tài khoản HR nhận `403`; request chưa đăng nhập nhận `401`. Guard phù hợp với tài liệu.
- Response ghi nhận 22 tenant active và đủ 7 scheduler trong catalog; các job đã chạy là `OK`, job chưa chạy là `NEVER_RUN`.

### Hai điểm Backend cần chỉnh trước khi Web dựng màn Health

1. **Đã đóng 07/08/2026 — Chuẩn hoá `healthComponents`:** Backend đã bỏ scalar `status` dư thừa; kiểm tra sống xác nhận cả 10 entry đều là object `{status, details}`.
2. **Đã đóng 07/08/2026 — Trả đủ catalog scheduler:** kiểm tra sống xác nhận đủ 7 job, gồm `SubscriptionExpirationJob`; mọi phần tử có `expectedNextRunAt`, `lastRunDurationMs`, `staleThresholdMinutes`, `stale`, và job chưa chạy có `NEVER_RUN`.

Hai thay đổi này không ảnh hưởng App nhân viên. System Health tiếp tục là màn Web/Ops dành cho Platform Admin.

## Follow-up Data Masking và Go-live Records — 07/08/2026

### Điều chỉnh App

- App không có màn danh sách/chi tiết nhân viên của HR và không hiển thị email/SĐT của người khác, nên không cần thêm badge `piiMasked` vào UI hiện tại.
- Hai màn phân công/giám sát trước đây gọi Employee Detail chỉ để ghép tên. Service giờ chủ động project response thành `{id, firstName, lastName}` trước khi React Query cache; `email`, `phone` và `piiMasked` không được giữ trong cache App. Đây là data minimization ở client, độc lập với việc Backend trả PII che hay không.
- Hồ sơ của chính người đăng nhập vẫn dùng `/auth/me` và hiển thị đầy đủ dữ liệu self-profile theo contract; không áp `piiMasked` của API quản lý nhân viên sang luồng này.

### Kiểm tra sống PII và Permission Guard

- Platform Admin gọi danh sách nhân viên nhận `piiMasked=false`, đúng quyền xuyên hệ thống.
- HR và Site Supervisor gọi từ IP local bị `403` với thông báo `Access from this IP address is not allowed for this tenant`. Đây là IP whitelist của `acme-corp`, không phải thiếu permission.
- Khi mô phỏng IP nằm trong whitelist, cả hai gọi API thành công và response có field `piiMasked` rõ ràng.
- **Backend cần xử lý P1 mới:** dữ liệu thật hiện cho thấy role `HR_MANAGER` có `users:create` nhưng không có `employees:pii:read`, nên response của HR là `piiMasked=true`. Điều này không khớp cam kết migration “role từng có `users:create` tự động được cấp permission mới, không mất quyền”. Migration V86 đã chạy nhưng DB chỉ đang cấp `employees:pii:read` cho `PLATFORM_ADMIN`, `PLATFORM_SUPPORT_LEAD`, `TENANT_ADMIN`. Cần cập nhật seed/default-role provisioning và thêm migration bù idempotent cho các role hiện hữu mà nghiệp vụ xác nhận được xem PII; không sửa bằng cách hard-code role ở App.

### Go-live Records

- `/api/v1/platform/go-live-records` là nghiệp vụ compliance của Platform Ops, không đưa vào Mobile App nhân viên.
- Frontend Web cần bảo toàn vòng đời `DRAFT → APPROVED/REJECTED`, gửi lại toàn bộ `steps` khi PATCH và chuyển bản ghi đã ký sang read-only.
- Khuyến nghị Backend enforce nguyên tắc bốn mắt (`approvedBy != performedBy`) nếu đây là biên bản compliance thật. Chỉ disable nút trên Web không đủ bảo mật vì API hiện cho phép người tạo tự phê duyệt.
- Chưa cần lịch sử nhiều lần chạy scheduler trong App. Với Web/Ops, chỉ thêm bảng lịch sử sau khi chốt retention; trạng thái gần nhất và `stale` hiện đủ cho dashboard sức khoẻ tức thời.

## Xác minh kỹ thuật App

- `npm run quality`: đạt (ESLint + TypeScript).
- `git diff --check`: đạt.
- Expo Doctor: đạt `18/18` kiểm tra dependency và cấu hình.
- Expo export Android: đạt, 1.730 modules được bundle thành công.
- Expo export iOS: đạt, 1.732 modules được bundle thành công.
- Cần UAT thiết bị thật cho camera, GPS, push, Universal Link/App Link và tenant switch; build tĩnh không thể thay thế các bước này.
