# Feature: `auth`

Quản lý xác thực người dùng: đăng ký email/phone OTP, đăng nhập password bằng email hoặc phone, Google, số điện thoại qua Firebase OTP, 2FA (TOTP), quên/đổi mật khẩu, hồ sơ cá nhân, refresh token, và khởi tạo phiên đăng nhập (chọn tenant hoạt động).

## Cấu trúc

```
auth/
├── api.ts                    # Toàn bộ lời gọi REST tới /auth/*
├── api-interceptors.ts       # Axios interceptor: gắn Bearer token, refresh-on-401 (queue+replay)
├── api-mappers.ts            # Map response backend (camelCase) → type FE (snake_case UserProfile...)
├── session.ts                # resolveAuthenticatedSession() + navigateAfterAuth() — dùng sau MỌI luồng login thành công
├── store.ts                  # useAuthStore (Zustand) — nguồn sự thật duy nhất cho token/user/activeTenantId
├── secure-storage.ts / .web.ts  # Re-export expo-secure-store (native) / fallback (web)
├── google-sign-in-service.ts # Native Google Sign-In (dev/prod build); Expo Go reports unsupported
├── theme.ts                  # Màu sắc riêng cho màn hình auth
├── types.ts                  # Request/Response DTO + AuthState/AuthActions
├── utils.ts                  # parseAuthError, isAccountLockedError, getLockedUntil, normalizePhoneForBackend
├── hooks/
│   ├── use-login.ts, use-register.ts, use-phone-otp.ts, use-google-login.ts
│   ├── use-firebase-phone-auth.ts(.web.ts)  # Gửi/xác nhận SMS code qua Firebase Client SDK (KHÔNG qua backend)
│   ├── use-2fa.ts             # setup / confirm-setup / verify (login step) / disable
│   ├── use-forgot-password.ts, use-reset-password.ts, use-change-password.ts
│   ├── use-profile.ts, use-avatar-upload.ts
│   ├── use-select-tenant.ts   # Chọn tenant hoạt động (dùng cả sau login và từ Profile để đổi tenant)
│   ├── use-refresh-token.ts, use-logout.ts
└── components/
    ├── LoginForm, RegisterForm, OTPInput, GoogleSignInButton, AccountLockedBanner
    └── ProfileForm, PasswordChangeForm, TwoFASetupModal
```

Các file scaffold auth rỗng và mock adapter cũ đã được xóa; nguồn sự thật hiện nằm trực tiếp trong các file liệt kê ở trên.

## API endpoints (`/auth/*`, base `apiClient` từ `@/services/api-client`)

| Method | Path | Request | Response | Hook |
|---|---|---|---|---|
| POST | `/auth/register/send-otp` | `{ phone }` | `void` | `use-register.ts` |
| POST | `/auth/register` | Email `{ email,password,displayName }` hoặc phone `{ phone,password,displayName,otpCode }` | `RegisterResponse` (không có token) | `use-register.ts` |
| GET | `/auth/verify-email?token=...` | Query token | `void` | route `verify-email.tsx` |
| POST | `/auth/resend-verification` | `{ email }` | `void` | route `email-verification.tsx` |
| POST | `/auth/login` | `{ identifier, password, deviceId }` | `LoginResponse` | `use-login.ts` |
| POST | `/auth/login/google` | `{ idToken, deviceId }` | `LoginResponse` | `use-google-login.ts` |
| POST | `/auth/link-google`, `/auth/unlink-google` | `{ idToken }` / không body | `void` | `use-google-account-link.ts` |
| POST | `/auth/otp/verify` | `{ firebaseIdToken, deviceId }` | `LoginResponse` | `use-phone-otp.ts` |
| POST | `/auth/login/totp` | `{ pendingToken, code }` | `LoginResponse` | `use-2fa.ts` (`use2FAVerify`) |
| POST | `/auth/refresh-token` | `{ refreshToken }` | `RefreshTokenResponse` | `api-interceptors.ts` (tự động khi 401) |
| POST | `/auth/switch-tenant` | `{ tenantId, refreshToken }` + Bearer access token | `LoginResponse` mới | `use-select-tenant.ts` |
| POST | `/auth/logout`, `/auth/logout/all` | `{ refreshToken }` / không body | `void` | `use-logout.ts` |
| POST | `/auth/totp/setup` | — | `{ setup_token, qr_code_url, secret }` | `use2FASetup` |
| POST | `/auth/totp/verify` | `{ setupToken, code }` | `void` | `use2FAConfirmSetup` |
| POST | `/auth/totp/disable` | — | `{ message }` | `use2FADisable` |
| POST | `/auth/forgot-password` | `{ email }` | `{ message }` | `use-forgot-password.ts` |
| POST | `/auth/reset-password` | `{ token, new_password }` | `{ message }` | `use-reset-password.ts` |
| POST | `/auth/change-password` | `{ currentPassword, newPassword }` | `{ message }` | `use-change-password.ts` |
| GET | `/auth/me` | — | `UserProfile` | `use-profile.ts`, `session.ts` |
| PATCH | `/auth/me` | `{ displayName?, phone?, avatarUrl? }` | `UserProfile` | `use-profile.ts` |

`LoginResponse`: `{ user_id?, active_tenant_id?, access_token, refresh_token, token_type: 'Bearer', expires_in, user?, requires_2fa, temp_token? }`. Backend thật **không trả `user`** trong response login — mọi hook login đều tự gọi tiếp `resolveAuthenticatedSession()` để lấy `GET /auth/me`.

`UserProfile`: `{ id, email, phone?, full_name, avatar_url?, role: 'employee'|'manager'|'admin'|'hr', tenant_id, department?, employee_code?, is_2fa_enabled, locked_until? }`.

## Luồng chính

### 1. Đăng nhập (email hoặc phone + password) — pattern giống cho Google & Phone OTP

```
LoginForm → useLogin().login({identifier,password})
  → loginWithEmail() → POST /auth/login
  → nếu requires_2fa: set2FARequired(true, temp_token) → router.push('/(auth)/2fa-verify')
  → else: setTokens() → resolveAuthenticatedSession() → setUser() → navigateAfterAuth()
```

`resolveAuthenticatedSession()` (`session.ts`) luôn chạy sau MỌI phương thức đăng nhập thành công (email, Google, Phone OTP, 2FA-verify) — nó gọi `GET /auth/me` (nếu chưa có `presetUser`) và `getAvailableTenants()` (từ `rbac`) để quyết định có cần màn hình chọn tenant hay không. **Bất kỳ luồng login mới nào thêm vào sau này phải gọi hàm này** để đảm bảo hành vi chọn tenant nhất quán.

### 2. Refresh token (transparent, trong `api-interceptors.ts`)

- Request interceptor: luôn gắn `Authorization: Bearer <accessToken>` từ `useAuthStore.getState()`.
- Response interceptor: khi 401 ở endpoint được bảo vệ và request chưa retry → nếu đã có 1 refresh đang chạy thì **xếp hàng** (`failedQueue`) chờ; nếu chưa, tự gọi `POST /auth/refresh`, cập nhật token và replay request. Chỉ các endpoint credential công khai như login/register/refresh bị loại; `/auth/me` vẫn được refresh. Nếu backend đổi `activeTenantId` lúc refresh, App hủy request đang giữ URL tenant cũ, xóa cache và về Home. Refresh thất bại → clear auth/check-in/query cache và replace về login.
- `setupAuthInterceptors()` trả cleanup function để eject request/response interceptor khi root layout unmount/hot reload.

### 3. Đăng ký phone và đăng nhập phone OTP là hai flow khác nhau

Phone registration dùng OTP do backend quản lý: `/register/send-otp` rồi `/register` với `otpCode`. Flow này không dùng Firebase.

Đăng nhập số điện thoại bằng OTP vẫn dùng Firebase như dưới đây.

`useFirebasePhoneAuth` gọi thẳng `@react-native-firebase/auth` (`signInWithPhoneNumber` → `confirm(code)` → `getIdToken()`) — **backend không bao giờ thấy số điện thoại hay mã OTP**, chỉ nhận `firebaseIdToken` cuối cùng qua `POST /auth/otp/verify`.

### 4. 2FA (TOTP)

Setup (`use2FASetup` → QR code) → user quét bằng app Authenticator → `use2FAConfirmSetup` (`POST /totp/verify` với `setup_token`) → bật `is_2fa_enabled`. Khi login mà tài khoản đã bật 2FA, backend trả `requires_2fa: true` + `temp_token`, FE điều hướng `/(auth)/2fa-verify`, `use2FAVerify` gửi `POST /login/totp` để hoàn tất.

## State

`useAuthStore` (Zustand, KHÔNG dùng persist middleware — tự hydrate tay):
- `user, accessToken, refreshToken, isAuthenticated, isHydrating, is2FARequired, tempToken, activeTenantId`.
- Token + `activeTenantId` lưu ở `expo-secure-store` (Keychain/Keystore), đọc lại 1 lần lúc app mount qua `hydrateFromSecureStore()` (gọi trong `AppInit`, `app/_layout.tsx`).
- `activeTenantId`: vì backend không có khái niệm "tenant hiện tại" duy nhất (user có thể có role ở nhiều tenant qua bảng `user_roles`), FE tự chọn và lưu — xem thêm feature `rbac` và `tenant`.

## Lưu ý khi sửa/mở rộng

- **Không tạo store `auth` mới** — toàn bộ state auth thật nằm ở `src/features/auth/store.ts`; scaffold `src/stores/auth.store.ts` đã được xóa.
- Mọi luồng login mới (nếu có, vd. SSO khác) phải gọi `resolveAuthenticatedSession()` + `navigateAfterAuth()` để hành vi chọn tenant nhất quán, không tự viết lại logic điều hướng.
- `isAccountLockedError`/`getLockedUntil` (trong `utils.ts`) dùng để hiển thị `AccountLockedBanner` khi backend trả lỗi khoá tài khoản tạm thời (`locked_until`) — không tự parse message lỗi thủ công ở component khác.
