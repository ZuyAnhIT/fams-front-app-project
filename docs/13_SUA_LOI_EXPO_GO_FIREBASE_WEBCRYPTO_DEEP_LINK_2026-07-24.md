# 13. Sửa lỗi Expo Go, WebCrypto và quay lại app — 24/07/2026

## 1. Lỗi Expo Go khi mở app

### Hiện tượng

```text
Route "./(auth)/phone-login.tsx" is missing the required default export
Native module RNFBAppModule not found
```

Route thực tế có `export default`. Cảnh báo route chỉ là hệ quả: module bị crash
trước khi Expo Router đọc được component vì
`use-firebase-phone-auth.ts` import `@react-native-firebase/auth` ngay ở cấp
module. Expo Go không chứa `RNFBAppModule`.

### Cách sửa

- Chỉ import type Firebase ở cấp module.
- Kiểm tra Expo Go trước.
- Chỉ dynamic-import Firebase Auth khi người dùng thực sự gửi OTP trong
  Development Build.
- Tách `isExpoGo()` sang `src/features/auth/runtime.ts`, không kéo theo Google
  AuthSession hoặc module native.

Kết quả: Expo Go có thể nạp route và toàn bộ app bình thường; màn OTP hiển thị
thông báo cần Development Build thay vì làm app crash. Việc gửi OTP Firebase
thật vẫn cần Development Build, đây là giới hạn kỹ thuật của Expo Go.

## 2. Lỗi WebCrypto trên link email LAN

### Hiện tượng

```text
Access to the WebCrypto API is restricted to secure origins (localhost/https).
```

Trang reset/verify không cần WebCrypto. Lỗi đến từ chuỗi import:

```text
login/phone-login
  -> google-sign-in-service / use-google-login
  -> expo-auth-session
  -> expo-crypto
```

`expo-crypto` từ chối origin LAN HTTP `http://192.168.1.155:3000`.

### Cách sửa

- Bỏ `expo-auth-session` khỏi đường chạy đăng nhập hiện tại.
- Web tiếp tục dùng Google Identity Services, nhận Google ID token trực tiếp.
- Development Build tiếp tục dùng native Google Sign-In SDK.
- Expo Go hiển thị hướng dẫn Development Build, không cố chạy OAuth native.
- Bỏ `WebBrowser.maybeCompleteAuthSession()` không còn cần thiết.

Bundle web sau sửa không còn chứa thông báo WebCrypto trên.

## 3. Nút quay lại Expo Go

Link email mở trong Safari/Chrome nên router web không thể tự hiểu rằng cần quay
lại Expo Go. Frontend thêm biến:

```env
EXPO_PUBLIC_MOBILE_LOGIN_URL=exp://192.168.1.155:8082/--/login
```

Khi mở `/verify-email` trên web LAN:

- nút cuối đổi thành **Mở ứng dụng FAMS**;
- trình duyệt mở đúng màn `/login` trong Expo Go qua Metro `8082`.

Sau khi reset password thành công, frontend cũng dùng cùng URL để quay lại app.

Khi chuyển sang Development Build, đổi giá trị thành:

```env
EXPO_PUBLIC_MOBILE_LOGIN_URL=famsfrontappproject://login
```

Staging/production nên dùng HTTPS App Links/Universal Links thay cho URL
`exp://`.

## 4. Lệnh chạy khi test LAN

Terminal app/Expo Go:

```bash
npm run start:go:lan
```

Terminal giao diện link email:

```bash
npm run start:web:auth:lan
```

Sau khi thay `.env`, phải restart Metro web. Sau thay source, trên Expo Go nhấn
Reload hoặc đóng/mở lại project để nhận bundle mới.

## 5. Kết quả kiểm tra

| Kiểm tra | Kết quả |
|---|---|
| ESLint | PASS |
| TypeScript | PASS |
| `git diff --check` | PASS |
| iOS export/bundle | PASS |
| Web static export | PASS; 51 route |
| Web bundle còn chuỗi lỗi WebCrypto | Không |
| `GET /verify-email?token=test` qua IP LAN | HTTP 200 |
| SSR verify-email | Có nút `Mở ứng dụng FAMS` |
| Route phone-login | Có default export; Firebase chỉ được nạp động |

Không dùng token thật trong ảnh/log để test lại. Hãy yêu cầu token mới vì token
xác thực/reset là dữ liệu nhạy cảm và thường chỉ dùng một lần.
