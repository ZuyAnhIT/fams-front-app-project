# Báo cáo kiểm tra và triển khai Random Check trên App

Ngày thực hiện: 31/07/2026 · Cập nhật đồng bộ backend: 01/08/2026  
Nhánh: `feature/random-check-employee-app`

## 1. Kết luận phân định Web/App

| Nghiệp vụ | Nền tảng đúng | Kết luận |
|---|---|---|
| Cấu hình mặc định tenant | Web HR/Admin | Không dựng trên App nhân viên |
| Override theo site | Web HR/Admin | Không dựng trên App nhân viên |
| Số lần, khoảng cách, khung giờ | Web HR/Admin | Không dựng trên App nhân viên |
| Chọn `location_only` / `location_face` / `location_face_liveness` | Web HR/Admin | App chỉ đọc `configSnapshot`, không cho nhân viên đổi mode |
| Chọn `role_at_site` áp dụng | Web HR/Admin | Backend lọc assignment; App không tự suy diễn quyền |
| Nhận và phản hồi random check | App nhân viên | Đã triển khai |
| Xem cảnh báo trong bảng công cá nhân | App nhân viên | Đã triển khai |

Thiết kế này giữ một nguồn sự thật ở backend: policy hiệu lực là kết quả tổng hợp tenant default, site override, vai trò tại site, ca làm và trạng thái nhân viên. App chỉ thu bằng chứng đúng mode được giao.

## 2. Phần đã triển khai trên App

- Thêm service/hook/type cho:
  - `GET /api/v1/tenants/{tenantId}/scheduled-checks/my-pending`;
  - `POST /api/v1/tenants/{tenantId}/scheduled-checks/{checkId}/respond`;
  - `GET /api/v1/tenants/{tenantId}/scheduled-checks/{checkId}/my-result`.
- Màn **Kiểm tra ngẫu nhiên**:
  - ưu tiên yêu cầu `sent` trước `pending`;
  - đếm ngược cục bộ theo `expiresAt`, tự khóa thao tác khi hết hạn;
  - hiển thị mode từ snapshot server;
  - lấy GPS chính xác khi gửi;
  - mode Face chỉ cho chụp trực tiếp bằng camera trước, không chọn ảnh thư viện;
  - kiểm tra Face ID đã `enrolled`, chặn hồ sơ đang chờ duyệt/cần đăng ký lại;
  - gửi đúng field `employeePhotoBase64`, không gửi score do client tự khai báo.
- Màn kết quả:
  - phân biệt rõ “máy chủ đã nhận phản hồi” và “AI đã xác minh xong”;
  - không hiển thị đạt cuối khi `faceVerified`/`livenessVerified` còn `null`;
  - hiển thị GPS, Face, liveness và độ tương đồng riêng biệt.
  - đọc `hasPhotoEvidence` và thông báo khi ảnh selfie đã được tiếp nhận làm bằng chứng; App không có quyền tải lại ảnh HR.
- Trang chủ:
  - banner khẩn và badge khi có yêu cầu `sent`;
  - quick action mở màn random check.
- Thông báo:
  - hỗ trợ cả `RANDOM_CHECK_SENT`, `random_check_sent` và `random_check`;
  - bấm thông báo có metadata sẽ mở đúng `checkId`; notification cũ/FCM thô fallback về danh sách.
- Bảng công:
  - daily badge `hasRandomCheckFailure`;
  - monthly warning `daysWithRandomCheckFailure`;
  - diễn đạt rõ random check failure là cảnh báo tuân thủ, không tự trừ `totalWorkMinutes` hoặc `otMinutes`.
- Tenant isolation: mọi query dùng `activeTenantId`; cache key có tenant ID và tự đổi dữ liệu sau switch tenant.

## 3. Liên kết nghiệp vụ đã kiểm tra

1. **Nhân viên**: backend tự tìm employee từ JWT; App không nhận `employeeId` do người dùng nhập.
2. **Site và assignment**: check chứa `assignmentId/siteId/shiftId`; App không cho đổi công trình để tránh gửi bằng chứng sang assignment khác.
3. **Ca làm**: thời điểm sinh/gửi/hết hạn do backend tính; App chỉ hiển thị `scheduledAt/expiresAt`.
4. **Face ID**: `location_face*` yêu cầu hồ sơ Face ID đã được duyệt trong đúng tenant. Hồ sơ cũ có `requiresReEnrollment` bị chặn và hướng dẫn đăng ký lại.
5. **Liveness**: App gửi ảnh camera trực tiếp; server/AI quyết định passive liveness. App không gửi `livenessScore` và không tin kết quả do thiết bị tự khai báo.
6. **Attendance**: failure được đưa về summary/report để đối soát; không can thiệp công phút tự động.
7. **Vai trò tại site**: role scope thuộc bước tạo scheduled check. App không tải toàn bộ policy/role để tự quyết định vì dữ liệu client có thể cũ.

## 4. Cập nhật đồng bộ backend ngày 01/08/2026

### P0 endpoint kết quả nhân viên — ĐÃ HOÀN TẤT

Backend đã bổ sung đúng contract an toàn:

```text
GET /api/v1/tenants/{tenantId}/scheduled-checks/{checkId}/my-result
```

App đã tích hợp endpoint này và thực hiện:

- poll mỗi 4 giây khi `processingStatus="pending"`;
- dừng ngay khi `processingStatus="completed"`;
- timeout sau 60 giây nhưng không yêu cầu nhân viên gửi lại phản hồi;
- cho phép thử lấy kết quả lại;
- cập nhật GPS, Face, liveness, score và outcome ngay trên màn kết quả;
- invalidate bảng công sau khi có kết quả cuối.

Test sống bằng employee owner trả `200` với Face/liveness/score cuối; employee khác gọi cùng `checkId` trả `404`, đúng yêu cầu chống lộ check của người khác.

### P1 notification metadata — ĐÃ HOÀN TẤT CHO IN-APP INBOX

Backend đã trả metadata:

```json
{ "checkId": "uuid", "siteId": "uuid", "expiresAt": "ISO-8601" }
```

App đã đọc `metadata.checkId` và mở đúng yêu cầu đang chờ. Deep-link chỉ tự chọn một lần, sau đó nhân viên vẫn chuyển sang yêu cầu khác được. Notification cũ hoặc push FCM chưa có metadata vẫn fallback mở danh sách chung.

### Các điểm còn lại

- **P2 ca qua đêm**: giao config window với ca `allowOvernight=true` vẫn chưa được backend xử lý; App giữ nguyên thời điểm backend cung cấp, không tự suy diễn.
- **FCM data payload**: metadata mới chỉ có trong `GET /notifications`; khi app tắt hoàn toàn, raw push chưa deep-link thẳng được. Fallback hiện tại không làm mất nghiệp vụ.
- **AI infrastructure**: kiểm tra lại sau bản vá lần 3, container `fams-ai` đã `healthy`, health endpoint trả `{"status":"ok"}`.

### Bản vá backend lần 3 — phân định đúng Web/App

- `GET /scheduled-checks/{checkId}/photo` là endpoint **Web HR/Admin**, yêu cầu `randomchecks:list`/`randomchecks:configure`; không tích hợp vào App nhân viên để tránh vượt RBAC và lộ ảnh bằng chứng.
- `CheckResponseDto.hasPhotoEvidence` được App đọc từ chính response `respond()`. Khi `true`, màn kết quả cho nhân viên biết ảnh đã được tiếp nhận làm bằng chứng; App không nhận URL/path hoặc bytes ảnh.
- Chuẩn hóa `Assignment.role` thành `worker|supervisor` chỉ tác động form cấu hình Web. App không tự lọc role; danh sách check của nhân viên vẫn do backend quyết định.
- Retention ảnh selfie vẫn là backlog backend P2; việc có endpoint đọc ảnh không thay thế chính sách xóa dữ liệu sinh trắc học.

## 5. Đối chiếu hệ thống thực tế

- QuickBooks Time dùng geofence để nhắc clock-in/out và nhấn mạnh GPS có thể tiếp tục ghi khi nhân viên đang clocked in; điều này củng cố yêu cầu phải giải thích rõ quyền vị trí và giới hạn sử dụng dữ liệu: [Set up geofencing](https://quickbooks.intuit.com/learn-support/en-us/help-article/feature-preferences/set-use-geofencing-quickbooks-time/L3pZUXKzW_US_en_US), [GPS tracking for team members](https://quickbooks.intuit.com/learn-support/en-us/help-article/track-location/use-understand-quickbooks-time-gps-tracking-team/L4XXl5rNy_US_en_US).
- QuickBooks cung cấp bản đồ/điểm GPS để quản lý đối soát, phù hợp với quyết định để Web HR xem bằng chứng còn App nhân viên chỉ xem kết quả của mình: [GPS tracking for admins and managers](https://quickbooks.intuit.com/learn-support/en-us/help-article/track-location/use-quickbooks-time-gps-tracking-admin-manager/L7fLoZNZk_US_en_US).
- Deputy tách bước clock khỏi bước duyệt timesheet và cho manager xem/chỉnh/chấp nhận/từ chối. Đây là cơ sở để random check failure là cờ review thay vì tự trừ công: [Approving timesheets](https://help.deputy.com/hc/en-au/articles/4689553875471-Approving-timesheets).
- Deputy hỗ trợ photo verification như một policy cấu hình và có cảnh báo clock xa địa điểm. FAMS mở rộng theo rủi ro với ba mode và passive liveness phía server: [Photo verification](https://help.deputy.com/hc/en-au/articles/14133681301007-Disable-enable-photo-verification-for-timesheets-on-the-Deputy-mobile-app), [Timesheet location alerts](https://help.deputy.com/hc/en-au/articles/4690133801103-Setting-up-timesheet-alerts-for-when-your-team-member-clocks-far-away-from-your-work-location).

Các kết luận thiết kế trên là suy luận nghiệp vụ từ tài liệu chính thức của các sản phẩm, không phải tuyên bố rằng các sản phẩm đó có cùng luồng random check như FAMS.

## 6. Kiểm thử đã thực hiện

| Kiểm thử | Kết quả |
|---|---|
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `git diff --check` | PASS |
| Expo production export Android | PASS |
| Expo production export iOS | PASS |
| Backend health `GET /actuator/health` | `200`, `UP` |
| Đối chiếu DTO/controller backend với service App | PASS cho pending/respond/my-result/notification metadata |
| `my-result` bằng đúng employee owner | PASS — `200`, completed, face/liveness true, score `0.95` |
| Employee khác đọc cùng `checkId` | PASS — `404` |
| Notification inbox trả `metadata.checkId/siteId/expiresAt` | PASS |
| Poll UI mỗi 4 giây, dừng completed, timeout 60 giây | PASS qua code/typecheck; cần quan sát thêm trên thiết bị |
| AI service container | PASS — `healthy`, health trả `{"status":"ok"}` |
| Phân quyền endpoint ảnh bằng chứng | PASS qua code audit — HR-only; App không gọi endpoint |
| Mapping `hasPhotoEvidence` từ response nhân viên | PASS qua typecheck/export; cần xác nhận ảnh thật trên thiết bị |
| Detail không có ảnh trả `hasPhotoEvidence=false` | PASS qua API sống |
| Endpoint `/photo` khi không có bằng chứng | PASS — `404 application/json` |
| Camera/GPS thật trên Android/iOS | Cần test thủ công trên thiết bị thật |

Không chạy các shell test random-check của backend vì chúng tạo tenant/employee/site/check test lâu dài và không có cleanup ở cuối script; tránh làm bẩn dữ liệu hiện tại.

## 7. Checklist test tay trên Android/iOS

1. Đăng nhập nhân viên active, chọn đúng tenant, bảo đảm có assignment hôm nay.
2. Với `location_only`: mở yêu cầu `sent`, xác minh countdown giảm, cấp Location, gửi và kiểm tra kết quả GPS.
3. Với `location_face`: dùng Face ID đã được HR duyệt, cấp Camera, chụp trực tiếp, gửi; phải thấy “đang xác minh” nếu AI chưa xong.
4. Với `location_face_liveness`: chụp mặt thật và thử lại bằng ảnh màn hình để xác nhận worker trả hai kết quả khác nhau.
5. Từ chối Location/Camera rồi thử lại; App phải giải thích quyền và không gửi request thiếu bằng chứng.
6. Để countdown về 0; nút phản hồi phải biến mất/khóa và backend vẫn phải từ chối nếu request cũ bị replay.
7. Chuyển tenant; yêu cầu và Face ID tenant trước không được hiển thị ở tenant mới.
8. Bấm notification `RANDOM_CHECK_SENT`; App phải mở màn random check.
9. Sau một failure đã được backend tổng hợp, mở Bảng công: badge ngày + cảnh báo tháng xuất hiện nhưng tổng giờ/OT không bị App cộng hoặc trừ lại.
