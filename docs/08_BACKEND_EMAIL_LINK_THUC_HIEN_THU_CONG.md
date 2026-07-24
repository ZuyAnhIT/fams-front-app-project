# 08. Backend email link — hướng dẫn thực hiện thủ công

> **Cập nhật 24/07/2026:** backend hiện đã tách `APP_FRONTEND_URL` cho link đăng
> ký/xác minh email và quên/đặt lại mật khẩu đúng như đề xuất dưới đây. Tài liệu
> này được giữ làm lịch sử triển khai. Link xác nhận đổi email hồ sơ vẫn dùng
> `APP_BASE_URL` theo contract backend; frontend đồng thời hỗ trợ route thân thiện
> `/verify-email?token=...&mode=email-change` nếu cấu hình proxy về sau.

> Tài liệu bàn giao cho người thao tác backend. Codex không sửa và không chạy
> backend trong đợt triển khai frontend này.

## 1. Vấn đề hiện tại

Backend đang ghép email URL thành API path:

```text
${APP_BASE_URL}/api/v1/auth/reset-password?token=...
${APP_BASE_URL}/api/v1/auth/verify-email?token=...
```

Đây không phải URL giao diện mobile/web. Khi `APP_BASE_URL` là localhost, điện
thoại hiểu localhost là chính điện thoại. Ngoài ra reset endpoint là `POST`, nên
người dùng mở link GET trực tiếp cũng không thể hiện form đặt mật khẩu.

Frontend đã có hai route:

```text
/reset-password?token=...
/verify-email?token=...
```

## 2. Contract đã đối chiếu

| Endpoint | Request frontend |
|---|---|
| `POST /api/v1/auth/forgot-password` | `{ "email": "user@example.com" }` |
| `POST /api/v1/auth/reset-password` | `{ "token": "...", "newPassword": "NewPassword1" }` |
| `GET /api/v1/auth/verify-email` | Query `token=<verificationToken>` |

`newPassword` là camelCase theo `ResetPasswordRequest.java`. Frontend đã map
đúng field này.

## 3. Thay đổi backend tối thiểu được đề xuất

Nên tách URL frontend khỏi URL API/server:

```yaml
app:
  frontend-url: ${APP_FRONTEND_URL:https://staging-app.fams.vn}
```

Biến môi trường:

```env
APP_FRONTEND_URL=https://staging-app.fams.vn
```

Không thêm dấu `/` cuối giá trị.

### PasswordResetService

Thay dependency URL dùng để tạo email link bằng `app.frontend-url`, sau đó tạo:

```java
String resetUrl = UriComponentsBuilder
        .fromUriString(frontendUrl)
        .path("/reset-password")
        .queryParam("token", token)
        .build()
        .encode()
        .toUriString();
```

### RegisterService và EmailVerificationService

Hai service đều phải tạo link xác minh mới:

```java
String verificationUrl = UriComponentsBuilder
        .fromUriString(frontendUrl)
        .path("/verify-email")
        .queryParam("token", token)
        .build()
        .encode()
        .toUriString();
```

Các vị trí hiện tại đã quan sát:

- `PasswordResetService.java`: link reset password.
- `RegisterService.java`: email xác minh sau đăng ký.
- `EmailVerificationService.java`: resend verification email.

Không thay endpoint API xử lý token. Frontend nhận token từ link rồi vẫn gọi API
backend hiện tại.

## 4. Ngoài phạm vi thay đổi trên

`UserProfileService` hiện có link xác nhận đổi email và `TotpService` có QR URL.
Không đổi hai link này theo `/verify-email`, vì contract/màn hình của chúng khác.
Nếu muốn bỏ hoàn toàn việc dùng chung `app.base-url`, cần thiết kế route frontend
riêng cho đổi email và giữ một biến public API URL riêng cho TOTP.

## 5. Association files cho HTTPS link

### Android: `/.well-known/assetlinks.json`

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.fams.mobile",
      "sha256_cert_fingerprints": [
        "<DEVELOPMENT_OR_PRODUCTION_SHA256>"
      ]
    }
  }
]
```

### iOS: `/.well-known/apple-app-site-association`

File không có đuôi `.json`:

```json
{
  "applinks": {
    "details": [
      {
        "appIDs": ["<APPLE_TEAM_ID>.com.fams.mobile"],
        "components": [
          { "/": "/reset-password" },
          { "/": "/verify-email" }
        ]
      }
    ]
  }
}
```

Hai file phải trả HTTP 200 qua HTTPS, không redirect và có content type JSON.

## 6. Checklist nghiệm thu backend thủ công

1. Deploy frontend route và association files lên HTTPS domain.
2. Đặt cùng domain vào backend `APP_FRONTEND_URL` và frontend build
   `EXPO_PUBLIC_APP_URL`.
3. Gửi forgot-password cho tài khoản test; email không còn `localhost` và không
   còn `/api/v1/auth/reset-password`.
4. Mở link trên web: thấy form; submit gửi `newPassword` và reset thành công.
5. Mở cùng link mới trên Android/iOS đã cài app: app mở đúng màn hình.
6. Đăng ký email và resend; cả hai email đều dùng `/verify-email`.
7. Xác minh token dùng một lần; lần mở lại hiển thị lỗi hết hạn/đã sử dụng.
8. Không ghi token/OTP thật vào log hoặc tài liệu kiểm thử.
