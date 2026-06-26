# Google Login + EAS Build — Hướng dẫn chi tiết

## Vì sao lỗi `400: invalid_request` với `redirect_uri=exp://192.x.x.x:8081`?

| Môi trường | Redirect URI | Google chấp nhận? |
|------------|--------------|-------------------|
| **Expo Go** | `exp://192.168.x.x:8081` | ❌ Không (trừ khi đăng ký thủ công, IP đổi liên tục) |
| **EAS Dev Build** | Native SDK — không qua `exp://` | ✅ (chỉ cần Web Client ID) |
| **Web** | `http://localhost:...` | ✅ (thêm vào Authorized JavaScript origins) |

**Kết luận:** Không dùng Expo Go cho Google Login. Dùng **EAS Development Build**.

---

## Bước 1 — Google Cloud Console

1. [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)

### Web application (bắt buộc — dùng làm `webClientId` + backend)

2. OAuth client loại **Web application**
3. **Authorized JavaScript origins** (cho web / test HTML):
   - `http://localhost:8080`
   - `http://192.168.1.148:8080` (IP máy chạy backend)
4. **Authorized redirect URIs** (cho web / auth-session):
   - `famsfrontappproject://oauthredirect`
5. Copy **Client ID** → cùng giá trị:
   - Backend: `GOOGLE_CLIENT_ID`
   - App: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`

### Android application (bắt buộc cho native Sign-In trên Android)

> Native `@react-native-google-signin` trên Android **cần** OAuth client Android với SHA-1. Chỉ có Web client sẽ gây `DEVELOPER_ERROR`.

6. Create OAuth client → **Android**
7. **Package name:** `com.fams.mobile`
8. **SHA-1 certificate fingerprint:** lấy từ EAS:
   ```bash
   eas credentials -p android
   ```
   Chọn profile `development` → xem keystore → copy **SHA-1**
9. Lưu — đợi 5–10 phút để Google cập nhật

> `webClientId` trong code vẫn là **Web Client ID**, không phải Android Client ID.

---

## Bước 2 — Cấu hình app (đã có trong repo)

**`.env`**
```env
EXPO_PUBLIC_USE_MOCK_API=false
EXPO_PUBLIC_API_URL=http://192.168.1.148:8080/api/v1
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web-client-id>.apps.googleusercontent.com
```

**`app.json`** — đã có:
- `scheme`: `famsfrontappproject`
- `android.package` / `ios.bundleIdentifier`: `com.fams.mobile`
- Plugin `@react-native-google-signin/google-signin` với `iosUrlScheme`

---

## Bước 3 — Cài EAS CLI & đăng nhập

```bash
npm install -g eas-cli
eas login
```

Trong thư mục `fams-front-app-project`:

```bash
cd fams-front-app-project
eas build:configure
```

(Lần đầu sẽ hỏi tạo project trên expo.dev — chọn Yes)

---

## Bước 4 — Build Development Client (khuyến nghị)

### Android (APK cài trực tiếp)

```bash
eas build --profile development --platform android
```

- Build xong → tải APK từ link Expo dashboard
- Cài APK lên điện thoại Android
- Chạy Metro:

```bash
npx expo start --dev-client
```

- Mở app **FAMS dev client** (không mở Expo Go) → quét QR

### iOS (cần Apple Developer hoặc simulator)

**Thiết bị thật:**
```bash
eas build --profile development --platform ios
```

**Simulator (không cần Apple ID trả phí):**
```bash
eas build --profile development-simulator --platform ios
```

Sau khi cài dev client:
```bash
npx expo start --dev-client
```

---

## Bước 5 — Test Google Login

1. Backend chạy: `docker compose up -d` (trong `fams-backend-project`)
2. Điện thoại và máy backend **cùng WiFi**
3. `EXPO_PUBLIC_API_URL` trỏ đúng IP LAN máy backend
4. Mở app dev client → Login → **Đăng nhập bằng Google**
5. Flow:
   - Native Google picker (không qua `exp://`)
   - App nhận **ID token**
   - `POST /api/v1/auth/login/google` → JWT FAMS

---

## Các profile EAS (`eas.json`)

| Profile | Mục đích |
|---------|----------|
| `development` | Dev client + APK/IPA, debug, `expo-dev-client` |
| `development-simulator` | iOS Simulator only |
| `preview` | APK nội bộ QA, không dev menu |
| `production` | Store release |

**Preview / Production:**
```bash
eas build --profile preview --platform android
eas build --profile production --platform android
```

---

## So sánh Expo Go vs EAS Dev Build

| | Expo Go | EAS Dev Build |
|---|---------|---------------|
| Google Login | ❌ `exp://` invalid_request | ✅ Native SDK |
| Custom native modules | Hạn chế | ✅ Đầy đủ |
| Cài đặt | Chỉ cần Expo Go app | Cài APK/IPA một lần |
| Phù hợp FAMS | Không | **Có** |

---

### Crash: `ComposeViewFunctionDefinitionBuilder` / `ExpoUIModule`

**Nguyên nhân:** Package `@expo/ui` (beta) không tương thích với Expo SDK 54 trong EAS build — native module crash khi mở app.

**Cách xử lý:** Đã gỡ `@expo/ui` và `expo-glass-effect` (không dùng trong app). **Build lại:**

```bash
eas build --profile development --platform android --clear-cache
```

### `DEVELOPER_ERROR` trên Android

**Nguyên nhân:** Chưa tạo OAuth client **Android** hoặc SHA-1 keystore EAS chưa đăng ký.

**Cách xử lý:**
1. `eas credentials -p android` → profile `development` → copy **SHA-1**
2. Google Console → Create OAuth client → **Android**
3. Package: `com.fams.mobile`, SHA-1: dán từ bước 1
4. Giữ `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` = Web Client ID (không đổi sang Android Client ID)
5. Đợi 5–10 phút, thử lại

### Vẫn `invalid_request`
- Đang mở **Expo Go** thay vì **dev client** → cài lại APK từ `eas build --profile development`
- Chưa rebuild sau khi sửa `app.json` plugin → `eas build` lại

### `401` từ backend
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` ≠ `GOOGLE_CLIENT_ID` backend
- Test backend: `http://localhost:8080/google-login-test.html`

### Không kết nối API
- Đổi `EXPO_PUBLIC_API_URL` sang IP LAN đúng
- `npx expo start -c` sau khi sửa `.env`

### Android: Play Services
- Cần Google Play Services trên thiết bị/emulator có Google APIs

---

## Tóm tắt lệnh nhanh

```bash
# 1. Build dev client Android
eas build --profile development --platform android

# 2. Sau khi cài APK, chạy bundler
npx expo start --dev-client

# 3. Mở app FAMS trên điện thoại (KHÔNG dùng Expo Go)
```
