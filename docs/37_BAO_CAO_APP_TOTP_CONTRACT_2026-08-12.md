# Báo cáo cập nhật App theo contract TOTP — 2026-08-12

## Kết quả

App đã chuyển hoàn toàn sang contract TOTP mới của Backend:

- dùng `otpauthUri` để vẽ QR ngay trên thiết bị;
- không mở hoặc nhúng endpoint HTML `qrCodeUrl` đã deprecated;
- hiển thị đếm ngược theo `expiresAt` do Backend trả về;
- khóa nút xác nhận khi phiên setup hết hạn và cho phép tạo phiên mới;
- tiếp tục hỗ trợ `manualEntryKey` khi Authenticator nằm trên cùng điện thoại;
- nhận biết riêng HTTP 409 khi tài khoản đã bật TOTP từ thiết bị/phiên khác,
  đóng modal và tải lại hồ sơ thay vì báo nhầm xung đột email;
- fail-closed nếu response setup thiếu `setupToken`, `otpauthUri`,
  `manualEntryKey` hoặc `expiresAt`.

QR được tạo cục bộ bằng `react-native-qrcode-svg` + `react-native-svg`. URI và
secret không được gửi qua dịch vụ QR bên thứ ba.

## Kiểm thử

| Hạng mục | Kết quả |
|---|---|
| Lint + TypeScript | PASS |
| Unit tests App | PASS — 12/12 |
| Expo Doctor | PASS — 18/18 |
| Expo dependency alignment | PASS |
| Export Android | PASS — 2.039 modules |
| Export iOS | PASS — 2.041 modules |
| `POST /auth/totp/setup` sống | PASS — HTTP 200 |
| `otpauthUri` đúng scheme và chứa đúng manual key | PASS |
| TTL phản ánh thời gian Redis | PASS — 600 giây |
| Header cache/referrer/frame | PASS |
| Secret/otpauth URI trong application log | Không phát hiện |

Các header xác nhận trực tiếp:

```text
Cache-Control: no-store, no-cache, must-revalidate
Pragma: no-cache
Referrer-Policy: no-referrer
X-Frame-Options: DENY
```

Nhánh HTTP 409 được test tự động phía App. Không có tài khoản seed nào đang bật
TOTP tại thời điểm test, nên không tự thay đổi trạng thái bảo mật tài khoản thật
chỉ để tái hiện 409; Backend đã xác nhận nhánh này trong bộ regression 77/77.

## Lưu ý kiểm thử thủ công

1. Tài khoản chưa bật 2FA mở Hồ sơ → Xác thực hai lớp → Tiếp tục.
2. Dùng thiết bị khác quét QR, hoặc nhập khóa thủ công trên cùng điện thoại.
3. Xác nhận countdown gần 10 phút và giảm mỗi giây.
4. Nhập mã 6 số; sau thành công phải lưu đủ backup codes trước khi đóng.
5. Đăng xuất, đăng nhập lại và xác nhận màn TOTP xuất hiện sau bước mật khẩu.
6. Kiểm tra đăng nhập bằng một backup code; mã đó không được dùng lại.
7. Kiểm tra tắt 2FA lần lượt bằng mật khẩu, TOTP hoặc backup code theo nhu cầu.

Không chụp màn hình, ghi log hoặc gửi qua chat QR, URI, manual key và backup
codes của tài khoản thật.
