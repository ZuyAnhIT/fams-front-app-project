# 07. Triển khai Auth native và Deep Link — 23/07/2026

## 1. Phạm vi đợt triển khai

Đợt này chỉ thay đổi `fams-front-app-project`. Không sửa, build hoặc chạy
`fams-backend-project`.

Mục tiêu:

1. Chạy Phone OTP và Google Sign-In bằng FAMS Development Build trên Android/iOS.
2. Mở màn reset password và verify email từ custom scheme khi phát triển.
3. Chuẩn bị Android App Links và iOS Universal Links cho domain HTTPS.
4. Giữ cùng route, validation và API contract trên web, Android và iOS.

## 2. Thay đổi frontend

### Native Auth

- Giữ Firebase Phone Auth native cho Android/iOS; Expo Go hiển thị cảnh báo rõ
  thay vì được coi là môi trường test hỗ trợ.
- Google native dùng `@react-native-google-signin/google-signin` trong Development
  Build và Web Client ID làm audience của ID token gửi backend. Web dùng Google
  Identity Services; Expo Go hiển thị hướng dẫn cài Development Build.
- Chuyển nhận diện Expo Go sang `Constants.executionEnvironment`.
- Bổ sung script build/chạy Development Build trong `package.json`.
- Bật `fetch` và `remote-notification` trong iOS background modes để chuẩn bị cho
  Firebase Phone Auth silent APNs. Firebase vẫn có thể fallback sang reCAPTCHA.

### Reset password và verify email

- Custom scheme dùng đúng tên đã khai báo:

  ```text
  famsfrontappproject://reset-password?token=<token>
  famsfrontappproject://verify-email?token=<token>
  ```

- HTTPS route dùng chung cho web/App Links/Universal Links:

  ```text
  https://<frontend-domain>/reset-password?token=<token>
  https://<frontend-domain>/verify-email?token=<token>
  ```

- Query chỉ chấp nhận đúng một token dạng chuỗi, không chấp nhận token rỗng hoặc
  query lặp.
- Verify email chặn việc React development effect gọi API one-time token hai lần.
- Reset password map request thành đúng DTO backend:

  ```json
  {
    "token": "<token>",
    "newPassword": "NewPassword1"
  }
  ```

- Validation password frontend đã đồng bộ yêu cầu chữ hoa, chữ thường, chữ số và
  tối thiểu 8 ký tự.

### HTTPS App Links/Universal Links

Khi build có biến sau:

```env
EXPO_PUBLIC_APP_URL=https://staging-app.fams.vn
```

`app.config.ts` tự sinh:

- Android intent filter cho `/reset-password` và `/verify-email`.
- iOS associated domain `applinks:staging-app.fams.vn`.

Biến chỉ nhận HTTPS origin, không nhận path, query, port hoặc hash. Nếu chưa có
domain, app vẫn dùng custom scheme trong Development Build.

## 3. Cấu hình còn phải cung cấp

### Android

Trạng thái hiện tại:

- `google-services.json`: có file và package khớp `com.fams.mobile`.
- File hiện chưa chứa Android/Web OAuth client. Cần thêm SHA-1/SHA-256 của
  development keystore vào Firebase/Google Cloud rồi tải lại file nếu Firebase
  Console yêu cầu.

Checklist:

1. Firebase Authentication bật Phone và Google provider.
2. Google Cloud có Android OAuth client cho `com.fams.mobile` và đúng SHA-1.
3. `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` là OAuth client loại Web, cùng giá trị
   `GOOGLE_CLIENT_ID` ở backend.
4. `EXPO_PUBLIC_API_URL` là HTTPS staging hoặc IP LAN mà điện thoại truy cập được;
   không dùng `localhost` trên điện thoại.

### iOS

Trạng thái hiện tại: chưa có local `GoogleService-Info.plist`, vì vậy chưa thể
xác minh native build iOS.

Checklist:

1. Firebase iOS app dùng bundle ID `com.fams.mobile`.
2. Đặt `GoogleService-Info.plist` ở root hoặc truyền qua EAS file secret
   `EXPO_IOS_GOOGLE_SERVICES_FILE`.
3. `EXPO_PUBLIC_IOS_GOOGLE_URL_SCHEME` phải bằng `REVERSED_CLIENT_ID` trong plist.
4. Google provider đã bật; iOS OAuth client khớp bundle ID.
5. Để kiểm thử silent APNs production-like, upload APNs key vào Firebase.
   Nếu chưa có, kiểm thử fallback reCAPTCHA trên iPhone.

## 4. Lệnh build và chạy

### Android Development Build

```bash
npm run build:dev:android
npm run start:dev-client:lan
```

Cài APK EAS lên điện thoại, sau đó mở ứng dụng **FAMS**, không mở Expo Go.

### iPhone qua EAS

Yêu cầu Apple Developer Program:

```bash
eas device:create
npm run build:dev:ios
npm run start:dev-client:lan
```

### iPhone miễn phí qua Mac/Xcode

1. Cung cấp `GoogleService-Info.plist`.
2. Chạy `npx expo prebuild --platform ios` trên Mac.
3. Mở workspace trong thư mục `ios`, chọn Apple ID Personal Team và iPhone thật.
4. Build/Run từ Xcode. Bản Personal Team phải ký/cài lại định kỳ.

## 5. Kiểm tra link thủ công

Custom scheme trong Development Build:

```bash
npx uri-scheme open "famsfrontappproject://reset-password?token=frontend-test" --android
npx uri-scheme open "famsfrontappproject://verify-email?token=frontend-test" --android
```

Trên Mac đổi `--android` thành `--ios`. Token mẫu chỉ chứng minh điều hướng; API
sẽ từ chối vì không phải token thật.

HTTPS App Links/Universal Links chỉ được coi là hoàn tất sau khi:

1. Frontend đã deploy và URL không có `.html` vẫn trả đúng route.
2. Domain phục vụ hai association file trong `/.well-known/`.
3. Build được tạo với đúng `EXPO_PUBLIC_APP_URL`.
4. Link được mở từ Notes/Mail trên thiết bị thật.

## 6. Kết quả kiểm tra tại workspace

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| TypeScript | PASS | `npm run typecheck` |
| ESLint | PASS | `npm run lint` |
| Expo config không có public domain | PASS | Config vẫn có custom scheme |
| Expo config giả lập domain staging | PASS | Sinh Android intent filters và iOS associated domain đúng hai route |
| Web static export | PASS | Sinh `reset-password.html` và `verify-email.html` |
| Android/iOS JS export | PASS | Sinh Hermes bundle riêng cho cả Android và iOS |
| Android native prebuild | PASS | Manifest có đúng package, Google Services plugin và hai HTTPS path |
| iOS native prebuild | BLOCKED | Firebase config plugin yêu cầu `GoogleService-Info.plist` |
| Expo Doctor | PASS | 18/18 checks |
| Android Firebase package | PASS | `google-services.json` khớp `com.fams.mobile` |
| Android OAuth credential | BLOCKED | File config hiện chưa có OAuth client; cần thao tác Firebase/Google Cloud |
| iOS Firebase config | BLOCKED | Thiếu `GoogleService-Info.plist` |
| OTP/Google trên thiết bị thật | CHƯA CHẠY | Cần cài Development Build và credential tương ứng |
| HTTPS link từ email | BLOCKED BACKEND | Backend còn tạo URL API/localhost; xem tài liệu 08 |

Không ghi token thật, OTP, client ID hoặc nội dung credential vào tài liệu.
Workspace hiện không có `adb`, nên chưa thể cài APK/thu log Android tại máy này.

## 7. Ma trận nghiệm thu thiết bị

Sau khi đủ credential, thực hiện cùng một bộ case trên Android và iOS:

| Case | Android | iOS |
|---|---|---|
| Password login bằng email | Chờ test thiết bị | Chờ test thiết bị |
| Password login bằng phone | Chờ test thiết bị | Chờ test thiết bị |
| Phone OTP gửi mã, xác nhận, đổi số, gửi lại | Chờ test Development Build | Chờ test Development Build/reCAPTCHA |
| Google login mới | Chờ test Development Build | Chờ test Development Build |
| Google ghép tài khoản cùng email | Chờ test | Chờ test |
| Reset link mở app và đổi mật khẩu | Chờ backend URL + token thật | Chờ backend URL + token thật |
| Verify link mở app và xác minh | Chờ backend URL + token thật | Chờ backend URL + token thật |
