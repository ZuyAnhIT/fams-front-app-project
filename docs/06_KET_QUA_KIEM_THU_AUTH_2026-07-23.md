# 06. Kết quả kiểm thử và lịch sử sửa Authentication — 23/07/2026

## 1. Phạm vi

Đợt kiểm tra này đối chiếu giao diện frontend với `fams-backend-project/docs/api/auth-api.md` cho bốn nhóm:

1. Đăng ký bằng số điện thoại và OTP backend.
2. Đăng ký bằng email và link xác thực.
3. Đăng nhập bằng email hoặc số điện thoại và mật khẩu.
4. Đăng nhập/liên kết Google và đồng bộ tài khoản theo email.

Không ghi access token, refresh token, OTP thật, Google client ID hay credential người dùng vào tài liệu/ảnh.

## 2. Môi trường kiểm thử

| Thành phần | Giá trị |
|---|---|
| Ngày | 23/07/2026 |
| Frontend | Expo 54, React Native Web, Chromium Playwright |
| Backend | Docker local, `http://localhost:8080/api/v1` |
| Frontend test origin | `http://localhost:8082` và `http://localhost:8083` |
| Kiểm tra tĩnh | `npm run lint`, `tsc --noEmit` |
| Dữ liệu | Tài khoản test sinh riêng; OTP/token chỉ đọc trong môi trường dev và không lưu vào repo |

Lưu ý: `.env` thường ngày của frontend đang trỏ tới `http://192.168.1.135:8080/api/v1`, nhưng host đó không online lúc bắt đầu test. Bản web test được chạy với override `EXPO_PUBLIC_API_URL=http://localhost:8080/api/v1`.

## 3. Sai lệch phát hiện trước khi sửa

| Mức độ | Sai lệch frontend cũ | Ảnh hưởng |
|---|---|---|
| Blocker | Login gửi `{ email, password }` thay vì `{ identifier, password }` | Email/phone password login không đúng contract hiện tại |
| Blocker | Register map response như `LoginResponse` và chờ token | Backend register 201 không trả token; điều hướng sai |
| Blocker | Form register gửi đồng thời email và phone tùy chọn | Vi phạm quy tắc XOR; phone chưa được chứng minh sở hữu |
| Blocker | Không có phone registration OTP của backend | Không dùng được `/register/send-otp` + `otpCode` |
| High | Không có màn chờ email, resend và verify-result route | Luồng verify email không hoàn chỉnh trên UI |
| High | Refresh gọi `/auth/refresh` với snake_case | Contract thật là `/auth/refresh-token` + `refreshToken` |
| High | Logout không gửi `refreshToken` | Backend không thể thu hồi đúng session thiết bị |
| High | Web Google dùng Expo redirect flow | Gặp `redirect_uri_mismatch`; không đúng hướng dẫn GIS `response.credential` |
| Medium | Parser chủ yếu đọc `error_code`/`locked_until` | Bỏ sót `errorCode`/`lockedUntil` camelCase hiện tại |

## 4. Thay đổi đã thực hiện

### 4.1 Đăng ký số điện thoại

- Tách tab đăng ký email/phone; không gửi đồng thời hai định danh.
- Bước 1 gọi `POST /auth/register/send-otp` với phone chuẩn E.164.
- Bước 2 hiển thị OTP 6 số, countdown 5 phút và gửi `otpCode` khi register.
- Xử lý lỗi backend qua `userMessage`, `errorCode` và field validation.
- Sau HTTP 201 quay về password login, điền sẵn số điện thoại.

### 4.2 Đăng ký email

- Register chỉ gửi email, không gửi phone/OTP.
- Thêm màn `/(auth)/email-verification` với thông báo kiểm tra hộp thư và resend trung tính.
- Thêm route `/(auth)/verify-email?token=...` để hiển thị trạng thái thành công/thất bại thân thiện.
- Sau register 201 không tạo session giả và không chờ token.

Backend hiện vẫn tạo link thẳng tới `/api/v1/auth/verify-email`, nên production cần đổi link email sang route frontend này (hoặc backend redirect sau verify). Route frontend đã sẵn sàng nhưng chưa được email backend sử dụng.

### 4.3 Password login, refresh và logout

- Một input duy nhất nhận email hoặc phone.
- Request dùng field `identifier`; email được lowercase, phone được chuẩn hóa E.164.
- Giữ riêng lựa chọn “Đăng nhập bằng OTP điện thoại” cho Firebase phone-login cũ.
- Sửa refresh thành `/auth/refresh-token` với `{ refreshToken }` và vẫn single-flight/rotate cả cặp token.
- Logout thiết bị gửi `{ refreshToken }`.
- Bổ sung CTA resend khi backend trả `EMAIL_NOT_VERIFIED`.

### 4.4 Google

- Web login chuyển sang Google Identity Services, lấy `response.credential` (Google ID token), không dùng access token/authorization code.
- Native vẫn dùng `@react-native-google-signin/google-signin` với Web Client ID làm audience.
- Sửa trường hợp hủy native sign-in không bị bọc thành lỗi chung.
- Thêm API/hook/UI link và unlink Google trong Profile; sau thao tác gọi lại `/auth/me` để đồng bộ `googleLinked`.
- Web link Google dùng GIS/One Tap, không quay lại redirect flow cũ.

## 5. Kết quả kiểm thử

### 5.1 Backend API end-to-end

| Case | Kết quả | Bằng chứng tóm tắt |
|---|---|---|
| Phone send OTP | PASS | HTTP 200 |
| Phone register với OTP sai | PASS | HTTP 400 |
| Phone register với OTP đúng | PASS | HTTP 201, `phoneVerified=true` |
| Login ngay bằng phone mới | PASS | HTTP 200, token có mặt nhưng không ghi vào log tài liệu |
| Phone duplicate | PASS | HTTP 409 |
| Tổng phone backend | PASS | 6/6 case |
| Email register | PASS | HTTP 201, `emailVerificationRequired=true` |
| Email login trước verify | PASS | HTTP 403, `EMAIL_NOT_VERIFIED` |
| Resend verification | PASS | HTTP 200 |
| Verify token dev | PASS | HTTP 200 |
| Email login sau verify | PASS | HTTP 200, token có mặt |

### 5.2 Browser/UI và contract payload

| Case | Kết quả | Quan sát |
|---|---|---|
| Email register form | PASS | Chỉ gửi email; điều hướng `/email-verification` |
| Phone send OTP | PASS | `0912345678` được gửi thành `+84912345678` |
| Phone register | PASS | Có `phone`, `otpCode`, không có `email`; về login |
| Phone password login | PASS | Gửi `identifier=+84912345678`, không có field `email` |
| Email password login | PASS | Gửi `identifier=admin@fams.com`, email uppercase được lowercase |
| Runtime browser | PASS | Không có React/JavaScript page error trong suite |
| Google GIS button | PASS | SDK GIS tải và render nút Google chính thức |
| Google browser happy-path | BLOCKED | Origin test chưa nằm trong Authorized JavaScript origins |

Các response register/login trong phần kiểm tra payload UI được intercept có kiểm soát để xác minh chính xác body và state transition. Happy-path API thật được kiểm tra riêng ở mục 5.1, tránh tạo nhiều tài khoản/OTP ngoài ý muốn qua mỗi lần chạy browser.

## 6. Bằng chứng ảnh

| Ảnh | Nội dung |
|---|---|
| [`01-email-register-form.png`](test-evidence/auth-2026-07-23/01-email-register-form.png) | Form đăng ký email |
| [`02-email-verification-waiting.png`](test-evidence/auth-2026-07-23/02-email-verification-waiting.png) | Màn chờ xác thực email |
| [`03-phone-register-otp.png`](test-evidence/auth-2026-07-23/03-phone-register-otp.png) | Phone register, OTP 6 số, countdown 5 phút |
| [`04-password-login-phone-error.png`](test-evidence/auth-2026-07-23/04-password-login-phone-error.png) | Password login bằng phone và lỗi backend an toàn |
| [`05-password-login-email.png`](test-evidence/auth-2026-07-23/05-password-login-email.png) | Password login bằng email |
| [`05-google-oauth-popup.png`](test-evidence/auth-2026-07-23/05-google-oauth-popup.png) | Lỗi redirect flow cũ trước khi đổi sang GIS |
| [`06-google-gis-button.png`](test-evidence/auth-2026-07-23/06-google-gis-button.png) | Nút GIS chính thức sau khi sửa |

## 7. Blocker và việc cần làm ngoài repo

### 7.1 Google web chưa đạt happy-path

Chromium tải được GIS nhưng Google trả:

```text
[GSI_LOGGER]: The given origin is not allowed for the given client ID.
```

Google Cloud Console cần thêm đúng origin chạy frontend vào OAuth Web Client → **Authorized JavaScript origins**, ví dụ theo môi trường thực tế:

```text
http://localhost:8081
http://192.168.1.135:8081
https://<frontend-domain-production>
```

Không thêm path vào JavaScript origin. Sau khi cấu hình, cần chạy lại hai happy-path thật:

1. Email/password account → Google cùng email → `/me.googleLinked=true`, không tạo user trùng.
2. Google-only account → quên mật khẩu/đặt password → login được bằng cả Google và password.

### 7.2 Phone OTP production

Backend dev hiện đọc OTP từ log. Theo tài liệu backend, SMS provider thật chưa được tích hợp và backend chưa chặn tuyệt đối payload có đồng thời email/phone. Không phát hành phone registration production trước khi hoàn tất hai mục này.

### 7.3 Email verification URL production

Backend hiện gửi link API trả JSON. Cần cấu hình email trỏ tới route frontend `/verify-email?token=...` hoặc cho backend redirect về frontend sau khi verify.

## 8. Kết luận

| Tính năng | Trạng thái sau đợt sửa |
|---|---|
| Đăng ký phone OTP | PASS trên UI contract và backend dev E2E; chưa production-ready vì SMS provider |
| Đăng ký email verify link | PASS E2E API và UI; còn cấu hình URL email để có UX frontend hoàn chỉnh |
| Login email/phone + password | PASS contract/UI/API |
| Google login + đồng bộ hai chiều | Code web đã chuyển đúng sang GIS; BLOCKED happy-path bởi Authorized JavaScript origins và thiếu phiên/credential Google trong Chromium sạch |

Quality gate cuối cùng phải giữ xanh:

```bash
npm run lint
npx tsc --noEmit
```
