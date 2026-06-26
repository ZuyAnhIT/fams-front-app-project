# Issue: Google Login trên mobile (Expo) — cấu hình Google Cloud Console

**Trạng thái:** Cần cấu hình bên Google Cloud (không cần sửa code backend)  
**Ưu tiên:** High  
**Liên quan:** `POST /api/v1/auth/login/google`, Expo app Google Sign-In

## Bối cảnh

Backend đã hỗ trợ đổi Google **ID token** (Web Client ID) lấy JWT FAMS. Mobile app gửi:

```json
POST /api/v1/auth/login/google
{ "idToken": "<google-id-token>", "deviceId": "..." }
```

Backend verify `aud` của token phải khớp `GOOGLE_CLIENT_ID` trong `.env`.

## Kết quả test API (đã chạy)

| Test | Kỳ vọng | Kết quả |
|------|---------|---------|
| Thiếu `idToken` | 400 | ✅ PASS |
| `idToken` rỗng | 400 | ✅ PASS |
| Token malformed | 401 | ✅ PASS |
| JWT fake (sai audience) | 401 | ✅ PASS |
| Endpoint public (không cần Bearer) | ≠ 403 | ✅ PASS |

Happy-path (token Google thật) cần đăng nhập qua trình duyệt / app.

## Vấn đề thường gặp trên mobile

### 1. Lỗi 401 `Invalid or expired Google ID token`

**Nguyên nhân:** Token `aud` không khớp `GOOGLE_CLIENT_ID` backend, hoặc OAuth client không phải loại **Web application**.

**Cách xử lý (Google Cloud Console):**

1. Credentials → OAuth client loại **Web application**
2. **Authorized JavaScript origins** (cho Expo web / test HTML):
   - `http://localhost:8080`
   - `http://192.168.1.148:8080` (nếu test qua LAN)
3. **Authorized redirect URIs** (cho `expo-auth-session` trên web):
   - `famsfrontappproject://oauthredirect`

### 2. Lỗi `400: invalid_request` — `redirect_uri=exp://192.x.x.x:8081`

**Nguyên nhân:** Expo Go dùng redirect `exp://` — Google OAuth **không chấp nhận** theo chính sách bảo mật.

**Cách xử lý:** Dùng **EAS Development Build**, không dùng Expo Go cho Google Login.

→ Xem hướng dẫn chi tiết: [`docs/EAS_GOOGLE_LOGIN.md`](../EAS_GOOGLE_LOGIN.md)

### 3. Expo Go vs Development Build

| | Expo Go | EAS Dev Build |
|---|---------|---------------|
| Google Login | ❌ `exp://` invalid_request | ✅ Native `@react-native-google-signin` |
| Cần Android/iOS OAuth client | Không đủ | Không — chỉ **Web Client ID** |

`expo-auth-session` chỉ dùng fallback trên **web** hoặc khi không phải Expo Go.

### 3. Kiểm tra nhanh backend (không cần mobile)

Mở trên máy có backend:

```
http://localhost:8080/google-login-test.html
```

Đăng nhập Google → nếu nhận JWT FAMS thì backend + Web Client ID đúng.

## Frontend đã cấu hình

- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` — cùng giá trị `GOOGLE_CLIENT_ID` backend
- `EXPO_PUBLIC_API_URL` — trỏ tới backend (vd. `http://192.168.1.148:8080/api/v1`)
- `EXPO_PUBLIC_USE_MOCK_API=false` — gọi API thật
- Chỉ dùng **Web Client ID** — native: `@react-native-google-signin` với `webClientId`; web: `expo-auth-session`

## Không cần thay đổi backend

API `/api/v1/auth/login/google` đã đúng contract. Mọi lỗi còn lại thường do:

- Google Cloud Console (origins / redirect URIs)
- Expo reload sau khi đổi `.env` (`npx expo start -c`)
- Điện thoại và máy chạy backend cùng mạng LAN khi dùng IP `192.168.x.x`

## Checklist cho QA

- [ ] `GOOGLE_CLIENT_ID` trong backend `.env` = Web Client ID
- [ ] `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` trong app `.env` = cùng giá trị
- [ ] `google-login-test.html` login thành công
- [ ] App: build EAS development → bấm "Đăng nhập bằng Google" → nhận JWT → vào Home
