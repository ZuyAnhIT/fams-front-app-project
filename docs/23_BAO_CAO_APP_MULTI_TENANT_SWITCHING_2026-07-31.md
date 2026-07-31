# Báo cáo tích hợp App chuyển đổi công ty đa tenant

Ngày thực hiện: 31/07/2026  
Phạm vi: `fams-front-app-project`  
Nguồn đối chiếu: `fams-backend-project/docs/api/multi-tenant-switching-ui-guide.md`.

## 1. Kết quả triển khai

- `GET /roles/me` được gom theo `tenantId`, giữ `tenantName`, `tenantSlug` và
  danh sách vai trò; nhiều vai trò trong cùng công ty không tạo dòng trùng.
- Tài khoản có nhiều hơn một công ty luôn đi qua màn chọn công ty sau đăng
  nhập. Tài khoản chỉ có một công ty tiếp tục vào App trực tiếp.
- Màn Hồ sơ chỉ hiện nút chuyển công ty khi có từ hai công ty hoạt động.
- Chuyển công ty gọi thật `POST /auth/switch-tenant`, gửi access token hiện tại
  trong header và refresh token trong body.
- Response thành công thay đồng thời access token, refresh token và
  `activeTenantId` trong SecureStore/Zustand.
- App hủy request cũ, xóa toàn bộ React Query cache theo tenant, reset context
  check-in trong bộ nhớ rồi điều hướng về Home.
- Queue offline và open-checkin lưu trên thiết bị vẫn được giữ riêng theo
  `(userId, tenantId)`; không xóa dữ liệu tenant cũ, nhưng cũng không nạp nhầm
  vào tenant mới.
- Query `employeeId` và Face ID đã có tenant trong query key. Sau khi cache bị
  xóa, App lấy lại employee mới rồi gọi trạng thái Face ID theo đúng cặp
  `(tenantId mới, employeeId mới)`.
- Danh sách vai trò trong Hồ sơ chỉ hiển thị vai trò thuộc công ty hiện tại,
  không còn trộn vai trò của các công ty khác.

## 2. Xử lý lỗi và race condition

- `403`: báo vai trò tại công ty đích không còn hoạt động, tải lại
  `/roles/me`, bỏ lựa chọn đã bị thu hồi.
- `404`: báo công ty không còn khả dụng và tải lại danh sách.
- `401`: interceptor thử refresh đúng một lần; nếu phiên hết hạn thật, xóa
  session/cache và quay về Login.
- Nếu access token hết hạn đúng lúc gọi switch, interceptor thay refresh token
  vừa được rotate trong **cả** request `/auth/logout` và `/auth/switch-tenant`
  trước khi retry. Điều này tránh retry bằng access token mới nhưng body còn
  refresh token cũ.
- Nếu backend đổi tenant trong lúc refresh (ví dụ vai trò tenant cũ vừa bị thu
  hồi), App cập nhật token + tenant cùng lúc, hủy request đang giữ URL tenant
  cũ, xóa cache và về Home thay vì retry chéo tenant.
- Sau switch, App luôn `replace` về Home nên màn cũ không thể tiếp tục giữ
  `tenantId`, `employeeId`, site hoặc check-in ID của công ty trước.

## 3. Test sống backend local

Dùng tài khoản seed `truong.van.dat@gmail.com` có vai trò EMPLOYEE tại Phương
Nam và Tia Sáng:

| Kịch bản | Kết quả |
|---|---|
| Login và `GET /roles/me` | PASS, trả đúng 2 tenant khác nhau |
| Switch từ session hiện tại sang Tia Sáng | PASS |
| `activeTenantId` response khớp tenant đã chọn | PASS |
| Lấy `employeeId` trong tenant mới | PASS, có employee riêng |
| Gọi Face ID bằng tenant + employee mới | PASS, HTTP 200 |
| Logout refresh token mới của phiên test | PASS |

## 4. Kiểm tra App

| Kiểm tra | Kết quả |
|---|---|
| ESLint | PASS |
| TypeScript `tsc --noEmit` | PASS |
| `git diff --check` | PASS |
| Expo Doctor | PASS 18/18 |
| Expo export Android | PASS, 1.565 modules |
| Expo export iOS | PASS, 1.569 modules |

## 5. Khuyến nghị backend không chặn phát hành

App hiện lấy employee hiện tại qua
`GET /tenants/{tenantId}/attendance/me/monthly` và chỉ dùng field
`employeeId`. API này đã test sống đúng sau switch, nhưng về kiến trúc nên bổ
sung endpoint trực tiếp như `GET /tenants/{tenantId}/employees/me`. Khi đó Face
ID/hồ sơ không phụ thuộc vào module attendance hoặc tham số tháng/năm.
