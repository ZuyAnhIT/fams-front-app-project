# 15. Tích hợp khóa và mở khóa tài khoản — 24/07/2026

## Phạm vi

Triển khai frontend theo hợp đồng:

```text
/home/duyanh/Projects/FAMS/fams-backend-project/docs/api/account-lockout-api.md
```

Không sửa, build hoặc khởi động backend.

## Hợp đồng API đã áp dụng

- `POST /api/v1/auth/login` và `POST /api/v1/auth/otp/verify` có thể trả:
  - HTTP `423`;
  - `errorCode = ACCOUNT_LOCKED`;
  - `userMessage` bằng tiếng Việt;
  - thời điểm mở khóa nằm sau `Account locked until ` trong `message`.
- Không đếm số lần đăng nhập sai ở frontend.
- Không có API mở khóa riêng.
- `POST /api/v1/auth/reset-password` thành công sẽ:
  - đổi mật khẩu;
  - xóa bộ đếm đăng nhập sai;
  - mở khóa tài khoản ngay.

## Giao diện và hành vi đã hoàn thiện

### Đăng nhập email/số điện thoại và mật khẩu

- Nhận diện khóa theo `423`, `ACCOUNT_LOCKED` hoặc message dự phòng.
- Vẫn hiện đúng giao diện khóa nếu response chưa có `lockedUntil` riêng.
- Hiển thị:
  - icon khóa;
  - tiêu đề `Tài khoản tạm thời bị khóa`;
  - `userMessage` từ backend;
  - thời điểm và thời lượng còn lại nếu parse được;
  - giải thích tài khoản có email có thể mở khóa sớm;
  - nút `Đặt lại mật khẩu để mở khóa ngay`.
- Nếu identifier là email, màn mở khóa được điền sẵn email.
- Sửa nội dung dự phòng từ 15 phút thành đúng 1 giờ.
- Khi người dùng sửa identifier/mật khẩu, lỗi cũ được xóa.

### Đăng nhập nhanh Firebase Phone OTP

- `POST /auth/otp/verify` trả `423` cũng hiện cùng giao diện khóa.
- Nút mở khóa dẫn sang flow email reset hiện có.
- Không tự suy đoán email từ số điện thoại.

### Quên mật khẩu / mở khóa

- Màn `/forgot-password` nhận:

  ```text
  reason=account-locked
  email=<email nếu biết>
  ```

- Khi vào từ trạng thái khóa, tiêu đề đổi thành `Mở khóa tài khoản`.
- Hiển thị rõ đặt lại mật khẩu sẽ mở khóa ngay.
- Sau khi gửi email, thông báo hướng dẫn hoàn tất link reset.

### Reset mật khẩu

- Giữ nguyên API và deep-link hiện có.
- Sau reset thành công:
  - xóa auth/session/cache local;
  - thông báo tài khoản đã sẵn sàng đăng nhập lại;
  - quay về đăng nhập.

## File frontend liên quan

- `src/features/auth/utils.ts`
- `src/features/auth/hooks/use-login.ts`
- `src/features/auth/hooks/use-phone-otp.ts`
- `src/features/auth/hooks/use-reset-password.ts`
- `src/features/auth/components/AccountLockedBanner.tsx`
- `src/features/auth/components/LoginForm.tsx`
- `app/(auth)/phone-login.tsx`
- `app/(auth)/forgot-password.tsx`
- `app/(auth)/reset-password.tsx`

## Kết quả kiểm tra tự động

| Kiểm tra | Kết quả |
|---|---|
| ESLint | PASS |
| TypeScript `tsc --noEmit` | PASS |
| `git diff --check` | PASS |
| Expo web production export | PASS — 51 static routes |
| Backend `/auth/health` qua LAN | PASS — HTTP 200 |
| Web `/reset-password` qua LAN | PASS — HTTP 200 |
| Web `/verify-email` qua LAN | PASS — HTTP 200 |

Artifact export chỉ nằm trong `/tmp`, không ghi vào repository.

Android Development Build dùng để test đã hoàn tất:

```text
Build ID: 2a17b0ee-bafe-41ed-bccc-7dd598e0c343
APK: https://expo.dev/artifacts/eas/xNDoqTDbug7OuNayPuTMccBTFt96E-eDVp_--08bAiU.apk
```

## Test tích hợp cần thực hiện với backend đang chạy

Dùng tài khoản test có email, không dùng tài khoản quản trị quan trọng.

1. Đăng nhập sai mật khẩu 4 lần:
   - mỗi lần vẫn là lỗi credentials;
   - chưa hiện giao diện khóa.
2. Đăng nhập sai lần thứ 5:
   - backend trả `423 / ACCOUNT_LOCKED`;
   - app hiện giao diện khóa, không hiện lỗi generic.
3. Thử mật khẩu đúng trong thời gian khóa:
   - vẫn hiện giao diện khóa.
4. Bấm `Đặt lại mật khẩu để mở khóa ngay`:
   - mở đúng màn `Mở khóa tài khoản`;
   - email được điền sẵn nếu ban đầu đăng nhập bằng email.
5. Gửi link, mở `/reset-password?token=...`, đặt mật khẩu mới đạt policy.
6. Đăng nhập ngay bằng mật khẩu mới:
   - thành công mà không cần đợi 1 giờ.
7. Đăng xuất, thử sai 1 lần rồi nhập đúng:
   - đăng nhập thành công, chứng minh bộ đếm cũ đã được reset.
8. Với Firebase OTP:
   - dùng tài khoản đang khóa;
   - hoàn tất Firebase OTP;
   - `/auth/otp/verify` trả `423`;
   - app hiện cùng CTA mở khóa.

## Điều kiện để test link trên điện thoại LAN

- Máy tính và điện thoại cùng Wi-Fi.
- Backend bind ra LAN tại cổng `8080`.
- Frontend web auth chạy cổng `3000`.
- Development Build/Metro chạy cổng `8082`.
- `APP_FRONTEND_URL` phía backend phải là host điện thoại truy cập được, không
  dùng `localhost`.

## Ghi chú backend không bắt buộc

Frontend hiện parse timestamp từ `message` đúng như tài liệu. Về lâu dài backend
nên trả `lockedUntil` thành field riêng để giao diện không phụ thuộc cấu trúc
chuỗi tiếng Anh. Đây là đề xuất hợp đồng, không phải blocker hiện tại.
