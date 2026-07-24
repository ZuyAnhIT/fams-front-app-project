# 09. Báo cáo hoàn thiện Auth, hồ sơ và phiên đăng nhập — 24/07/2026

## 1. Kết luận

Frontend đã được đồng bộ với contract mới trong `auth-api.md`, biên dịch sạch và
kết nối được backend LAN hiện tại. Các luồng không cần OTP/email/OAuth tương tác
đã được kiểm tra tự động. Các happy path cần SMS, hộp thư, Google consent hoặc
Authenticator thật đã có đầy đủ giao diện và API nhưng vẫn cần nghiệm thu lần cuối
trên Development Build của Android/iOS.

Còn một thiếu hụt contract phía backend: `GET /auth/me` chưa trả `totpEnabled`,
nên trạng thái 2FA có thể hiển thị sai sau khi app khởi động lại. Frontend đã map
sẵn field này; hướng sửa backend được tách riêng trong tài liệu 10 và chưa được
tự động thực hiện.

Không sửa file backend trong đợt này. Các request kiểm thử chỉ tạo hai phiên đăng
nhập tạm trên tài khoản demo rồi thu hồi ngay sau khi kiểm tra.

## 2. Phần frontend đã hoàn thiện

### Đăng nhập, đăng ký và deep link

- Login mật khẩu dùng chung field `identifier` cho email hoặc số điện thoại.
- Mọi lần đăng nhập/đăng ký gửi `deviceId` ổn định theo lần cài app, lưu bằng
  AsyncStorage; không còn dùng model/build ID giống nhau giữa nhiều máy.
- Phone OTP native phát hiện Expo Go và hướng dẫn dùng Development Build.
- Google Sign-In dùng native SDK trong Development Build và Google Identity
  Services trên web, gửi đúng Google ID token về backend. Expo Go hiển thị hướng
  dẫn cài Development Build vì không chứa native module của FAMS.
- Route `/verify-email` và `/reset-password` nhận token một lần, hỗ trợ web,
  custom scheme và App Links/Universal Links.
- `/verify-email` hỗ trợ cả token đăng ký và token đổi email qua
  `mode=email-change` hoặc `purpose=profile-email-change`; có fallback cho mẫu
  email cũ không kèm mode.
- Sau đổi hoặc đặt lại mật khẩu, app xóa token, cache và context chấm công rồi
  đưa người dùng về login vì backend đã thu hồi toàn bộ session.

### Hồ sơ

- `PATCH /auth/me` chỉ còn gửi đúng 5 field được backend chấp nhận:
  `displayName`, `dateOfBirth`, `hometown`, `gender`, `address`.
- Email và phone được tách thành hai flow xác minh riêng.
- Đổi phone: request OTP, nhập OTP, confirm và cập nhật store/cache từ profile
  backend trả về.
- Đổi email: request link tới email mới; khi link đi qua route frontend, profile
  được đồng bộ ngay. Khi backend mở link API trực tiếp, màn hồ sơ tự refetch lúc
  người dùng quay lại app.
- Hiển thị trạng thái `emailVerified` và `phoneVerified`.
- Avatar dùng multipart field `file`, giới hạn/chuẩn hóa ảnh phía client và nhận
  lại toàn bộ `UserProfileResponse`; đã có cả thao tác xóa avatar.

### Phiên đăng nhập và 2FA

- Thêm màn `/sessions`: danh sách thiết bị, IP, user-agent, lần hoạt động gần
  nhất, badge thiết bị hiện tại, thu hồi từng phiên và đăng xuất các máy khác.
- Không cho thu hồi nhầm phiên hiện tại từ danh sách.
- TOTP setup mở trang QR backend và hiển thị manual key, xác nhận mã rồi bắt buộc
  người dùng lưu bộ backup codes chỉ hiển thị một lần.
- Login 2FA cho chọn mã TOTP hoặc backup code.
- Tắt 2FA yêu cầu đúng một trong ba bằng chứng: mật khẩu, mã TOTP hoặc backup
  code; không còn gửi body rỗng.

## 3. Bằng chứng kiểm tra

### Kiểm tra mã nguồn và bundle

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| ESLint | PASS | `npm run lint`, 0 lỗi/0 cảnh báo |
| TypeScript | PASS | `npx tsc --noEmit` |
| Quality gate | PASS | `npm run quality` |
| Expo web export | PASS | 51 static routes; có `/verify-email`, `/reset-password`, `/sessions`, `/2fa-verify` |
| Expo Android/iOS JS export | PASS | Sinh Hermes bundle cho cả Android và iOS bằng `expo export --platform all` |
| Expo public config | PASS | scheme `famsfrontappproject`, Android/iOS ID `com.fams.mobile` |
| Android Firebase config | PASS CONFIG | `google-services.json` tồn tại và được Expo nhận |
| iOS Firebase config | BLOCKED CONFIG | Chưa có `GoogleService-Info.plist` |

Bundle kiểm thử cuối được ghi vào `/tmp/fams-front-all-export-final-20260724`, không thêm
build artifact vào repository.

### Kiểm tra tích hợp backend thật

Backend mục tiêu: API LAN từ `EXPO_PUBLIC_API_URL`. Không ghi access token,
refresh token, OTP hoặc client ID vào tài liệu.

| Case | HTTP/kết quả | Kết luận |
|---|---:|---|
| Login email + password, device A | 200 | PASS |
| Login email + password, device B | 200 | PASS |
| `GET /auth/me` | 200 | PASS |
| `GET /auth/sessions` | 200, `data` là array | PASS |
| Session đủ 8 field theo contract | Đủ | PASS |
| Thu hồi riêng device B | 200 | PASS |
| Refresh token của device B sau thu hồi | 401 | PASS |
| Logout device A | 200 | PASS |
| Refresh token của device A sau logout | 401 | PASS |
| Request đổi email sai định dạng | 400 | PASS validation |
| Request/confirm đổi phone sai định dạng | 400/400 | PASS validation |
| Confirm email với token giả | 400 | PASS validation |
| Forgot password email không tồn tại | 200 | PASS chống lộ tài khoản |
| Google ID token giả | 401 | PASS security |
| Tắt TOTP khi chưa bật | 400 | PASS state guard |

## 4. Ma trận nghiệm thu tính năng

| Tính năng | Frontend | API live | Thiết bị thật |
|---|---|---|---|
| Login email/password | Hoàn tất | PASS | Cần smoke test |
| Login phone/password | Hoàn tất, chung endpoint | Contract đã đối chiếu | Cần tài khoản phone test |
| Đăng ký email + verify link | Hoàn tất | Validation/route PASS | Cần hộp thư thật |
| Đăng ký phone + OTP | Hoàn tất | Đã hoạt động theo xác nhận trước | Cần SMS + Development Build |
| Quên/đặt lại mật khẩu | Hoàn tất | Forgot privacy PASS | Cần email/token thật |
| Google login + đồng bộ | Hoàn tất | Token giả bị chặn đúng | Cần Google consent thật |
| Đổi email | Hoàn tất | Validation PASS | Cần email/token thật |
| Đổi phone | Hoàn tất | Validation PASS | Cần SMS/OTP thật |
| Cập nhật hồ sơ | Hoàn tất | GET profile PASS | Cần smoke test thao tác |
| Upload/xóa avatar | Hoàn tất | Contract đã đối chiếu | Cần ảnh và tài khoản test |
| Quản lý session | Hoàn tất | Happy path PASS | Cần kiểm tra bố cục máy thật |
| TOTP + backup code | Hoàn tất flow; chờ field trạng thái profile | Guard PASS | Cần Authenticator thật |

Không đánh dấu các case phụ thuộc người dùng là PASS giả. Máy làm việc hiện không
có `adb`, Chromium/Playwright hoặc iOS toolchain nên không thể tự thao tác consent,
SMS và ứng dụng Authenticator trên thiết bị thật.

## 5. Cấu hình còn cần để nghiệm thu Android/iOS

### Android — hướng miễn phí, nên dùng để test trước

1. Firebase bật Phone và Google provider.
2. Android OAuth client khớp package `com.fams.mobile` và SHA-1/SHA-256 của
   development keystore.
3. Tạo/cài Development Build bằng `npm run build:dev:android`.
4. Chạy Metro LAN bằng `npm run start:dev-client:lan`; điện thoại phải truy cập
   được IP backend trong `.env`.

Expo Go không thể chạy Firebase Phone Auth hoặc native Google Sign-In của FAMS;
nghiệm thu Android/iOS phải dùng Development Build.

### iPhone

- Còn thiếu `GoogleService-Info.plist`. iOS URL scheme đã có trong Expo config;
  khi nhận plist mới vẫn phải đối chiếu nó với `REVERSED_CLIENT_ID` trong file.
- Miễn phí: cần Mac + Xcode + Apple ID Personal Team, prebuild và cài trực tiếp;
  chữ ký cá nhân phải gia hạn định kỳ.
- EAS cài lên iPhone/TestFlight thường cần Apple Developer Program trả phí.
- Sau khi bổ sung plist, cùng một code frontend sẽ chạy cả iOS và Android; iOS
  Phone Auth dùng silent APNs nếu có và fallback reCAPTCHA khi cần.

## 6. Ghi chú link email backend

Backend hiện đã dùng `APP_FRONTEND_URL` cho xác minh đăng ký và reset password.
Đây là thay đổi đúng và tài liệu 08 đã được cập nhật trạng thái lịch sử.

Riêng xác nhận đổi email hồ sơ hiện dùng link API trực tiếp theo contract:

```text
{APP_BASE_URL}/api/v1/auth/profile/email/confirm-change?token=...
```

Link này xác nhận được nhưng trình duyệt chỉ hiện JSON. Nếu muốn UX đẹp và mở
app, cấu hình proxy/template sang:

```text
{APP_FRONTEND_URL}/verify-email?token=...&mode=email-change
```

Frontend đã hỗ trợ route này; không có thay đổi backend nào được tự động thực
hiện trong đợt này.

Các đề xuất backend còn lại, đặc biệt field `totpEnabled`, được ghi riêng tại
`docs/10_BACKEND_NOTES_AUTH_CON_LAI_2026-07-24.md`.

## 7. Checklist test tay cuối cùng

Thực hiện lần lượt trên Android trước, sau đó lặp lại trên iPhone:

1. Login email, logout, login phone bằng password.
2. Đăng ký phone, nhận OTP, nhập sai một lần rồi nhập đúng.
3. Đăng ký email, mở verify link từ Mail, xác nhận app/web về trạng thái thành công.
4. Forgot password, mở link, đặt password mới; xác nhận mọi phiên cũ bị logout.
5. Google login lần đầu; logout và login lại; link/unlink Google trong Hồ sơ.
6. Đổi email và phone; kiểm tra định danh cũ còn dùng được trước confirm, định
   danh mới chỉ dùng được sau confirm.
7. Upload, thay và xóa avatar.
8. Login cùng tài khoản ở hai máy; thu hồi máy còn lại trong `/sessions`.
9. Bật TOTP, lưu backup codes, login bằng TOTP rồi bằng một backup code, sau đó
   tắt TOTP bằng một trong ba bằng chứng hợp lệ.

Ảnh kiểm thử giao diện web trước đó được giữ tại
`docs/test-evidence/auth-2026-07-23/`.
