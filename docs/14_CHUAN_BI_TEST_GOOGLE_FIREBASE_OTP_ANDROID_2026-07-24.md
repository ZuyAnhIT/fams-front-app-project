# 14. Chuẩn bị test Google và Firebase OTP Android — 24/07/2026

## Phần Codex đã tự động hoàn thành

- Expo native config nhận đúng package Android `com.fams.mobile`.
- Firebase app/auth plugins đã có trong native config.
- `google-services.json` tồn tại, thuộc Firebase project `phone-fams` và khớp
  package Android.
- Backend có cấu hình `FCM_PROJECT_ID`, Firebase service account và
  `GOOGLE_CLIENT_ID`.
- Phát hiện và sửa Google audience bị lệch:
  - frontend cũ: client ID bắt đầu bằng `101279...`;
  - backend đang dùng: client ID bắt đầu bằng `302681...`;
  - frontend `.env` đã đồng bộ theo backend.
- Thêm lệnh preflight:

  ```bash
  npm run check:auth-native
  ```

- ESLint và TypeScript: PASS.

## Trạng thái EAS

EAS CLI đang đăng nhập:

```text
username: zuyanhit
email:    anhtrauluoi@gmail.com
```

Ban đầu tài khoản này không có quyền đọc EAS project:

```text
e0abbdee-9b61-422d-b997-416a40e921cd
```

Vì vậy tại thời điểm đó Codex chưa thể đọc development keystore/SHA hoặc chạy
EAS build.

Đã kiểm tra lại sau khi người dùng xác nhận đăng nhập đúng tài khoản:

```text
Ngày kiểm tra: 24/07/2026
EAS user:      zuyanhit
Kết quả:       Entity not authorized (action = READ)
Request ID:    ce527ccc-355c-4f41-b5fe-fe5ee0cc18fd
```

Kết luận: phiên đăng nhập hoạt động, nhưng quyền project chưa được cấp cho
`zuyanhit`. Đăng nhập lại cùng tài khoản sẽ không giải quyết được lỗi quyền.

### Cập nhật sau khi cấp quyền Admin

EAS đã xác nhận:

```text
Account cá nhân: zuyanhit (Owner)
Organization:    fams-project (Admin)
Project:         @fams-project/fams-front-app-project
Project ID:      e0abbdee-9b61-422d-b997-416a40e921cd
```

Android development credential hiện tại:

```text
Package: com.fams.mobile
SHA-1:   D8:51:6C:79:47:DF:AC:93:75:C3:1F:31:6C:D1:08:AF:12:30:12:93
SHA-256: C2:84:50:54:C6:F0:D7:E0:92:4F:AE:E0:C6:49:8A:49:44:03:65:D0:8E:8E:AC:87:E4:DA:51:7E:80:D8:9D:E4
```

Đã tạo EAS Development environment:

- `EXPO_PUBLIC_API_URL=http://192.168.1.11:8080/api/v1`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` khớp `GOOGLE_CLIENT_ID` backend
- `EXPO_PUBLIC_AVATAR_UPLOAD_URL=/auth/profile/avatar`
- `EXPO_PUBLIC_MOBILE_LOGIN_URL=famsfrontappproject://login`
- `EXPO_ANDROID_GOOGLE_SERVICES_FILE` là file secret

Đã gửi Android Development Build:

```text
Build ID: 2a17b0ee-bafe-41ed-bccc-7dd598e0c343
Profile:  development
Type:     APK / internal distribution
Status:   FINISHED
APK:      https://expo.dev/artifacts/eas/xNDoqTDbug7OuNayPuTMccBTFt96E-eDVp_--08bAiU.apk
```

## Việc người dùng bắt buộc làm trên Console

1. Firebase project `phone-fams` → Project settings → Android app
   `com.fams.mobile`: thêm SHA-1 và SHA-256 ở trên.
2. Firebase Authentication → Sign-in method: bật Phone.
3. Firebase Authentication → Settings → SMS region policy: cho phép Việt Nam
   nếu test số Việt Nam.
4. Nên thêm một fictional test phone + OTP 6 số cố định để test không tốn SMS
   và tránh rate limit.
5. Google Cloud project sở hữu Web Client ID `302681...`: tạo/kiểm tra OAuth
   client loại Android với package `com.fams.mobile` và SHA-1 ở trên.

## Hai Google/Firebase project đang tách riêng

- Firebase Phone Auth:
  - project ID: `phone-fams`;
  - project number: `32347965394`.
- Google backend audience:
  - Web OAuth client bắt đầu bằng project number `302681872079`.

Việc tách project có thể hoạt động, nhưng sau khi có SHA cần cấu hình đúng:

- SHA-1/SHA-256 vào Firebase Android app `phone-fams` để Phone Auth hoạt động;
- Android OAuth client có package `com.fams.mobile` + SHA-1 trong Google Cloud
  project sở hữu Web Client ID `302681...` để Google Sign-In native hoạt động.

`google-services.json` hiện không có OAuth client. Preflight ghi cảnh báo thay
vì fail vì Google OAuth có thể nằm ở Cloud project riêng như cấu hình hiện tại.

## Chưa thực hiện

- Android Development Build đã hoàn tất.
- Chưa cài APK vì máy hiện không có `adb`; người dùng tải/cài APK trực tiếp
  trên Android.
- Chưa chạy happy path Google/Firebase OTP thật vì cần APK và thao tác consent/
  nhập OTP trên thiết bị.
