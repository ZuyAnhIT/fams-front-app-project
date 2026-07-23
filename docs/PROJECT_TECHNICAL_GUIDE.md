# FAMS Mobile — Kiến trúc, tính năng và đánh giá kỹ thuật

> Phạm vi rà soát: toàn bộ mã nguồn frontend trong `app/`, `src/`, cấu hình Expo/EAS và `package.json` trên branch `develop`, ngày 2026-07-23. Repo không có mã nguồn backend; hợp đồng API trong tài liệu được suy ra từ code frontend, type và comment đối chiếu DTO. Các điểm đánh dấu **cần xác nhận backend** không nên được xem là đặc tả backend chính thức.

## 1. Tóm tắt điều hành

FAMS Mobile là ứng dụng React Native đa nền tảng, dùng Expo SDK 54, phục vụ chấm công hiện trường theo tenant. Phần đã có luồng tương đối đầy đủ gồm xác thực, chọn tenant, xem công trình/phân công, check-in/check-out bằng GPS, đăng ký/xác minh Face ID, hồ sơ và thông báo in-app.

Kiến trúc chủ đạo là **feature-based**, nhưng chưa được áp dụng hoàn toàn đồng nhất:

- Các route nghiệp vụ như check-in, site, assignment và profile chủ yếu chỉ nối page với component.
- Nhiều route auth vẫn chứa trực tiếp form state, validation, UI và style với kích thước 100–400 dòng.
- Server state dùng TanStack Query; client/session state dùng Zustand; token native dùng SecureStore.
- 79 file TypeScript rỗng và các Expo starter component không dùng đã được loại bỏ trong đợt remediation ngày 2026-07-23.
- Static quality gate hiện đạt: `npm run quality` chạy thành công cả ESLint và TypeScript strict check.

### Mức hoàn thiện theo tính năng

| Nhóm | Trạng thái | Nhận định |
|---|---|---|
| Auth email, Google, phone OTP, TOTP | Khá đầy đủ | Đã nối API, store, navigation; cần xác nhận contract refresh token và môi trường native |
| Multi-tenant/RBAC | Một phần | Chọn tenant và auth/admin guard đã có; chưa có permission matrix đầy đủ ở client |
| Site | Đã nối read-only | List/detail/map/supervisor; có N+1 khi lấy tên nhân viên |
| Assignment | Đã nối list | Lọc/phân trang theo site; detail còn placeholder |
| Check-in GPS | Luồng lõi đã nối | Check-in/out/history/result/explain; Face Verify chưa được bắt buộc trong check-in |
| Face ID | Enroll/verify đã có | Enroll hoàn chỉnh hơn verify; route verify thật chưa nối nghiệp vụ chấm công |
| Notification | In-app REST đã có | List/paging/read/badge; chưa có push notification dù dependency đã khai báo |
| Profile | Khá đầy đủ | Xem/sửa profile, avatar, 2FA, logout, Face ID; invitation chỉ đọc |
| Tenant setup | Có wizard tạo mới | Các API quản trị khác phần lớn chưa có page sử dụng; contract response chưa nhất quán |
| Home/Attendance/Random check/Device | Chưa triển khai | Attendance/Random Check đã được ẩn khỏi tab; Home vẫn là màn tối giản |

## 2. Kiến trúc hệ thống

### 2.1 Kiến trúc runtime

```text
Người dùng
   │
   ▼
Expo Router page — app/**/*.tsx
   │ render/gọi
   ▼
Feature component — src/features/*/components
   │ gọi hook
   ▼
Feature hook — TanStack Query mutation/query + Zustand/local state
   │ gọi service
   ▼
Feature service/api — dựng REST path, request/response mapping
   │
   ▼
apiClient (Axios, baseURL, timeout 15s)
   │ request interceptor: Authorization: Bearer <access token>
   │ response interceptor: refresh token + queue/replay khi 401
   ▼
Backend REST /api/v1
```

Root layout `app/_layout.tsx` khởi tạo:

- `QueryClientProvider`, với `staleTime` mặc định 5 phút và `retry: 2`.
- `ToastProvider` cho phản hồi thành công/lỗi.
- `AppInit` để hydrate token/tenant từ storage và gắn Axios interceptor.
- Root `Stack`, gồm các modal kết quả check-in và random check.

### 2.2 Routing

| Route group | Vai trò | Route chính |
|---|---|---|
| `app/index.tsx` | Entry point | Chờ hydrate rồi redirect sang login hoặc home |
| `app/(auth)` | Xác thực | login, phone login, register, 2FA, forgot/reset password, select tenant |
| `app/(tabs)` | Ứng dụng sau login | home, checkin, random-check, attendance, assignment, notifications, profile |
| `app/(tabs)/site` | Stack ẩn trong tab | danh sách và chi tiết công trình |
| `app/(tabs)/assignment` | Stack phân công | danh sách thật, detail placeholder |
| `app/(admin)` | Quản trị tenant | tenant setup wizard |
| `app/face` | Face ID | enroll thật, verify placeholder |
| `app/modal` | Kết quả dạng modal | check-in thật, random check placeholder |

`(tabs)` có auth guard dựa trên trạng thái hydrate/authentication; `(admin)` tải profile và yêu cầu role `admin`. Các route độc lập `face/*` và modal kết quả cũng đi qua `AuthGate`, nên không thể mở trực tiếp khi chưa đăng nhập. Backend vẫn là lớp phân quyền cuối cùng. Khi RBAC backend công bố permission code ổn định, admin guard nên chuyển từ role tổng quát sang permission cụ thể.

### 2.3 Phân loại state

| State | Công cụ | Nguồn sự thật |
|---|---|---|
| Dữ liệu API | TanStack Query | Query cache theo feature/tenant |
| Auth, token, user, tenant hiện hành | Zustand | `src/features/auth/store.ts` |
| Token native | Expo SecureStore | Keychain/Keystore |
| Token web | `localStorage` fallback | `secure-storage.web.ts`; có rủi ro XSS cao hơn cookie HttpOnly |
| Check-in đang mở | Zustand + AsyncStorage | `openCheckinId` scope theo user + tenant, phục hồi sau khi app bị kill |
| Phiên chụp Face ID | Zustand in-memory | Danh sách ảnh/consent/current step |
| Filter, search, page | React local state | Component list tương ứng |
| Profile invitation | TanStack Query + Zustand | Đang bị lưu trùng; UI đọc query data |

### 2.4 Xác thực và đa tenant

```text
Email / Google ID token / Firebase ID token
  → POST auth endpoint
  → nếu totpRequired: lưu pending token → màn hình 2FA
  → nhận access/refresh token → SecureStore + Zustand
  → GET /auth/me
  → GET /roles/me
  → 1 tenant: tự chọn
     nhiều tenant: /(auth)/select-tenant
  → /(tabs)/home
```

`activeTenantId` được đưa vào hầu hết query key và REST path `/tenants/{tenantId}/...`. Đây là cách tốt để ngăn cache của hai tenant đè lên nhau. Tuy nhiên sau khi đổi tenant, app chưa có một bước invalidate/clear tập trung; hiện tính đúng chủ yếu dựa vào việc từng feature nhớ đưa tenant ID vào query key.

Hai điểm đã được xử lý trong vòng đời session:

- Interceptor chỉ bỏ qua các endpoint credential công khai; `GET /auth/me` được phép refresh.
- Refresh thất bại sẽ clear auth/check-in/query cache và replace về login; interceptor được eject khi layout cleanup.

## 3. Cấu trúc thư mục thực tế

```text
fams-front-app-project/
├── app/                         # Expo Router pages/layouts
│   ├── (admin)/                 # Tenant setup
│   ├── (auth)/                  # Auth pages; nhiều page chứa UI/form trực tiếp
│   ├── (tabs)/                  # Main tabs + nested site/assignment stacks
│   ├── face/                    # Face enroll/verify routes
│   └── modal/                   # Result modals
├── assets/                      # Icon, splash, tab images
├── docs/                        # Tài liệu kiến trúc/kỹ thuật
├── scripts/                     # Expo reset script
├── src/
│   ├── components/              # Shared/themed/UI components đang được sử dụng
│   ├── config/                  # API URL và Google client ID
│   ├── constants/               # Theme/design constants
│   ├── features/                # Business modules
│   │   ├── auth/                # Auth/session/profile API
│   │   ├── rbac/                # Role và danh sách tenant khả dụng
│   │   ├── tenant/              # Tenant CRUD/settings/wizard
│   │   ├── site/                # Site list/detail/geofence/shift/supervisor
│   │   ├── assignment/          # Assignment list theo site
│   │   ├── checkin/             # Check-in/out/history/explain
│   │   ├── gps/                 # Permission và lấy GPS
│   │   ├── face/                # Face status/consent/enroll/revoke/verify
│   │   ├── notification/        # In-app notification
│   │   └── profile/             # Profile screen, invitation và UI Face ID
│   ├── hooks/                   # Color-scheme/theme hooks dùng chung
│   └── services/                # apiClient, response unwrap, avatar upload
├── app.json                     # Expo plugins, identifiers, permissions
├── eas.json                     # Development/preview/production profiles
├── package.json                 # Dependency và scripts
└── tsconfig.json                # strict mode, alias @/* → src/*
```

### Trạng thái cấu trúc sau remediation

- Không còn file `.ts/.tsx` rỗng trong `app/` hoặc `src/`.
- Các bản scaffold trùng tên trong `src/lib`, `src/stores`, `src/types` và feature placeholder đã được xóa.
- Expo starter components không được import và gây lỗi typecheck đã được loại bỏ.
- Profile invitation không còn nhân bản server state vào một Zustand store riêng.
- Naming giữa các feature vẫn chưa hoàn toàn thống nhất và nên được chuẩn hóa dần khi sửa từng module.

## 4. Môi trường và thư viện

### 4.1 Phiên bản

Môi trường quan sát khi kiểm tra:

- Node.js `v24.18.0`, npm `11.16.0`, Expo CLI `54.0.25`.
- Project không khai báo `engines` hoặc file pin Node như `.nvmrc`; vì vậy CI và máy dev có thể dùng Node khác nhau.
- `package-lock.json` là nguồn version cài đặt thực tế. Ví dụ `package.json` khai báo `expo: 54`, bản đang resolve là `54.0.35`.

| Nhóm | Dependency chính | Vai trò |
|---|---|---|
| Core | Expo 54, React 19.1, React Native 0.81.5 | Runtime đa nền tảng |
| Routing | Expo Router 6 | File-based routing, typed routes |
| Server state | TanStack Query 5 | Fetch/cache/pagination/mutation |
| Client state | Zustand 5 | Auth, open check-in, face session |
| HTTP | Axios 1.18 | REST client và interceptor |
| Form | React Hook Form 7, Zod 4, resolvers | Form state/validation |
| Auth | Firebase App/Auth, Google Sign-In, Expo AuthSession | Phone OTP và Google OAuth |
| Storage | SecureStore, AsyncStorage | Token/tenant và open check-in |
| Device | Camera, Location, Device, Image Picker, Image Manipulator | Face ID, GPS, avatar, device ID |
| UI/runtime | Expo Image, Reanimated, Gesture Handler, Safe Area, Screens, Maps | UI/native integration |
| Notification | Expo Notifications | Đã cài nhưng chưa có code push token/listener |
| Quality | TypeScript strict, ESLint 9 | `npm run quality` hiện pass |

### 4.2 Scripts

| Lệnh | Công dụng |
|---|---|
| `npm start` | Expo dev server |
| `npm run start:dev-client` | Dev server cho development build |
| `npm run android` / `npm run ios` / `npm run web` | Mở platform tương ứng |
| `npm run lint` | Expo ESLint |
| `npm run typecheck` | TypeScript strict check |
| `npm run quality` | Chạy tuần tự lint và typecheck |

Không có test runner và không có script `test`.

### 4.3 Biến môi trường và native config

| Biến/file | Mục đích | Ghi chú |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | REST base URL | Fallback `http://localhost:8080/api/v1`; thiết bị thật phải dùng LAN/HTTPS reachable URL |
| `EXPO_PUBLIC_AVATAR_UPLOAD_URL` | Endpoint upload avatar | Phải cùng origin API, ưu tiên relative path; để trống sẽ vô hiệu hóa upload |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth web client | Empty mặc định; code còn đọc alias cũ `EXPO_PUBLIC_GOOGLE_CLIENT_ID` |
| `google-services.json` | Firebase Android | Có trong repo |
| `GoogleService-Info.plist` | Firebase iOS | Được `app.json` tham chiếu nhưng đang thiếu |

Firebase Phone Auth và native Google Sign-In cần development/production build có native modules. Web có stub báo không hỗ trợ phone login; Google trong Expo Go cũng bị giới hạn bởi redirect. README nên ưu tiên `npm run start:dev-client` cho việc kiểm thử các luồng này thay vì mô tả Expo Go như môi trường đầy đủ.

## 5. Luồng API → service → hook → component → page

### 5.1 Catalog tổng hợp

| Feature | Service/API | Hook/state | Component | Page |
|---|---|---|---|---|
| Auth | `auth/api.ts`, `rbac/api.ts` | auth hooks, `useAuthStore` | Login/Register/OTP/Profile/2FA forms | `(auth)/*`, profile |
| Tenant | `tenant/api.ts` | tenant hooks | `TenantSetupWizard` | `(admin)/tenant-setup` |
| Site | `site.service.ts` | site list/detail/supervisor hooks | `SiteList`, `SiteDetail`, map | `(tabs)/site/*` |
| Assignment | `assignment.service.ts` | assignment hooks | `AssignmentListScreen` | `(tabs)/assignment/index` |
| GPS | `gps.service.ts` | `useGps` | dùng gián tiếp | check-in |
| Check-in | `checkin.service.ts` | check-in hooks + store | home/history/result | checkin, history, result modal |
| Face | `face.service.ts`, employee ID service | face hooks + store | UI Face nằm trong profile | profile, face/enroll |
| Notification | `notification.service.ts` | infinite query, unread, mark-read | list/item/badge | notifications |
| Profile invitation | `invitation.service.ts` | query + profile store | invitation card | profile |

### 5.2 Auth, session và profile

Các endpoint được gọi:

| Method | Path | Chức năng |
|---|---|---|
| POST | `/auth/register` | Đăng ký |
| POST | `/auth/login` | Email/password login |
| POST | `/auth/login/google` | Đổi Google ID token lấy FAMS token |
| POST | `/auth/otp/verify` | Đổi Firebase ID token lấy FAMS token |
| POST | `/auth/login/totp` | Hoàn tất login có 2FA |
| POST | `/auth/refresh` | Refresh token |
| POST | `/auth/logout`, `/auth/logout/all` | Thu hồi phiên |
| POST | `/auth/totp/setup`, `/auth/totp/verify`, `/auth/totp/disable` | Quản lý TOTP |
| POST | `/auth/forgot-password`, `/reset-password`, `/change-password` | Quản lý mật khẩu |
| GET/PATCH | `/auth/me` | Đọc/sửa hồ sơ |
| GET | `/roles/me` | Role theo tenant |
| GET | `/tenants` | Fallback tenant list cho platform admin |

Ví dụ email login:

```text
app/(auth)/login.tsx
  → LoginForm
  → useLogin
  → loginWithEmail
  → POST /auth/login
  → mapLoginResponse
  → setTokens
  → resolveAuthenticatedSession
      → GET /auth/me
      → GET /roles/me
  → select tenant hoặc home
```

Login và refresh response đều chấp nhận camelCase/snake_case rồi map về type nội bộ. Request refresh/reset password vẫn cần đối chiếu OpenAPI/DTO backend và viết contract test.

### 5.3 Tenant setup

`TenantSetupWizard` là wizard 3 bước: thông tin cơ bản → settings → plan/xác nhận. `useCreateTenant` gọi `POST /tenants`, cập nhật cache và chuyển về home.

API có trong code nhưng chưa phải tất cả đều có UI sử dụng:

- `POST /tenants`, `GET /tenants`, `GET /tenants/:id`, `GET /tenants/me`.
- `PATCH /tenants/:id`.
- `GET/PATCH /tenants/:id/settings`.
- `GET /tenants/:id/subscription`, `GET /plans`.

`tenant/api.ts` đã dùng `unwrapApiData`; list tenant chuẩn hóa cả hai dạng `items/total/page_size` và `content/totalElements/size`. Wizard vẫn dùng plan fallback hard-code thay vì `GET /plans`, nên cần xác nhận contract trước khi đưa phần subscription vào production.

### 5.4 Site

```text
Profile → “Công trình”
  → app/(tabs)/site/index.tsx
  → SiteList
  → useSiteList
  → GET /tenants/{tenantId}/sites
  → tìm kiếm 400ms, status, sort, pagination

Chọn site
  → site/[id].tsx → SiteDetail
  → GET /tenants/{tenantId}/sites/{siteId}
  → GET .../assignments?role=supervisor&status=active
  → GET /employees/{employeeId} cho từng supervisor
```

Detail hiển thị thông tin site, tọa độ, bản đồ/geofence, shift và supervisor. `react-native-maps` có fallback web.

### 5.5 Assignment

Backend không có list assignment toàn tenant; người dùng phải chọn site trước.

```text
assignment/index
  → AssignmentListScreen
  → useSiteOptions → GET /tenants/{t}/sites
  → useAssignmentList(siteId) → GET /tenants/{t}/sites/{s}/assignments
  → useQueries → GET /tenants/{t}/employees/{employeeId} cho từng dòng
  → useSiteShiftNames → GET site detail để map shiftId → shift name
```

UI có lọc role/status/employeeId/shiftId, phân trang và tìm tên cục bộ trong trang hiện tại. `assignment/[id]` mới chỉ hiển thị ID, chưa gọi API detail.

### 5.6 Check-in/out GPS

```text
checkin.tsx → CheckinHome
  → useAvailableSites → GET /tenants/{t}/checkin/available-sites
  → hydrate openCheckinId từ AsyncStorage
  → chọn site
  → useCheckinSubmit
      → expo-location xin quyền + lấy High accuracy
      → POST /tenants/{t}/checkin
      → lưu openCheckinId
      → modal/checkin-result

Checkout
  → nếu thiếu openCheckinId: GET history và tìm checkOutAt === null
  → lấy GPS
  → POST /tenants/{t}/checkin/{id}/checkout
  → xóa openCheckinId
```

Các API còn lại:

- `GET /tenants/{t}/checkin/{id}` cho kết quả.
- `GET /tenants/{t}/checkin/history` cho lịch sử.
- `POST /tenants/{t}/checkin/{id}/explain` cho ghi chú giải trình; UI đã nối nhưng ảnh giải trình chưa xác nhận contract.

Business rule geofence/sớm/muộn nằm ở backend; frontend hiển thị `status` và `message`. Đây là phân tách trách nhiệm hợp lý.

### 5.7 Face ID

`employeeId` không dùng `user.id`; hook lấy qua `GET /tenants/{t}/attendance/me/monthly?year&month`.

| Method | Path | Chức năng |
|---|---|---|
| GET | `/tenants/{t}/employees/{e}/face-id` | Trạng thái |
| POST | `.../face-id/consent` | Ghi consent |
| POST multipart | `.../face-id/enroll` | Upload 3–5 ảnh JPEG |
| DELETE | `.../face-id` | Thu hồi |
| POST | `.../face-id/verify` | Gửi ảnh base64 |
| GET polling | `.../face-id/verify/{requestId}` | Poll kết quả 1.5 giây/lần, timeout 15 giây |

Luồng enroll resize/nén ảnh dưới 1 MB, chuyển HEIC sang JPEG và lưu session ảnh trong Zustand. UI nằm ở `src/features/profile/components/Face*.tsx`, còn nghiệp vụ/API nằm ở `src/features/face`.

Khoảng trống quan trọng: `FaceVerifyTest` chỉ là khu vực test trong màn enroll; route `face/verify.tsx` là placeholder và check-in chưa đọc `require_face_id` để bắt buộc verify.

### 5.8 Notification

```text
(tabs)/_layout.tsx
  → useUnreadCount
  → GET /tenants/{t}/notifications?page=0&size=1 mỗi 60s

notifications.tsx
  → NotificationList
  → useNotifications (infinite query)
  → GET /tenants/{t}/notifications
  → PATCH /{id}/read hoặc PATCH /read-all
  → patch cache + invalidate badge/list
```

Route notification trùng `notification/index.tsx` đã được xóa; `notifications.tsx` là route duy nhất. Dependency `expo-notifications` chưa được import ở đâu, nên hiện mới có notification in-app từ REST polling, chưa có push token, listener hoặc deep link từ push.

Backend response được mô tả có cả `read` và `isRead`; code xem `readAt` hoặc một trong hai boolean là bằng chứng đã đọc. Backend vẫn nên chuẩn hóa contract.

### 5.9 Profile, avatar và invitation

Profile page tái sử dụng API `/auth/me`, đồng thời hiển thị Face ID, invitation, đổi công ty, sửa hồ sơ, đổi mật khẩu, TOTP và logout.

- Avatar chọn qua `expo-image-picker`.
- Ảnh được resize/convert JPEG rồi upload qua endpoint xác thực cấu hình bởi `EXPO_PUBLIC_AVATAR_UPLOAD_URL`; nếu chưa cấu hình, tính năng fail-safe và không gửi ảnh ra bên thứ ba.
- Invitation gọi `GET /tenants/{t}/invitations?status=pending`; accept/decline chưa có endpoint phù hợp và UI hiển thị trạng thái chờ cập nhật.

Endpoint triển khai thực tế vẫn cần dùng backend nội bộ hoặc object storage có pre-signed URL, policy retention và access control. Production chỉ chấp nhận URL avatar HTTPS.

### 5.10 Tính năng placeholder

| Route/feature | Hiện trạng |
|---|---|
| `home` | Text “Home Screen” và nút logout |
| `attendance` | Text “Công cá nhân” |
| `random-check` | Text tĩnh; result modal cũng tĩnh |
| `device` | Module scaffold rỗng đã được xóa; chưa có route/tính năng |
| `assignment/[id]` | Chỉ hiển thị ID |
| `face/verify` | Text tĩnh |

## 6. Đánh giá ưu và nhược điểm

### 6.1 Chấm điểm snapshot

Điểm dưới đây phản ánh code hiện tại, chưa chạy end-to-end với backend thật.

| Yếu tố | Điểm / 10 | Nhận định |
|---|---:|---|
| Kiến trúc | 7.5 | Chia feature/layer tốt, đã có auth/admin guard; permission-level RBAC chưa đầy đủ |
| Cấu trúc thư mục | 7.5 | Scaffold rỗng/template cũ đã dọn; naming feature vẫn cần chuẩn hóa |
| Môi trường/thư viện | 6.5 | Quality scripts và Web export pass; thiếu pin Node, test, iOS Firebase file |
| API/backend mapping | 7.0 | Tenant unwrap/pagination và refresh response đã chịu được hai naming phổ biến; contract request vẫn cần backend xác nhận |
| Chuyển nghiệp vụ thành UI | 7.5 | Home và Check-in đã bám trạng thái nghiệp vụ; Attendance, Random Check và Face Verify chưa hoàn thiện |
| Chất lượng/khả năng bảo trì | 6.5 | Static checks pass và dead scaffold đã dọn; chưa có automated tests |
| Bảo mật/quyền riêng tư | 6.5 | Đã có route guard, avatar fail-safe và session cleanup; web localStorage vẫn là rủi ro |
| Tổng quan | **7.0** | Nền tảng và UX lõi đã ổn định hơn; chưa nên production trước khi chốt contract/test/native secrets |

### 6.2 Ưu điểm

- Phân tách `page → component → hook → service` rõ ở các feature nghiệp vụ chính.
- Query key phần lớn có tenant ID, giảm nguy cơ lẫn cache đa tenant.
- Refresh interceptor có queue/replay cho nhiều request 401 đồng thời.
- `openCheckinId` được persist và có fallback tìm ca mở từ history.
- Business rule chấm công nằm ở backend, frontend không tự tính lại.
- Face enroll có xử lý ảnh thực tế: resize, nén, HEIC → JPEG, multipart.
- Có platform-specific fallback cho SecureStore, Firebase Phone Auth và map web.
- List site/assignment/notification có loading, empty, error, retry, paging/filter tương đối đầy đủ.
- Comment code ghi rõ các điểm chưa xác nhận và giới hạn backend như N+1.

### 6.3 Nhược điểm/rủi ro

1. **Không có test suite/CI gate:** auth refresh, multi-tenant, GPS và check-in đều chưa có regression test.
2. **Contract API chưa được backend xác nhận hoàn toàn:** request refresh/reset, invitation và check-in explanation vẫn cần đối chiếu OpenAPI/DTO.
3. **Permission phía client còn thô:** admin guard hiện dựa trên role `admin`, chưa dựa vào permission code đầy đủ từ RBAC.
4. **Feature chưa hoàn thiện:** Attendance, Random Check và Face Verify; route placeholder đã được ẩn hoặc chuyển về màn an toàn.
5. **Face ID chưa gắn với check-in:** setting `require_face_id` chưa được thực thi trong luồng frontend.
6. **N+1 request:** assignment và supervisor gọi từng employee; chậm khi page lớn.
7. **Push notification chưa có:** dependency đã cài nhưng không có registration/listener.
8. **Native config thiếu:** iOS Firebase plist không có trong workspace.
9. **Token web trong localStorage:** dễ bị đánh cắp nếu có XSS; cần CSP nghiêm hoặc mô hình cookie HttpOnly/BFF cho web.

## 7. Kế hoạch khắc phục

### P0 — trước khi coi là build có thể bàn giao

1. ✅ TypeScript/ESLint đã pass; bước còn lại là đưa `npm run quality` vào CI.
2. Chốt OpenAPI/DTO backend cho auth refresh/reset, tenant envelope/pagination, notification read flag, invitation và check-in explanation; thêm mapper thống nhất.
3. ✅ Đã loại Catbox và thêm endpoint upload cấu hình/fail-safe; backend còn phải cung cấp endpoint hoặc pre-signed storage thật.
4. ✅ Đã thêm auth guard cho tab, admin, Face ID và result modal; đã cleanup khi refresh thất bại và eject interceptor. Permission-level RBAC vẫn cần backend contract.
5. Bổ sung `GoogleService-Info.plist` qua secret/EAS mechanism phù hợp, không commit secret không cần thiết.
6. Nếu tenant bật `require_face_id`, thiết kế flow verify trước submit check-in và liên kết verification request với record chấm công.
7. ✅ `openCheckinId` đã scope theo user + tenant, reset context khi logout/switch tenant và chủ động phục hồi ca đang mở từ history backend; còn cần automated tests.
8. ✅ Danh sách endpoint không refresh đã thu hẹp, `/auth/me` được refresh và interceptor có cleanup; còn cần automated tests cho concurrent 401.

### P1 — ổn định tính năng và giảm nợ kỹ thuật

1. ✅ Đã xóa 79 file rỗng và các template component không dùng.
2. ✅ Đã hoàn thiện dashboard Home, ẩn Attendance/Random Check và loại placeholder assignment detail/face verify; các feature này chỉ mở lại khi có luồng đầy đủ.
3. ✅ Đã gộp route notification; còn quyết định triển khai push notification hay gỡ dependency.
4. Chuẩn hóa naming file/type và cấu trúc module.
5. ✅ Đã bỏ profile invitation Zustand và giữ query function thuần fetch.
6. Đề nghị backend có endpoint employee batch/include display name để loại N+1.
7. Thêm test cho auth mapper/interceptor, tenant switching, open-checkin recovery, GPS errors, check-in mutations và notification cache updates.

### P2 — nâng khả năng vận hành/bảo trì

1. Pin Node bằng `engines` + `.nvmrc`/Volta và ghi version hỗ trợ trong README.
2. Tạo env schema fail-fast thay vì fallback localhost âm thầm cho release build.
3. Tách các auth page 200–400 dòng thành screen component + schema + presentation component.
4. Dùng shared design tokens/components thay cho màu/style lặp lại.
5. Thêm logging/monitoring không chứa token, ảnh mặt hoặc tọa độ thô; định nghĩa privacy policy cho biometric/GPS.
6. Với web, cân nhắc BFF + cookie Secure/HttpOnly/SameSite; tối thiểu áp dụng CSP mạnh và rà soát XSS.

## 8. Checklist cho một feature mới

1. Xác nhận API contract từ OpenAPI/backend DTO, gồm error/envelope/pagination.
2. Định nghĩa type backend và mapper sang domain/UI type nếu naming khác.
3. Viết service chỉ chịu trách nhiệm HTTP/path/unwrap/map.
4. Viết TanStack Query hook với query key chứa `tenantId` khi tenant-scoped.
5. Chỉ dùng Zustand cho client state thực sự cần chia sẻ/persist, không nhân bản server state.
6. Component xử lý loading/error/empty/forbidden/success rõ ràng.
7. Page chỉ nối navigation/params với screen component khi có thể.
8. Thêm permission guard UI và luôn giữ backend authorization.
9. Thêm unit/integration test cho mapper, hook mutation và luồng lỗi quan trọng.
10. Chạy lint, typecheck và cập nhật catalog tính năng/API trong tài liệu này.

## 9. Kết quả kiểm chứng tại thời điểm viết

| Kiểm tra | Kết quả |
|---|---|
| `npm ls --depth=0` | Pass, không có dependency invalid/missing |
| `npx expo config --type public` | Pass; config resolve được, nhưng không kiểm tra sự tồn tại của iOS plist |
| `npm run quality` | Pass: ESLint và TypeScript strict check |
| `npx expo export --platform web` | Pass: static web bundle và route rendering |
| Test suite | Không tồn tại |
| Empty TypeScript files | 0 |

Tài liệu chi tiết riêng cho auth nằm tại `src/features/auth/README.md`.
