# Hướng dẫn test Google Sign-In và Firebase Phone OTP trên Android

## 1. Trạng thái đã chuẩn bị tự động

- IP LAN hiện tại: `192.168.1.12`.
- App local: `http://192.168.1.12:8080/api/v1`.
- EAS Development đã được cập nhật sang cùng API URL.
- Backend, PostgreSQL, Redis, AI và MinIO đang chạy; `/api/v1/auth/health`
  trả HTTP 200.
- Package Android: `com.fams.mobile`.
- Web Client ID App và Backend đang trùng nhau.
- Firebase Phone Auth dùng project `phone-fams` (project number
  `32347965394`); Google Sign-In dùng OAuth project của Web Client ID có
  project number `302681872079`. Đây là cấu hình hai project có chủ đích.
- `google-services.json` đã được kiểm tra hợp lệ cho `phone-fams`; trường
  `oauth_client` trống không phải lỗi trong cấu hình hai project này.
- API Google và Firebase OTP nhận request đúng; token giả trả 401 thay vì 500.
- EAS project: `@fams-project/fams-front-app-project`
  (`e0abbdee-9b61-422d-b997-416a40e921cd`).

Development signing certificate hiện tại:

```text
SHA-1
D8:51:6C:79:47:DF:AC:93:75:C3:1F:31:6C:D1:08:AF:12:30:12:93

SHA-256
C2:84:50:54:C6:F0:D7:E0:92:4F:AE:E0:C6:49:8A:49:44:03:65:D0:8E:8E:AC:87:E4:DA:51:7E:80:D8:9D:E4
```

## 2. Việc bắt buộc làm thủ công trên Firebase Console

Mở Firebase Console, chọn project **`phone-fams`**.

### 2.1 Cập nhật Android App

1. Project settings → General → Your apps.
2. Chọn Android App có package `com.fams.mobile`.
3. Add fingerprint và thêm cả SHA-1, SHA-256 ở trên.
4. Lưu, đợi khoảng 5–10 phút.
5. Có thể tải lại `google-services.json`. Việc thêm fingerprint/provider là cấu
   hình phía server nên nội dung hoặc thời gian file tải về không nhất thiết
   thay đổi; file hiện tại vẫn hợp lệ nếu project/package/API key không đổi.
6. Chép đè file mới vào:

```text
/home/duyanh/Projects/FAMS/fams-front-app-project/google-services.json
```

Không commit file này; dự án đã ignore đúng.

### 2.2 Bật Google provider

1. Trong Google Cloud project đang sở hữu Web Client ID `302681872079-...`, mở
   APIs & Services → Credentials và kiểm tra:
   - một OAuth client loại **Android** với package `com.fams.mobile` và SHA-1
     Development ở trên;
   - Web Client ID đang dùng trong App/Backend:
     `302681872079-7k8vufpipe4hganrs51dk0f77b30rrm3.apps.googleusercontent.com`.
2. Nếu Google Sign-In của hệ thống còn dùng Firebase Authentication cho project
   OAuth này, bật Google provider tại đúng project tương ứng. Firebase project
   `phone-fams` chủ yếu phục vụ Phone Auth và không bắt buộc phải chứa Web Client
   ID `302681...` trong `google-services.json`.

App luôn dùng Web Client ID để xin ID token cho Backend; không thay biến App bằng
Android Client ID.

### 2.3 Bật Phone provider

1. Firebase Authentication → Sign-in method → Phone → Enable.
2. Authentication → Settings → Authorized domains: giữ cấu hình hợp lệ của
   project; Android native không dùng localhost redirect của Web.
3. Để test không tốn quota SMS, có thể thêm một **Phone number for testing** và
   mã OTP cố định. Số này vẫn phải tồn tại trong tài khoản FAMS thì endpoint
   đăng nhập mới thành công.
4. Nếu dùng SMS thật, kiểm tra SMS region policy/quota và nhập số đã đăng ký ở
   FAMS. App tự đổi `0912...` thành `+84912...`.

## 3. Việc Codex đã thực hiện sau khi kiểm tra cấu hình

Codex đã:

1. kiểm tra project/package trong file và cấu hình OAuth riêng;
2. cập nhật EAS file secret `EXPO_ANDROID_GOOGLE_SERVICES_FILE`;
3. chạy lint, typecheck và toàn bộ test App thành công;
4. gửi Android Development Build mới lên EAS với build ID
   `ea1ef8ab-7d55-4e26-bdec-ea99cbce9468`.

Sau khi build hoàn tất, Codex gửi link tải APK. Khi bạn đã cài APK và sẵn sàng
thao tác, khởi động Metro Development Client để theo dõi log trực tiếp.

## 4. Test thủ công Google Sign-In

Phải dùng **FAMS Development Build**, không dùng Expo Go.

1. Cài APK Development mới lên Android.
2. Máy tính và điện thoại nối cùng Wi-Fi; tắt VPN/mobile data nếu làm sai route.
3. Trên máy tính chạy:

```bash
cd /home/duyanh/Projects/FAMS/fams-front-app-project
npm run start:dev-client:lan
```

4. Mở FAMS Development Build → kết nối Metro → Đăng nhập.
5. Bấm **Đăng nhập bằng Google** và chọn tài khoản.
6. Kỳ vọng:
   - không có `DEVELOPER_ERROR`/mã 10;
   - không quay vòng vô hạn;
   - tài khoản một tenant vào Home;
   - tài khoản nhiều tenant vào màn chọn công ty;
   - mở Hồ sơ thấy trạng thái Google đã liên kết.
7. Test bổ sung:
   - hủy hộp chọn tài khoản: vẫn ở Login, không báo lỗi máy chủ;
   - email/password đã tồn tại rồi đăng nhập Google cùng email: không sinh user
     trùng;
   - logout rồi Google login lại;
   - link/unlink Google trong Hồ sơ.

Lưu ý: theo contract Backend hiện tại, Google login không yêu cầu bước TOTP của
FAMS.

## 5. Test thủ công Firebase Phone OTP

Đây là **đăng nhập nhanh**, khác OTP đăng ký do Backend gửi.

1. Tài khoản FAMS phải có số điện thoại tương ứng và đã đăng ký trước.
2. Từ Login chọn **Đăng nhập OTP**.
3. Nhập số local, ví dụ `0912345678`; App gửi Firebase dạng `+84912345678`.
4. Bấm Gửi OTP.
5. Nhập mã SMS thật hoặc mã test Firebase.
6. Kỳ vọng:
   - Firebase xác minh mã và trả ID token;
   - App chỉ gửi ID token cho `POST /auth/otp/verify`;
   - Backend trả JWT FAMS;
   - một tenant → Home, nhiều tenant → chọn công ty;
   - nếu tài khoản đã bật TOTP → chuyển tiếp tới màn nhập TOTP FAMS.
7. Test lỗi:
   - OTP sai;
   - OTP hết hạn;
   - gửi lại sau countdown;
   - số Firebase xác minh được nhưng chưa tồn tại trong FAMS → 401
     `INVALID_OTP`; cần đăng ký tài khoản trước;
   - vượt quota/rate limit → nút không được spam liên tục.

## 6. Mẫu thông tin cần gửi khi lỗi

Không gửi OTP, Firebase ID token, access token hoặc password. Chỉ gửi:

```text
Thiết bị / Android version:
Tính năng: Google hay OTP
Bước bị lỗi:
Thông báo trên màn hình:
Thời điểm xảy ra:
Ảnh màn hình đã che thông tin nhạy cảm:
```

Giữ terminal Metro và Backend mở để Codex đối chiếu log theo thời điểm, nhưng
không sao chép token/secret vào báo cáo.
