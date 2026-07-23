# FAMS Mobile — Tài liệu kiến trúc & đánh giá hệ thống

> Tài liệu này được viết bằng cách đọc trực tiếp toàn bộ mã nguồn `app/` và `src/` tại thời điểm 2026-07-23 (branch `develop`). Không có thư mục `backend/` trong repo này nên các "API shape" mô tả dưới đây được suy ra từ code frontend (service/type files, thường có comment tiếng Việt đối chiếu với DTO backend) — không phải từ việc đọc mã nguồn backend thật.

> **Bản rà soát đầy đủ và mới hơn:** xem [PROJECT_TECHNICAL_GUIDE.md](PROJECT_TECHNICAL_GUIDE.md). Tài liệu đó bổ sung catalog page → component → hook → service → API, kết quả TypeScript/ESLint, đánh giá bảo mật và kế hoạch P0/P1/P2.

> **Lưu ý:** nội dung bên dưới là baseline trước đợt remediation ngày 2026-07-23 và được giữ để đối chiếu lịch sử. Trạng thái hiện tại (quality gate pass, 0 file TypeScript rỗng, route guard và avatar upload mới) nằm trong tài liệu mới ở trên.

## Mục lục

1. [Tổng quan](#1-tổng-quan)
2. [Kiến trúc hệ thống](#2-kiến-trúc-hệ-thống)
3. [Cấu trúc thư mục dự án](#3-cấu-trúc-thư-mục-dự-án)
4. [Môi trường & thư viện](#4-môi-trường--thư-viện)
5. [Luồng API → Service → Hook → Component → Page theo từng feature](#5-luồng-api--service--hook--component--page-theo-từng-feature)
6. [Đánh giá ưu điểm](#6-đánh-giá-ưu-điểm)
7. [Đánh giá nhược điểm](#7-đánh-giá-nhược-điểm)
8. [Đề xuất khắc phục](#8-đề-xuất-khắc-phục)

---

## 1. Tổng quan

FAMS Mobile là app React Native (Expo SDK 54, Expo Router v6) cho hệ thống **Field Attendance Management System** — chấm công hiện trường theo GPS + Face ID, đa tenant (multi-company). Kiến trúc chính theo mô hình **Feature-based** — mỗi nghiệp vụ ưu tiên nằm trong `src/features/<feature>/`. Tuy nhiên convention chưa áp dụng hoàn toàn: nhiều page auth trong `app/` vẫn chứa trực tiếp form state, validation, UI và style.

Có **14 feature module**, trong đó **10 module có code thật** (`auth`, `rbac`, `tenant`, `site`, `assignment`, `checkin`, `gps`, `face`, `notification`, `profile`) và **4 module hoàn toàn rỗng** (`device`, `home`, `attendance`, `random-check`).

## 2. Kiến trúc hệ thống

### 2.1 Lớp điều hướng (Routing layer) — `app/`

Expo Router v6, file-based, dùng route group để phân vùng:

```
app/
├── index.tsx              # Entry — Redirect theo useAuthStore (isHydrating → spinner, isAuthenticated → /(tabs)/home, else → /(auth)/login)
├── _layout.tsx             # Root layout: QueryClientProvider + ToastProvider + AppInit (hydrate auth, setup axios interceptors) + Stack (modal routes)
├── (auth)/                 # Stack riêng, chưa đăng nhập: login, phone-login, register, 2fa-verify, forgot/reset-password, select-tenant
├── (tabs)/                 # Bottom tabs sau khi đăng nhập: home, checkin, random-check, attendance, assignment, notifications, profile
│   ├── site/               # Stack lồng (hidden tab, href:null) — list→detail
│   └── assignment/         # Stack lồng — list→detail (detail hiện là stub)
├── (admin)/                # Stack riêng cho Platform Admin: tenant-setup (onboarding wizard)
├── face/                   # enroll (thật) + verify (placeholder, chưa nối hook)
└── modal/                  # checkin-result, random-check-result (presentation: 'modal')
```

Không có route-guard tập trung (middleware) — mỗi trang tự chịu trách nhiệm gọi hook, hook tự `enabled: isAuthenticated`/`!!tenantId`; phân quyền UI dựa vào **HTTP 403 từ backend** (`isForbidden` pattern lặp lại ở site/assignment/checkin) chứ không có bảng ánh xạ role→permission ở client.

### 2.2 Lớp state & data-fetching

| Loại state | Công cụ | Nơi sống | Ghi chú |
|---|---|---|---|
| Server state (list/detail từ API) | **TanStack Query v5** | `useQuery`/`useMutation`/`useInfiniteQuery` trong `hooks/` mỗi feature | Query key factory theo từng feature (`checkinKeys`, `siteKeys`, `notificationKeys`, `faceIdKeys`...); `staleTime` 30s–10 phút tuỳ độ "nóng" của dữ liệu |
| Auth/session | **Zustand** (`src/features/auth/store.ts`) | `useAuthStore` — token, user, `activeTenantId`, `is2FARequired` | Token lưu ở `expo-secure-store` (`secure-storage.ts`/`.web.ts`), không dùng persist middleware — tự tay hydrate lúc mount |
| Phiên chấm công đang mở | Zustand (`src/features/checkin/store/checkin.store.ts`) | `openCheckinId` | Persist qua AsyncStorage — sống sót qua việc kill app giữa check-in/check-out |
| Face enroll session (ảnh đã chụp) | Zustand (`src/features/face/store/face-enroll.store.ts`) | tạm trong RAM (không persist) | |
| Global app/theme/notification store gốc (`src/stores/*.ts`) | — | **rỗng, không dùng** | Xem mục 7 |

### 2.3 Lớp gọi API

```
Component (app/*.tsx, src/features/*/components/*.tsx)
        │  gọi hook
        ▼
Hook (src/features/<feature>/hooks/*.ts)   ── useQuery / useMutation, query-key factory, toast on error/success
        │  gọi service function
        ▼
Service (src/features/<feature>/services/*.ts | api.ts)  ── xây path REST, gọi apiClient
        │
        ▼
apiClient (src/services/api-client.ts)  ── axios instance, baseURL = EXPO_PUBLIC_API_URL
        │  + interceptors (src/features/auth/api-interceptors.ts): attach Bearer token, refresh-on-401 (queue + replay)
        ▼
Backend Spring Boot (base path /tenants/{tenantId}/... — REST đa tenant qua URL, JWT trong header)
        │
        ▼
unwrapApiData<T>() (src/services/api-response.ts) ── bóc field `data` khỏi envelope { success, message, data } nếu có
```

Điểm đáng chú ý: **không có 1 axios instance duy nhất được document rõ ràng** — `src/lib/axios.ts` (được README cũ nhắc tới) là file **rỗng**; instance thật nằm ở `src/services/api-client.ts`. Tất cả service (trừ `tenant/api.ts`) đều gọi qua `unwrapApiData()`; `tenant/api.ts` đọc thẳng `data` không qua hàm này (không nhất quán, xem mục 7).

### 2.4 Luồng xác thực & đa tenant (auth + rbac)

1. Đăng nhập (email/password, Google ID token, hoặc Firebase Phone OTP) → `src/features/auth/api.ts` gọi 1 trong 3 endpoint `/auth/login | /auth/login/google | /auth/otp/verify` → nhận `LoginResponse` (token pair + `requires_2fa` + `temp_token?`).
2. Nếu `requires_2fa` → điều hướng `/(auth)/2fa-verify`, xác thực TOTP qua `/auth/login/totp` (dùng `temp_token`).
3. Thành công → `setTokens()` (lưu SecureStore + Zustand) → `resolveAuthenticatedSession()` (`src/features/auth/session.ts`):
   - Lấy profile `GET /auth/me` (response login thật không kèm `user`, phải gọi bổ sung).
   - Lấy danh sách tenant khả dụng qua `getAvailableTenants()` (`src/features/rbac/api.ts`) — dựa trên `GET /roles/me`, fallback `GET /tenants` cho platform-admin.
   - Tự chọn tenant nếu chỉ có 1 candidate hoặc tenant cũ vẫn hợp lệ; nếu >1 và chưa chọn → điều hướng `/(auth)/select-tenant`.
4. Mọi service tenant-scoped (`site`, `checkin`, `notification`, `face`, `assignment`) dùng `useAuthStore(s => s.activeTenantId)` làm phần `{tenantId}` trong path — **không có tenant nào được chọn thì hook tự `enabled:false`**, không gọi API.
5. Axios response interceptor bắt 401 → refresh token qua `/auth/refresh` → queue các request đang chờ → replay; refresh thất bại → `clearAuth()` + callback điều hướng về login (đăng ký 1 lần trong `AppInit` ở `app/_layout.tsx`).

`rbac` không làm permission-gating UI (không map role → danh sách quyền để ẩn/hiện nút) — chỉ dùng để dựng danh sách tenant. Toàn bộ enforcement quyền dựa vào 403 từ backend.

### 2.5 Luồng chấm công (checkin) — nghiệp vụ lõi của app

```
CheckinHome (src/features/checkin/components/checkin.component.tsx)
  ├─ useAvailableSites()   → GET /tenants/{t}/checkin/available-sites   (site được phép check-in hôm nay, theo assignment active)
  ├─ useCheckinStore.hydrate()  → đọc openCheckinId đã lưu (AsyncStorage) — phục hồi trạng thái nếu app bị kill giữa ca
  ├─ chọn site → useCheckinSubmit().checkIn(siteId)
  │     useGps().requestLocation() → expo-location (xin quyền foreground, kiểm tra GPS bật, lấy toạ độ)
  │     → POST /tenants/{t}/checkin { siteId, latitude, longitude, gpsAccuracy, deviceId }
  │     → lưu checkinId vào checkin.store, invalidate mọi query 'checkin', điều hướng /modal/checkin-result
  └─ useCheckoutSubmit().checkOut()
        nếu mất openCheckinId (app bị kill) → GET .../checkin/history, tìm bản ghi checkOutAt=null
        → POST /tenants/{t}/checkin/{id}/checkout { latitude, longitude, gpsAccuracy, deviceId }
CheckinResult (modal)      ← useCheckinResult(checkinId)     GET /tenants/{t}/checkin/{id}
CheckinHistory (tab ẩn)    ← useCheckinHistory(params)       GET /tenants/{t}/checkin/history (phân trang)
(giải trình text đã có UI)  useCheckinExplain(checkinId)    POST /tenants/{t}/checkin/{id}/explain
```

Rule "sớm/muộn/hợp lệ" (status `valid|pending_review|rejected`) do **backend quyết định**, FE chỉ hiển thị `message` trả về — tránh trùng lặp business rule ở 2 nơi.

### 2.6 Luồng Face ID

`src/features/face/` chứa toàn bộ logic thật (được README cũ nhấn mạnh); `src/features/profile/components/Face*.tsx` chỉ là UI shell import từ `face/`.

```
useCurrentEmployeeId()  → GET /tenants/{t}/attendance/me/monthly (chỉ lấy field employeeId; 404 = null hợp lệ, không phải lỗi)
useFaceIdStatus(employeeId) → GET  /tenants/{t}/employees/{e}/face-id
useFaceIdConsent          → POST /tenants/{t}/employees/{e}/face-id/consent
useFaceIdEnroll           → POST /tenants/{t}/employees/{e}/face-id/enroll  (multipart, ≥3 ảnh, resize/nén <1MB + convert JPEG qua expo-image-manipulator)
useFaceIdRevoke           → DELETE /tenants/{t}/employees/{e}/face-id
useFaceVerify             → POST /tenants/{t}/employees/{e}/face-id/verify → poll GET .../verify/{verifyRequestId} mỗi 1.5s, timeout 15s
```

`useFaceVerify` hiện chỉ được gọi từ `FaceVerifyTest` (nhúng trong màn hình enroll để test thủ công) — route `app/face/verify.tsx` là placeholder tĩnh, chưa nối vào luồng check-in thật (tức là **Face ID chưa thực sự là điều kiện bắt buộc khi check-in** trong code hiện tại, dù `TenantSettings.require_face_id` đã có field cho việc này).

### 2.7 Sơ đồ tổng hợp 1 request điển hình

```
User chạm nút "Check-in"
  → CheckinHome (component)
  → useCheckinSubmit (hook, useMutation)
  → submitCheckin() (service)
  → apiClient.post (axios, interceptor gắn Bearer token)
  → Backend Spring Boot
  ← { success, message, data: CheckinResponse }
  ← unwrapApiData<CheckinResponse>()
  ← onSuccess: lưu openCheckinId, invalidateQueries(['checkin']), showToast
  ← điều hướng router.push('/modal/checkin-result', { checkinId })
  → CheckinResult (component) → useCheckinResult(checkinId) → GET lại bản ghi vừa tạo → hiển thị
```

---

## 3. Cấu trúc thư mục dự án

```
fams-front-app-project/
├── app/                          # Expo Router — chỉ route + wiring, không business logic
│   ├── (admin)/                  # Platform Admin: tenant-setup wizard
│   ├── (auth)/                   # login/register/otp/2fa/forgot-reset/select-tenant
│   ├── (tabs)/                   # home, checkin, checkin-history, random-check, attendance,
│   │                             # assignment/, site/, notifications, notification/, profile
│   ├── face/                     # enroll (thật), verify (placeholder)
│   └── modal/                    # checkin-result, random-check-result
│
├── src/
│   ├── config/                   # env.ts (API_BASE_URL — CÓ code), app.config.ts + google.ts khác trạng thái (app.config rỗng)
│   ├── constants/                # theme.ts (có code) — app.ts/permissions.ts/routes.ts/storage-keys.ts RỖNG
│   ├── components/                # UI dùng chung: toast, AppButton*, forms/AppTextInput*, camera/FaceCameraFrame*, map/LocationPreview*
│   │                             #   (*: các file này RỖNG dù có UI thật nằm rải rác trong từng feature/components)
│   ├── hooks/                    # use-theme.ts, use-color-scheme.ts(.web) có code — useLocation/useCameraPermission/
│   │                             #   usePermission/useAppState/useNetworkStatus RỖNG
│   ├── lib/                      # axios.ts, query-client.ts, router.ts, secure-store.ts, permissions.ts — TOÀN BỘ RỖNG
│   ├── services/                 # api-client.ts + api-response.ts (thật, dùng khắp app) — auth-token/device/
│   │                             #   location/notification/upload.service.ts RỖNG; avatar-upload.ts có code
│   ├── stores/                   # app/auth/checkin/notification.store.ts — TOÀN BỘ RỖNG (auth/checkin store thật nằm trong features/)
│   ├── types/                    # auth/checkin/api/common/random-check.ts — TOÀN BỘ RỖNG (type thật nằm trong features/*/types)
│   ├── utils/                    # device/distance/error/format-date/image.ts — TOÀN BỘ RỖNG
│   │
│   └── features/                 # 14 module, convention: services/hooks/store/types/utils/components
│       ├── auth/          ✅ đầy đủ nhất (login, register, OTP, Google, 2FA, đổi/quên mật khẩu, profile, session/interceptor)
│       ├── rbac/          ⚠️ chỉ có api.ts (getMyRoles, getAvailableTenants) — không theo convention 6 thư mục
│       ├── tenant/        ✅ CRUD tenant + settings + subscription + wizard tạo tenant (Platform Admin)
│       ├── site/          ✅ list/detail công trình, geofence, shifts, supervisors (read-only)
│       ├── assignment/    ✅ list phân công theo site (read-only, N+1 employee-name)
│       ├── checkin/       ✅ chấm công GPS (check-in/out, history, result, explain)
│       ├── gps/           ✅ xin quyền + lấy toạ độ (expo-location) — rất nhỏ, dùng nội bộ bởi checkin
│       ├── face/          ✅ Face ID enroll/consent/status/revoke/verify (multipart, poll)
│       ├── notification/  ✅ list (infinite scroll), badge unread, mark-read/mark-all-read
│       ├── profile/       ✅ hồ sơ cá nhân + invitation (đọc, accept/decline CHƯA có API) + UI Face ID
│       ├── device/        ❌ RỖNG hoàn toàn (6 file, 0 dòng) — không ai import
│       ├── home/          ❌ RỖNG hoàn toàn — tab "Trang chủ" thật không dùng module này (chỉ có nút logout)
│       ├── attendance/    ❌ RỖNG hoàn toàn — tab "Công" chỉ là text tĩnh
│       └── random-check/  ❌ RỖNG hoàn toàn — tab "Kiểm tra" + modal kết quả chỉ là text tĩnh
│
├── docs/ARCHITECTURE.md          # ← tài liệu này
├── README.md                     # Hướng dẫn cài đặt & chạy dự án (đã có sẵn, khá tốt)
├── app.json / eas.json           # Expo config (plugin camera/location/secure-store/google-signin/firebase), build profile
├── tsconfig.json                 # path alias @/* → src/*, strict: true
└── package.json
```

**79 file `.ts`/`.tsx` trong `src/` (không tính `app/`) hiện đang rỗng (0 byte)** — phần lớn là scaffold ban đầu (commit khởi tạo skeleton) không được dọn dẹp. Xem mục 7.1 để biết vì sao đây là vấn đề cần xử lý sớm.

---

## 4. Môi trường & thư viện

| Nhóm | Thư viện | Version | Vai trò |
|---|---|---|---|
| Core | `expo` | 54 | Nền tảng, khoá cứng version — không tự ý `npm install` nâng cấp |
| | `react` / `react-native` | 19.1.0 / 0.81.5 | |
| | `expo-router` | ~6.0.24 | File-based routing, `typedRoutes` + `reactCompiler` bật trong `app.json` |
| State | `zustand` | ^5.0.14 | Global state tối giản (auth, checkin, face-enroll, profile-invitation) |
| Data fetching | `@tanstack/react-query` | ^5.101.0 | Cache/query server state, `QueryClientProvider` ở root, `staleTime` mặc định 5', `retry: 2` |
| HTTP | `axios` | ^1.18.0 | `apiClient` instance duy nhất + interceptor refresh token |
| Form/Validate | `react-hook-form` ^7.79 + `@hookform/resolvers` ^5.4 + `zod` ^4.4.3 | | Dùng ở auth forms và Tenant Setup Wizard; các feature read-only (site/assignment) không dùng |
| Auth/Identity | `@react-native-firebase/app` + `/auth` | ^25.1.0 | Đăng nhập số điện thoại — Firebase verify OTP client-side, backend chỉ nhận ID token |
| | `@react-native-google-signin/google-signin` | ^16.1.2 | Google Sign-In native (build EAS/production) |
| | `expo-auth-session` | ~7.0.11 | Google Sign-In qua AuthSession (web/Expo Go fallback) |
| | `expo-secure-store` | ~15.0.8 | Lưu access/refresh token + activeTenantId (Keychain/Keystore) |
| | `@react-native-async-storage/async-storage` | 2.2.0 | Lưu `openCheckinId`, config không nhạy cảm |
| Hardware | `expo-camera` | ~17.0.10 | Chụp ảnh Face ID |
| | `expo-image-manipulator` | ~14.0.8 | Resize/nén/convert JPEG ảnh Face ID trước upload |
| | `expo-image-picker` | ~17.0.11 | Chọn ảnh avatar trong `src/services/avatar-upload.ts` |
| | `expo-location` | ~19.0.8 | GPS cho check-in/out |
| | `react-native-maps` | 1.20.1 | Xem geofence trên bản đồ (site detail) — có `.web.tsx` fallback vì không hỗ trợ web |
| | `expo-notifications` | ~0.32.17 | (khai báo — luồng đăng ký push token/nhận thông báo đẩy chưa thấy code nối, in-app notification hiện dùng REST polling qua TanStack Query) |
| | `expo-device` | ~8.0.10 | Lấy `deviceId` gửi kèm request check-in/out/login |
| Build/Env | `expo-dev-client`, `expo-constants`, `expo-splash-screen`, `expo-system-ui`, `expo-status-bar`, `expo-symbols` | | Hạ tầng build/runtime chuẩn Expo |
| Dev | `typescript` ~5.9.2, `eslint` ^9 + `eslint-config-expo` | | `npm run lint` = `expo lint`; **không có test runner/script `test`** |

Biến môi trường public đang đọc: `EXPO_PUBLIC_API_URL` (fallback `http://localhost:8080/api/v1`) và `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (có alias cũ `EXPO_PUBLIC_GOOGLE_CLIENT_ID`). Firebase native dùng các file platform config.

---

## 5. Luồng API → Service → Hook → Component → Page theo từng feature

Ký hiệu: ✅ có code + có trang dùng · ⚠️ có code nhưng thiếu kết nối/chưa hoàn thiện · ❌ rỗng/không dùng.

| # | Feature | Trạng thái | API chính (method + path) | Hook chính | Component | Trang (`app/`) |
|---|---|---|---|---|---|---|
| 1 | **auth** | ✅ | `POST /auth/register,login,login/google,otp/verify,login/totp,refresh,logout[/all]`; `POST /auth/totp/setup,verify,disable`; `POST/PATCH /auth/forgot-password,reset-password,change-password,me`; `GET /auth/me` | `use-login/-register/-phone-otp/-google-login/-2fa/-forgot-password/-reset-password/-change-password/-profile/-select-tenant/-refresh-token/-logout` | `LoginForm, RegisterForm, OTPInput, GoogleSignInButton, TwoFASetupModal, PasswordChangeForm, ProfileForm, AccountLockedBanner` | `(auth)/login, register, phone-login, 2fa-verify, forgot-password, reset-password, select-tenant` |
| 2 | **rbac** | ✅ (nhỏ, không theo convention) | `GET /roles/me`; `GET /tenants` (fallback) | dùng gián tiếp qua `auth/session.ts` và `auth/use-select-tenant.ts` | — (không có component riêng) | `(auth)/select-tenant.tsx` |
| 3 | **tenant** | ✅ | `POST /tenants`; `GET /tenants[,/:id,/me]`; `PATCH /tenants/:id[/settings]`; `GET /tenants/:id/subscription`; `GET /plans` | `use-tenant, use-tenant-list, use-create-tenant, use-tenant-settings` | `TenantSetupWizard` (3 bước, RHF+Zod) | `(admin)/tenant-setup.tsx` |
| 4 | **site** | ✅ (read-only) | `GET /tenants/:t/sites[,/​:id,/​:id/assignments]`; `GET /tenants/:t/employees/:id` | `use-site-list, use-site-detail, use-site-supervisors` | `SiteList, SiteDetail, SiteListItem, SiteLocationMap(.web)` | `(tabs)/site/index, site/[id]` |
| 5 | **assignment** | ✅ (read-only) | `GET /tenants/:t/sites/:s/assignments`; `GET /tenants/:t/sites` (filter); `GET /tenants/:t/employees/:id` | `useAssignmentList, useSiteOptions, useSiteShiftNames` | `AssignmentListScreen` | `(tabs)/assignment/index` — **`[id].tsx` là stub tĩnh, chưa nối** |
| 6 | **checkin** | ✅ | `GET /tenants/:t/checkin/available-sites,history,/​:id`; `POST /tenants/:t/checkin[,/​:id/checkout,/​:id/explain]` | `useAvailableSites, useCheckinSubmit, useCheckoutSubmit, useCheckinHistory, useCheckinResult, useCheckinExplain` | `CheckinHome (checkin.component.tsx), CheckinHistory, CheckinResult` | `(tabs)/checkin, checkin-history, modal/checkin-result` |
| 7 | **gps** | ✅ (tiện ích nội bộ) | không gọi backend — chỉ `expo-location` | `useGps` | — | dùng bởi `checkin` |
| 8 | **face** | ✅ | `GET/POST/DELETE /tenants/:t/employees/:e/face-id[/consent,/enroll]`; `POST /face-id/verify` + `GET /face-id/verify/:id` (poll); `GET /tenants/:t/attendance/me/monthly` (employeeId) | `useFaceIdStatus/-Consent/-Enroll/-Revoke, useFaceVerify, useCurrentEmployeeId, useFaceEnroll` | UI thật nằm ở `profile/components/Face*.tsx` (FaceEnrollScreen, FaceEnrollCamera, FaceConsentSheet, FaceStatusCard, FaceVerifyTest...) | `face/enroll.tsx` (thật) · `face/verify.tsx` (placeholder, không nối) |
| 9 | **notification** | ✅ | `GET /tenants/:t/notifications` (infinite scroll); `PATCH /​:id/read`, `/read-all` | `useNotifications (useInfiniteQuery), useUnreadCount, useMarkAsRead` | `NotificationList, NotificationItem, NotificationBadge` | `(tabs)/notifications.tsx` **và** `(tabs)/notification/index.tsx` (2 route gần như trùng nhau) |
| 10 | **profile** | ✅ (1 phần) | `GET /tenants/:t/invitations?status=pending` (accept/decline: **chưa có API**) | `usePendingInvitations` (+ tái xuất `use-profile.ts`) | `ProfileScreen, ProfileFaceSection, InvitationCard, ProfileSettingsRow` + toàn bộ UI Face ID | `(tabs)/profile.tsx` |
| 11 | **device** | ❌ | — | — | — | không route nào dùng |
| 12 | **home** | ❌ | — | — | — | `(tabs)/home.tsx` tồn tại nhưng chỉ có text tĩnh + nút logout, **không dùng module `home`** |
| 13 | **attendance** | ❌ | — | — | — | `(tabs)/attendance.tsx` chỉ có text tĩnh "Công cá nhân" |
| 14 | **random-check** | ❌ | — | — | — | `(tabs)/random-check.tsx` + `modal/random-check-result.tsx` chỉ có text tĩnh |

> Chi tiết riêng hiện chỉ có cho auth tại `src/features/auth/README.md`; catalog đầy đủ các feature nằm trong `docs/PROJECT_TECHNICAL_GUIDE.md`.

---

## 6. Đánh giá ưu điểm

1. **Ranh giới kiến trúc rõ ràng và nhất quán** giữa `app/` (routing) và `src/features/*` (business logic) — trang trong `app/` hầu như chỉ có 3-5 dòng import + render, dễ trace, dễ test component độc lập.
2. **Xử lý đa tenant nghiêm túc**: mọi service tenant-scoped đều nhận `tenantId` tường minh (không có global mutable state ẩn), hook tự `enabled: !!tenantId` — tránh gọi API sai tenant khi chưa chọn.
3. **Auth flow đầy đủ & đúng thực tế production**: refresh-token có cơ chế queue/replay khi nhiều request 401 đồng thời (tránh refresh nhiều lần song song), phân biệt rõ `isAuthEndpoint` để tránh loop vô hạn.
4. **Comment code chất lượng cao, đối chiếu thật với backend**: rất nhiều service/type file có comment tiếng Việt trích dẫn tên class/DTO backend thật (`com.fams.modules.site.dto.response.SiteDetailResponse`, `com.fams.shared.pagination.PageResponse`...) và ghi rõ chỗ nào FE phải suy đoán/chưa xác nhận — giảm rủi ro "ảo giác API" khi onboarding dev mới.
5. **Xử lý trạng thái mất-phiên tốt** ở checkin: `openCheckinId` persist qua AsyncStorage + fallback tìm lại bằng `GET history` khi state RAM mất do app bị kill — một chi tiết UX/robustness dễ bị bỏ qua nhưng đã được implement.
6. **React Query dùng đúng idiom**: query-key factory theo namespace từng feature, `setQueryData` optimistic sau mutation thay vì luôn invalidate + refetch (giảm loading nhấp nháy), `select` để tách field cần thiết (badge unread count).
7. **Nhận biết giới hạn backend và ghi lại quyết định thiết kế thay vì che giấu**: các pattern N+1 (resolve tên nhân viên theo từng ID) đều có comment giải thích lý do (không có endpoint batch), không phải lỗi vô tình.
8. **README gốc (cài đặt/chạy) đã tốt**: hướng dẫn IP LAN, xử lý lỗi camera/network, lưu ý khoá cứng Expo SDK — sát nhu cầu thực tế của dev mobile mới join.

## 7. Đánh giá nhược điểm

### 7.1 Scaffold-drift nghiêm trọng — 79 file rỗng

Toàn bộ `src/lib/*`, `src/stores/*`, phần lớn `src/services/*`, `src/hooks/*`, `src/utils/*`, `src/constants/*`, `src/types/*`, và 4 feature module (`device, home, attendance, random-check`) là **file 0 byte** còn sót từ lần scaffold ban đầu. Hệ quả:
- README cũ (đã có sẵn) mô tả cấu trúc thư mục dẫn tới các file này như thể chúng có logic (`src/config/env.ts, axios client...`) — gây hiểu lầm cho dev mới.
- Logic thật bị **trùng tên khác chỗ**: token/session thật nằm ở `src/features/auth/store.ts`, không phải `src/stores/auth.store.ts`; axios instance thật ở `src/services/api-client.ts`, không phải `src/lib/axios.ts`. Dev mới rất dễ sửa nhầm file rỗng và không hiểu vì sao thay đổi "không có tác dụng".
- 4 tab điều hướng (`Trang chủ` thật ra không dùng `features/home`, `Công`, `Kiểm tra ngẫu nhiên`) đã có mặt trong tab bar và trông như đã hoàn thiện về mặt navigation, nhưng đứng sau chúng không có gì — dễ gây hiểu lầm về % hoàn thành thực tế của app khi demo.

### 7.2 Không nhất quán trong lớp gọi API

- `tenant/api.ts` không dùng `unwrapApiData()` như các feature còn lại — nếu backend thật trả envelope `{success,message,data}` cho tenant thì toàn bộ hook `tenant` sẽ nhận nhầm object envelope thay vì data thật (bug tiềm ẩn chưa lộ vì có thể tenant module chưa được test với backend thật).
- `rbac/api.ts`: `getMyRoles()` gọi `unwrapApiData(data)` không truyền generic `<T>` — chỉ đúng nhờ type annotation ở return, không có type-check tại chỗ gọi.
- Naming file không đồng nhất giữa các feature: có nơi `types/Site.ts` (PascalCase), có nơi `types/checkin.type.ts` (kebab+suffix) — cả 2 convention cùng tồn tại song song (1 bộ có code, 1 bộ rỗng) trong cùng 1 feature (vd. `profile/types/Profile.ts` thật + `profile/types/profile.type.ts` rỗng).

### 7.3 Dead code & tính năng nửa vời (không phải do rỗng scaffold, mà do dở dang)

- `app/(tabs)/assignment/[id].tsx` — route tồn tại, không có logic; chạm vào 1 phân công không dẫn tới đâu.
- `app/face/verify.tsx` — placeholder tĩnh; luồng verify thật (`useFaceVerify`) chỉ được gọi từ 1 component test (`FaceVerifyTest`) nhúng trong màn hình enroll, **không nối vào luồng check-in** dù có field `TenantSettings.require_face_id`.
- `src/features/site/utils.ts`'s `parseSiteError()` được viết đầy đủ (map 400/401/403/404/422/429/500/502/503 → thông báo tiếng Việt) nhưng **không nơi nào gọi nó** — `SiteList`/`SiteDetail` hiển thị text lỗi generic.
- `profile/store/profileStore.ts`'s `removeInvitation` action không bao giờ được gọi — vì accept/decline lời mời **chưa có API** (đã ghi chú rõ trong code), nhưng UI (`InvitationCard`) hiện disable đúng, không gây bug — chỉ là code chết cần dọn khi API sẵn sàng.
- 2 route notification gần trùng nhau: `(tabs)/notifications.tsx` (trong tab bar) và `(tabs)/notification/index.tsx` (hidden, `href:null`) đều render cùng `NotificationList` — không rõ route thứ 2 còn cần thiết hay là tàn dư refactor.
- `usePendingInvitations`'s `queryFn` ghi thẳng vào Zustand store như side-effect (thay vì qua `onSuccess`) — vi phạm nguyên tắc query function nên "pure" (không side-effect ngoài fetch), và bản ghi trong store không được UI nào đọc lại (component đọc trực tiếp `query.data`).

### 7.4 Hiệu năng — N+1 request theo thiết kế

`assignment`, `site` (supervisors) đều phải gọi `GET /employees/:id` riêng lẻ cho từng nhân viên vì backend không có endpoint batch-by-ids. Đã được document rõ trong code, nhưng nếu 1 site có nhiều supervisor / 1 trang assignment có page size lớn, số lượng request tăng tuyến tính — cần theo dõi khi dữ liệu thật lớn hơn dữ liệu test.

### 7.5 Không có test suite

`package.json` không có script `test`; CLAUDE.md của dự án cũng xác nhận điều này. Không có test nào cho các luồng nhạy cảm nhất (refresh-token queue/replay, GPS accuracy → status mapping, resolve open-checkin sau khi app bị kill) — đây là những chỗ dễ regress nhất khi refactor.

### 7.6 Kiểu dữ liệu "thiết kế trước, chưa xác nhận backend"

`tenant/types.ts` có các field khá chi tiết (giá theo VNĐ/tháng, wizard 3 bước, `employee_limit: -1 = unlimited`...) đọc như một spec được thiết kế trước khi có backend thật xác nhận — khác hẳn phong cách "đối chiếu từng field với DTO backend" thấy ở `site`/`checkin`/`face`. Rủi ro: nếu backend thật trả field khác tên/shape, toàn bộ `tenant` feature (kể cả wizard tạo tenant cho Platform Admin) sẽ lỗi ngầm vì không unwrap qua `unwrapApiData` (mục 7.2) nên lỗi có thể không hiện ngay mà data hiển thị sai.

---

## 8. Đề xuất khắc phục

Sắp xếp theo ưu tiên (impact vs effort):

1. **Dọn 79 file rỗng ngay** (effort thấp, impact cao) — hoặc xoá hẳn nếu không còn kế hoạch dùng convention `src/lib, src/stores, src/services/*, src/hooks/*, src/utils/*, src/constants/*, src/types/*` song song với `src/features/*`, hoặc merge logic thật vào đúng vị trí quy ước rồi xoá bản sao rỗng. Việc này tự nó xoá luôn phần lớn nhược điểm ở mục 7.1 và 7.2 (2 bộ type/store trùng tên).
2. **Chuẩn hoá lại 1 convention type/file duy nhất** cho mọi feature — chọn 1 trong 2 style hiện có (`PascalCase.ts` hay `kebab.type.ts`) và áp dụng lại cho toàn bộ, xoá style còn lại. Nên làm cùng lúc với bước 1.
3. **Sửa `tenant/api.ts` để dùng `unwrapApiData()`** như các feature khác, hoặc nếu backend tenant thật sự không bọc envelope thì ghi rõ comment giải thích lý do khác biệt (tránh người đọc sau tưởng là bug).
4. **Xác nhận lại toàn bộ `tenant/types.ts` với backend thật** trước khi dùng Tenant Setup Wizard trong môi trường thật — theo đúng rule "liệt kê field trước khi code" mà CLAUDE.md của dự án đã đặt ra cho các feature khác.
5. **Quyết định số phận của `device, home, attendance, random-check`**: hoặc lên lịch implement (đặc biệt `home` — tab "Trang chủ" đang trống nội dung, ảnh hưởng trực tiếp trải nghiệm sau login), hoặc tạm ẩn tab khỏi tab bar (`href: null` như đã làm với `site`) để tránh gây hiểu lầm khi demo/nghiệm thu.
6. **Gộp `(tabs)/notifications.tsx` và `(tabs)/notification/index.tsx`** thành 1 route — xác nhận cái nào là tàn dư rồi xoá.
7. **Nối `parseSiteError()` vào `SiteList`/`SiteDetail`** (hoặc xoá nếu không cần) — effort rất thấp, cải thiện UX lỗi ngay.
8. **Sửa `usePendingInvitations`** để side-effect ghi store nằm trong `onSuccess`/`useEffect` thay vì trong `queryFn`; hoặc bỏ hẳn Zustand store này nếu UI chỉ cần `query.data` (đơn giản hoá, giảm 1 nguồn state trùng lặp).
9. **Hoàn thiện luồng Face Verify thật cho check-in** khi `require_face_id` bật — hiện tại field đã có ở `TenantSettings` nhưng chưa thấy code nào đọc nó để bắt buộc verify trước check-in.
10. **Bổ sung test cho 3 luồng rủi ro cao nhất**: refresh-token interceptor (queue/replay), `resolveOpenCheckinId` (phục hồi sau khi app bị kill), và mapping GPS accuracy/permission → thông báo lỗi hiển thị cho người dùng — đây là nơi một lỗi nhỏ gây mất dữ liệu chấm công thật của nhân viên.
11. **Cân nhắc endpoint batch-by-ids** (đề xuất với team backend) cho `GET /employees` để loại bỏ N+1 ở `assignment`/`site` khi dữ liệu tăng.
