# 02. Kiến trúc dự án FAMS Mobile

> Phạm vi: frontend React Native/Expo trong repo này, branch `develop`, ngày 2026-07-23. Repo không chứa backend; endpoint và business rule được mô tả theo code frontend hiện tại và phải đối chiếu OpenAPI/backend trước khi sửa nghiệp vụ.

## 1. Kiểu kiến trúc đang sử dụng

Dự án dùng kết hợp:

- **Feature-based architecture**: code nhóm theo nghiệp vụ `auth`, `checkin`, `site`, `face`, `notification`...
- **Layered flow trong mỗi feature**: `page → component → hook → service → apiClient → backend`.
- **File-based routing** của Expo Router: cấu trúc `app/` quyết định route/navigator.
- **Server-state architecture** với TanStack Query: dữ liệu backend, cache, paging và mutation.
- **Client-state architecture** với Zustand: auth/session, tenant hiện hành, check-in đang mở và session chụp Face ID.
- **Platform adapters** qua file `.web.tsx`/`.web.ts`: map, SecureStore và Firebase Phone Auth có implementation riêng cho web.

Đây chưa phải Clean Architecture/DDD hoàn chỉnh: project không có domain/use-case layer độc lập, nhiều type vừa là DTO vừa là model UI, và một số hook chứa navigation/toast. Vì vậy nên gọi đúng là **feature-based layered frontend**, tránh giả định có domain boundary chặt như backend.

## 2. Sơ đồ tổng thể runtime

```text
┌─────────────────────────────────────────────────────────────────────┐
│ Người dùng: Android / iOS / Web                                    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ tương tác
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Expo Router — app/**/*.tsx                                         │
│ route group, Stack/Tabs, Redirect, AuthGate, route params           │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ render / gọi callback
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Feature components — src/features/*/components                     │
│ form, list, screen state, loading/error/empty, navigation action    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ gọi custom hook
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│ Feature hooks                                                       │
│ TanStack Query + Zustand/local state + orchestration + toast         │
└───────────────┬───────────────────────────────┬─────────────────────┘
                │ đọc/ghi client state             │ gọi API/device
                ▼                                  ▼
┌─────────────────────────────┐     ┌─────────────────────────────────┐
│ Zustand / storage           │     │ Feature service/api             │
│ auth, tenant, open check-in │     │ path, payload, unwrap, mapper   │
└─────────────────────────────┘     └───────────────┬─────────────────┘
                                                    │ apiClient
                                                    ▼
                                    ┌─────────────────────────────────┐
                                    │ Axios + auth interceptors       │
                                    │ base URL, timeout, Bearer, 401  │
                                    └───────────────┬─────────────────┘
                                                    │ HTTPS/REST
                                                    ▼
                                    ┌─────────────────────────────────┐
                                    │ Backend FAMS /api/v1            │
                                    │ auth, tenant, site, attendance  │
                                    └─────────────────────────────────┘

Feature hook/service còn gọi native API:
  expo-location ─ GPS       expo-camera ─ ảnh mặt
  image-manipulator ─ nén   Firebase/Google ─ identity
  SecureStore/AsyncStorage ─ persistence cục bộ
```

## 3. Composition root và vòng đời ứng dụng

`app/_layout.tsx` là composition root:

1. Tạo một `QueryClient` sống suốt vòng đời app.
2. Bọc app bằng `QueryClientProvider`.
3. Bọc UI bằng `ToastProvider`.
4. `AppInit` gọi `hydrateFromSecureStore()` để khôi phục access token, refresh token và active tenant.
5. `AppInit` gắn request/response interceptor vào `apiClient`.
6. Root `Stack` đăng ký các modal kết quả.
7. Khi interceptor không refresh được token: clear auth, reset check-in context, clear Query cache và `replace` về login.
8. Khi layout unmount: eject interceptors và reject queue đang chờ.

Query mặc định:

```ts
staleTime: 5 * 60 * 1000
retry: 2
```

Từng hook có thể override, ví dụ notification list stale 60 giây, unread badge stale 30 giây/poll 60 giây, employeeId stale 1 giờ.

## 4. Kiến trúc điều hướng

```text
app/_layout (root Stack)
├── index
│   ├── chưa auth → (auth)/login
│   └── đã auth   → (tabs)/home
├── (auth)/_layout (Stack, public flow)
│   ├── login / register / phone-login
│   ├── 2fa-verify / forgot-password / reset-password
│   └── select-tenant
├── (tabs)/_layout (auth guard + Tabs)
│   ├── visible: home / checkin / notifications / profile
│   └── hidden: site / assignment / checkin-history / placeholders
├── (admin)/_layout (auth + profile.role === admin)
│   └── tenant-setup
├── face/_layout (AuthGate)
│   └── enroll / verify redirect
└── modal/* (mỗi modal tự dùng AuthGate khi cần)
```

### Guard hiện có

| Phạm vi | Cách bảo vệ | Hạn chế |
|---|---|---|
| Main tabs | Check `isHydrating`, `isAuthenticated` | Chỉ xác thực, chưa permission-level |
| Face routes | `AuthGate` | Chỉ xác thực |
| Result modal | `AuthGate` trong page | Có thể quên thêm ở modal mới |
| Admin | Auth + `profile.role === 'admin'` | Role frontend chưa khớp hoàn toàn role code backend |
| Site/assignment/check-in | Backend trả 403, hook map `isForbidden` | UI không pre-gate theo permission |

Backend phải luôn là lớp authorization cuối cùng. Client guard chỉ cải thiện UX, không phải biện pháp bảo mật.

## 5. Quy tắc phân lớp và trách nhiệm

| Lớp | Nên làm | Không nên làm |
|---|---|---|
| `app/**/*.tsx` | Định nghĩa route/layout, đọc params, render screen, wiring navigation | Dựng REST URL, lưu token, chứa business rule lớn |
| `components/` | Render UI, input, event, loading/error/empty | Gọi `apiClient` trực tiếp |
| `hooks/` | Query/mutation, query key, kết hợp service/store/device, orchestration | Parse envelope HTTP lặp lại, chứa view style lớn |
| `services/` / `api.ts` | HTTP method/path/payload, unwrap/map DTO | Render UI, gọi React hook, điều hướng |
| `store/` | Client state cần chia sẻ/persist | Nhân bản dữ liệu đã có trong Query cache |
| `types/` | DTO/domain/UI types có chủ đích | Dùng `any` hoặc type chung vô nghĩa |
| `utils/` | Hàm thuần: mapper, formatter, validation, error parser | Side effect, navigation, React state |
| `src/services/` | Hạ tầng HTTP/upload dùng nhiều feature | Logic riêng một feature |

Code hiện tại có vài ngoại lệ: hook auth/tenant tự điều hướng và toast; `LoginForm` tự định nghĩa Zod schema; một số page auth còn dài. Đây là nợ kỹ thuật, không phải convention nên nhân rộng.

## 6. Kiến trúc state

### 6.1 Server state — TanStack Query

Nguồn sự thật là backend. Hook dùng `useQuery`, `useInfiniteQuery`, `useMutation`, `useQueries`.

Query key phải chứa tenant cho dữ liệu tenant-scoped:

```text
['notifications', tenantId, 'list', { unreadOnly }]
['sites', 'list', tenantId, params]
['assignments', 'list', tenantId, siteId, params]
['checkin', 'history', tenantId, params]
['face-id', 'status', tenantId, employeeId]
```

Sau mutation, hook chọn một trong ba chiến lược:

- `invalidateQueries`: tải lại từ nguồn sự thật.
- `setQueryData`/`setQueriesData`: cập nhật cache ngay.
- Kết hợp patch rồi invalidate: notification mark-read đang dùng cách này.

### 6.2 Client/session state — Zustand

| Store | Dữ liệu | Persistence | Lý do |
|---|---|---|---|
| `auth/store.ts` | token, user, activeTenantId, trạng thái 2FA | SecureStore native/localStorage web | Dùng toàn app và cần sống qua restart |
| `checkin/store/checkin.store.ts` | `openCheckinId`, context key | AsyncStorage theo user + tenant | Khôi phục ca mở sau khi kill app |
| `face/store/face-enroll.store.ts` | ảnh đã chụp, step, consent optimistic | RAM | Chỉ cần trong một phiên enroll |
| `assignment/store/assignment.store.ts` | Không có state; file marker chỉ `export {}` | — | Ghi rõ filter đang là local state, tránh tạo store giả |

Không lưu list/detail API vào Zustand nếu TanStack Query đã quản lý. Dữ liệu server bị nhân đôi sẽ dễ lệch khi mutation hoặc đổi tenant.

### 6.3 Local component state

Dùng cho input/filter/page/modal, ví dụ `selectedSiteId`, search text, confirmation visibility, thời gian hiện tại. State chỉ có một component dùng thì không đưa lên Zustand.

## 7. HTTP, response và auth interceptor

`src/services/api-client.ts` tạo Axios instance:

- `baseURL = EXPO_PUBLIC_API_URL`, fallback local `/api/v1`.
- Timeout 15 giây.
- Mặc định `Content-Type: application/json`.

`unwrapApiData<T>()` hỗ trợ cả response trực tiếp và envelope:

```json
{
  "success": true,
  "message": "...",
  "data": {}
}
```

Auth interceptor:

```text
request
  → đọc accessToken từ Zustand
  → gắn Authorization: Bearer <token>

response 401 protected endpoint
  → request đầu tiên gọi POST /auth/refresh
  → các request 401 đồng thời được đưa vào queue
  → refresh thành công: lưu token mới, replay toàn queue
  → refresh thất bại: reject queue, clear session/cache, về login
```

Các endpoint public credential như login/register/OTP/reset và chính `/auth/refresh` bị loại khỏi refresh retry để tránh vòng lặp.

### Ranh giới multi-tenant

Tenant hiện hành nằm trong `useAuthStore.activeTenantId`. Service tenant-scoped dựng URL `/tenants/{tenantId}/...`. Hook thường `enabled: !!tenantId`. Khi đổi tenant:

1. reset check-in context;
2. cancel queries;
3. persist tenant mới;
4. remove mọi cache không có key đầu là `auth`;
5. cập nhật `user.tenant_id`;
6. quay lại page trước hoặc Home.

Điều này giảm lẫn dữ liệu giữa công ty, nhưng feature mới vẫn phải nhớ thêm tenant vào cả REST path lẫn query key.

## 8. Mapping dữ liệu và business rule

Luồng mong muốn:

```text
Backend DTO → service unwrap → mapper → type nội bộ → hook → component format UI
```

Hiện trạng:

- Auth có `api-mappers.ts` để chịu được camelCase/snake_case.
- Tenant list chuẩn hóa nhiều kiểu pagination.
- Phần lớn Site/Check-in/Notification dùng type response gần như trực tiếp.
- Formatter label/màu nằm trong utility của feature.

Business rule có ảnh hưởng pháp lý/nghiệp vụ như geofence, đi sớm/muộn, hợp lệ/từ chối phải do backend quyết định. Frontend chỉ thu thập input, chặn lỗi hiển nhiên, hiển thị kết quả và không tự suy ra status khác backend.

## 9. Native/platform architecture

| Năng lực | Adapter/thư viện | Ghi chú |
|---|---|---|
| GPS | `expo-location` qua `gps.service.ts` | Xin foreground permission, check services, High accuracy |
| Camera Face | `expo-camera` trong UI profile | Cần quyền camera; native test là bắt buộc |
| Chuẩn hóa ảnh | `expo-image-manipulator` | Resize/nén/JPEG/base64 tùy flow |
| Avatar | `expo-image-picker` + upload service | Endpoint backend cấu hình qua env |
| Token native | `expo-secure-store` | Keychain/Keystore |
| Token web | `localStorage` adapter | Rủi ro XSS cao hơn cookie HttpOnly |
| Phone OTP | React Native Firebase Auth | Web file riêng báo không hỗ trợ |
| Google | Native Google Sign-In hoặc AuthSession | Expo Go không đại diện đầy đủ native flow |
| Map | `react-native-maps` | Có `.web.tsx` fallback |

Do có native module Firebase/Google, môi trường kiểm thử đầy đủ là EAS development build/dev client, không phải Expo Go.

## 10. Module dependency hiện tại

```text
auth ───────► rbac
  │             └── lấy tenant ứng viên
  ├────────► checkin store (cleanup logout/switch tenant)
  └────────► shared apiClient/storage

home ───────► auth profile + checkin available-sites + notification badge

checkin ────► gps + auth store + shared apiClient/toast

face ───────► auth store + attendance/me/monthly + image manipulator
profile ────► auth + face + invitation

assignment ─► site service + employee endpoint
site ───────► employee endpoint (supervisor names)

notification ► auth store + shared apiClient/toast
tenant ───────► auth store + shared apiClient/toast
```

Các phụ thuộc `auth → checkin store` và UI Face nằm trong `profile` nhưng logic nằm trong `face` làm boundary chưa hoàn toàn độc lập. Khi mở rộng, có thể đưa session cleanup vào một app/session coordinator và chuyển toàn bộ Face screen UI vào feature `face`; chưa cần refactor chỉ để đổi cấu trúc nếu chưa có test.

## 11. Trạng thái và khoảng trống kiến trúc

| Vấn đề | Tác động |
|---|---|
| Không có test runner/test suite/CI trong repo | Không có regression safety net cho auth/check-in/multi-tenant |
| Chưa có OpenAPI contract được generate/validate ở frontend | DTO và naming dễ lệch backend |
| Client permission matrix chưa hoàn chỉnh | Nhiều UI chỉ biết không có quyền sau HTTP 403 |
| `require_face_id` có trong TenantSettings nhưng check-in không dùng | Cấu hình không được thực thi ở frontend |
| `useFaceVerify` tồn tại nhưng route verify redirect | Logic kỹ thuật có, luồng sản phẩm chưa có |
| Face quality phía client chỉ là heuristic; consent version còn là constant mock | Không được coi client check là AI/liveness validation hoặc consent record chính thức |
| Attendance, Random Check, assignment detail chưa triển khai | Route bị ẩn/redirect; không được coi là feature hoàn thành |
| `expo-notifications` đã cài nhưng không có registration/listener | Hiện chỉ có notification in-app REST polling |
| Tenant wizard dùng plan constants thay vì `GET /plans`; các hook settings/list chưa có page dùng | UI quản trị có thể lệch subscription/settings thực tế |
| Site/assignment lấy từng employee name | N+1 request, hiệu năng kém với danh sách lớn |
| Role frontend và backend không cùng vocabulary | Admin/permission guard có thể sai nghiệp vụ |
| Token web trong localStorage | Nếu có XSS thì token có thể bị đọc |

## 12. Kiến trúc mục tiêu khi tiếp tục phát triển

Không cần viết lại dự án. Nên tiến hóa theo từng feature:

1. Chốt API contract và business acceptance criteria trước UI.
2. Giữ page mỏng, orchestration trong hook/screen component.
3. Tạo mapper ở biên HTTP khi DTO khác model UI.
4. Query key luôn chứa tenant và identifier/filter có ảnh hưởng dữ liệu.
5. Backend quyết định authorization và attendance status; frontend chỉ pre-gate UX.
6. Không nhân bản server state vào Zustand.
7. Thêm test từ utility/service contract tới hook/screen flow.
8. Chỉ refactor dependency boundary có test đi kèm, tránh “dọn kiến trúc” đồng thời thay nghiệp vụ lớn.
