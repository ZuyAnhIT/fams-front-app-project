# 10. Backend notes còn lại — không tự động thực hiện

Tài liệu này chỉ ghi việc cần thao tác phía backend. Đợt frontend ngày 24/07/2026
không sửa, build, restart hoặc chạy migration trong repository backend.

## 1. Cần bổ sung trạng thái TOTP vào profile

### Vấn đề đã xác minh qua code

Entity `User` có `totpEnabled`, nhưng `UserProfileResponse` và
`UserProfileService.toResponse()` hiện không trả field này. Backend cũng chưa có
endpoint đọc trạng thái TOTP riêng.

Hệ quả: sau khi login bằng TOTP trong cùng phiên, frontend biết 2FA đang bật.
Nhưng sau khi đóng/mở lại app và hydrate token, `GET /auth/me` không đủ dữ liệu
để biết trạng thái; màn Hồ sơ có thể hiển thị nhầm nút “Bật xác thực 2 lớp”.

### Thay đổi tối thiểu đề xuất

Trong `UserProfileResponse` thêm:

```java
@Schema(description = "Whether TOTP two-factor authentication is enabled")
private boolean totpEnabled;
```

Trong `UserProfileService.toResponse(User user)` thêm:

```java
.totpEnabled(user.isTotpEnabled())
```

Cập nhật mẫu `GET /api/v1/auth/me` trong `auth-api.md`:

```json
{
  "totpEnabled": true
}
```

Frontend đã map sẵn field camelCase `totpEnabled`, nên sau khi backend bổ sung
không cần đổi contract lần nữa.

### Test backend nên chạy

1. User chưa bật TOTP: `GET /auth/me` trả `totpEnabled:false`.
2. Setup + verify thành công: `GET /auth/me` trả `true`.
3. Disable bằng password/TOTP/backup code: profile trở về `false`.
4. Đóng/mở lại client với refresh token còn sống: profile vẫn phản ánh đúng.

## 2. QR TOTP là trang HTML, không phải ảnh

`qrCodeUrl` hiện trỏ tới `GET /auth/totp/qr?token=...` với content type
`text/html`. Frontend đã sửa để mở URL bằng trình duyệt và luôn hiển thị
`manualEntryKey`; không còn cố render HTML bằng component Image.

Không bắt buộc sửa backend. Nếu muốn QR hiển thị inline trong app, có thể bổ
sung một trong hai contract rõ ràng:

- endpoint trả `image/png`; hoặc
- response setup trả data URL/base64 PNG.

Không nên đổi âm thầm content type của endpoint hiện tại nếu web/backend test
đang phụ thuộc trang HTML.

## 3. Link email theo từng môi trường

Backend đã dùng `APP_FRONTEND_URL` đúng cho verify đăng ký và reset password.
Giá trị cần được đặt theo môi trường:

- Development Build chưa có domain: custom scheme được app hỗ trợ là
  `famsfrontappproject://`.
- Staging/production: HTTPS origin thật, khớp `EXPO_PUBLIC_APP_URL` và hai file
  association Android/iOS.

Xác nhận đổi email hồ sơ hiện dùng `APP_BASE_URL` và mở JSON trực tiếp; đây là
contract hiện tại, không phải lỗi chức năng. Nếu muốn giao diện thân thiện, link
có thể được proxy/tạo thành:

```text
{APP_FRONTEND_URL}/verify-email?token=<token>&mode=email-change
```

Frontend đã hỗ trợ `mode=email-change`.

## 4. URL avatar trên điện thoại

Khi object storage trả `avatarUrl`, URL public không được chứa `localhost` vì
điện thoại sẽ hiểu đó là chính thiết bị. Development dùng IP LAN mà điện thoại
truy cập được; staging/production dùng HTTPS domain public.

## 5. Thứ tự ưu tiên

1. Bổ sung `totpEnabled` vào profile — cần để UI đúng sau app restart.
2. Cấu hình `APP_FRONTEND_URL` và URL object storage theo môi trường.
3. QR inline là cải tiến UX tùy chọn; frontend hiện đã có đường hoạt động bằng
   trang QR + manual key.
