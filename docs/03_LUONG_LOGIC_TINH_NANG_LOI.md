# 03. Luồng logic và sự kết nối Page – Component – Hook – Service – Utility/Store

> Tài liệu mô tả code frontend hiện tại, không thay thế đặc tả nghiệp vụ backend. Với mỗi luồng, phần “khoảng trống” là nơi code có nhưng chưa chứng minh được nghiệp vụ đúng.

## 1. Công thức chung của một tính năng

Trong dự án này, luồng đầy đủ không chỉ có page/component/service/utility mà còn có hook và store:

```text
Page/Route
  → Component/Screen
    → Hook (query/mutation/orchestration)
      ├── Service/API → apiClient → Backend
      ├── Utility/Mapper → chuẩn hóa/validate/format
      └── Store → client/session state nếu thực sự cần
    ← data + loading/error/actions
  ← UI state + navigation
```

| Thành phần | Câu hỏi nó trả lời |
|---|---|
| Page | URL nào mở màn hình, param nào đi vào, navigator nào bao quanh? |
| Component | Người dùng nhìn thấy gì và thao tác ở đâu? |
| Hook | Khi nào gọi API/device, cache key là gì, success/error làm gì? |
| Service/API | Gọi method/path/payload nào, response được unwrap/map ra sao? |
| Utility/Mapper | Dữ liệu thuần được validate/format/convert thế nào? |
| Store | State nào phải chia sẻ hoặc sống qua restart? |

## 2. Tính năng lõi 1 — Đăng nhập, refresh token và chọn tenant

### 2.1 Bản đồ file

| Lớp | File chính | Vai trò |
|---|---|---|
| Page | `app/(auth)/login.tsx` | Render form đăng nhập |
| Component | `src/features/auth/components/LoginForm.tsx` | Form RHF/Zod, email/password, Google button, lỗi khóa |
| Hook | `src/features/auth/hooks/use-login.ts` | Mutation email login, xử lý 2FA/session/navigation |
| Service | `src/features/auth/api.ts` | `/auth/login`, `/auth/me`, `/auth/refresh`... |
| Mapper | `src/features/auth/api-mappers.ts` | Chuẩn hóa camelCase/snake_case backend |
| Utility | `src/features/auth/utils.ts` | Parse lỗi, account lock, phone/countdown |
| Store | `src/features/auth/store.ts` | Token, user, 2FA temp token, active tenant |
| Persistence | `secure-storage.ts` / `.web.ts` | SecureStore native, localStorage web |
| Session coordinator | `src/features/auth/session.ts` | Lấy profile, tenant candidates, chọn route sau auth |
| RBAC service | `src/features/rbac/api.ts` | `GET /roles/me`, fallback `GET /tenants` |
| HTTP infrastructure | `api-interceptors.ts`, `src/services/api-client.ts` | Bearer header, refresh 401, queue/replay |

### 2.2 Email login bình thường

```text
Người dùng submit LoginForm
  → React Hook Form + Zod validate email/password
  → useLogin.login(credentials)
  → loginWithEmail()
      payload { email, password, deviceId }
      POST /auth/login
      unwrapApiData()
      mapLoginResponse()
  ← LoginResponse
  → nếu requires_2fa + temp_token: xem mục 2.3
  → useAuthStore.setTokens()
      native: SecureStore; web: localStorage
      Zustand isAuthenticated = true
  → resolveAuthenticatedSession(data.user)
      nếu response không có user: GET /auth/me
      GET /roles/me
      lấy danh sách tenantId duy nhất từ roles
      nếu không có role tenant: thử GET /tenants cho platform admin
      giữ tenant cũ nếu vẫn hợp lệ
      tự chọn nếu chỉ có 1 tenant
  → setUser(session.user)
  → navigateAfterAuth()
      >1 tenant chưa chọn → /(auth)/select-tenant
      còn lại           → /(tabs)/home
```

### 2.3 Nhánh TOTP/2FA

```text
POST /auth/login trả requires_2fa + temp_token
  → chưa lưu access/refresh token
  → store.set2FARequired(true, temp_token)
  → /(auth)/2fa-verify
  → user nhập code
  → use2FAVerify.verify(code)
  → POST /auth/login/totp { pendingToken, code }
  → nhận token pair
  → resolve profile/tenant giống login thường
```

Setup TOTP từ Profile dùng `/auth/totp/setup` để nhận secret/QR và `/auth/totp/verify` để xác nhận. Disable dùng `/auth/totp/disable`, rồi fetch lại `/auth/me` và cập nhật cả Zustand lẫn Query cache.

### 2.4 Refresh token khi nhiều request cùng 401

```text
Request A, B, C cùng bị 401
  → A thấy isRefreshing=false, gọi POST /auth/refresh
  → B/C thấy isRefreshing=true, xếp vào failedQueue
  → refresh thành công
      setTokens(token mới)
      replay A với Bearer mới
      resolve queue và replay B/C
  → refresh thất bại
      reject queue
      clear SecureStore + auth state
      reset open-checkin context
      clear Query cache
      replace về login
```

### 2.5 Chuyển tenant

`use-select-tenant.ts` không chỉ đổi một field:

```text
select tenantId → confirm
  → reset check-in context trong RAM
  → cancel request/query đang chạy
  → persist activeTenantId mới
  → remove mọi Query cache trừ nhóm `auth`
  → cập nhật user.tenant_id
  → back hoặc Home
```

### 2.6 Khoảng trống/nguy cơ cần xác nhận

- Vocabulary role frontend (`employee|manager|admin|hr`) không khớp hoàn toàn backend role code được comment trong Site.
- Admin layout chỉ kiểm `profile.role === 'admin'`, chưa kiểm permission code cụ thể.
- Request/response auth đã có mapper chịu hai naming, nhưng vẫn cần contract test với backend thật.
- Token web nằm trong localStorage, cần CSP tốt hoặc thiết kế BFF/cookie HttpOnly nếu web là production target.

## 3. Tính năng lõi 2 — Check-in/check-out bằng GPS

### 3.1 Bản đồ file

| Lớp | File | Vai trò |
|---|---|---|
| Page | `app/(tabs)/checkin.tsx` | Render `CheckinHome` |
| Component | `checkin/components/checkin.component.tsx` | Chọn site, action check-in/out, state UI, mở result |
| Hook | `use-available-sites.ts` | Site/shift được phép check-in hôm nay |
| Hook | `use-checkin-submit.ts` | Lấy GPS rồi mutation check-in |
| Hook | `use-checkout-submit.ts` | Khôi phục ca mở, lấy GPS rồi checkout |
| GPS hook/service | `gps/hooks/use-gps.ts`, `gps/services/gps.service.ts` | Permission, GPS enabled, current coordinates |
| Service | `checkin/services/checkin.service.ts` | REST check-in/out/history/result/explain |
| Store | `checkin/store/checkin.store.ts` | `openCheckinId` theo user + tenant |
| Type | `checkin/types/checkin.type.ts` | Payload/result/status |
| Utility | `checkin/utils/checkin.mapper.ts` | Label/màu trạng thái, distance, work minutes |
| Result | `app/modal/checkin-result.tsx`, `CheckinResult.tsx` | Query và hiển thị kết quả |

### 3.2 Mở màn hình

```text
/(tabs)/checkin
  → CheckinHome
  ├── useProfile() lấy user id
  ├── hydrate(userId, activeTenantId)
  │     tạo key @fams_open_checkin_id:<user>:<tenant>
  │     đọc AsyncStorage
  ├── useAvailableSites()
  │     GET /tenants/{tenant}/checkin/available-sites
  └── useCheckoutSubmit effect
        nếu local không có openCheckinId
        GET history page 0 size 20
        tìm record `checkOutAt === null`
        ghi lại openCheckinId nếu có
```

Việc đối chiếu backend ngăn UI cho phép check-in lần hai chỉ vì local storage bị mất.

### 3.3 Check-in

```text
User chọn site → bấm “Bắt đầu ca làm việc”
  → CheckinHome.handleCheckin()
  → useCheckinSubmit.checkIn(siteId)
  → useGps.requestLocation()
      Location.requestForegroundPermissionsAsync()
      nếu từ chối → trả message, không gọi backend
      Location.hasServicesEnabledAsync()
      nếu GPS tắt → trả message, không gọi backend
      Location.getCurrentPositionAsync(High)
  → submitCheckin(tenantId, payload)
      payload:
        siteId, latitude, longitude,
        gpsAccuracy?, deviceId?
      POST /tenants/{tenantId}/checkin
  ← CheckinResponse
  → persist result.id thành openCheckinId
  → invalidate toàn bộ `['checkin']`
  → toast theo result.status/message
  → push /modal/checkin-result?checkinId=<id>
  → useCheckinResult() GET lại /checkin/{id}
  → CheckinResult render trạng thái/geofence/time
```

### 3.4 Check-out

```text
UI thấy openCheckinId → hiển thị “Kết thúc ca”
  → mở ConfirmDialog
  → useCheckoutSubmit.checkOut()
  → resolveOpenCheckinId()
      dùng store nếu có
      nếu thiếu: GET history và tìm ca chưa checkout
  → lấy GPS giống check-in
  → POST /tenants/{tenantId}/checkin/{checkinId}/checkout
  → xóa openCheckinId trong AsyncStorage/RAM
  → invalidate check-in cache
  → mở result modal
```

### 3.5 Lịch sử và giải trình

- `CheckinHistory` → `useCheckinHistory(params)` → `GET .../checkin/history` → phân trang/filter → format bằng utility.
- `CheckinResult` có thể gọi `useCheckinExplain(checkinId)` → `POST .../{id}/explain { note, photoUrl? }` → invalidate result/history.
- Contract upload ảnh giải trình chưa được chốt; comment trong type nói cần xác nhận multipart hay URL upload sẵn.

### 3.6 Rule thuộc frontend và backend

| Rule | Nơi chịu trách nhiệm |
|---|---|
| Có chọn site chưa, GPS permission/GPS bật chưa | Frontend |
| Lấy tọa độ/accuracy/deviceId | Frontend/native |
| User/tenant có quyền không | Backend; frontend chỉ hiển thị 403 |
| Assignment hôm nay/site hợp lệ | Backend qua available-sites và POST validation |
| Trong geofence hay không | Backend |
| Sớm/muộn/pending/rejected/valid | Backend |
| Persist ca đang mở để phục hồi UX | Frontend + đối chiếu backend |

### 3.7 Khoảng trống nghiệp vụ lớn

`TenantSettings.require_face_id` đã tồn tại và `CheckinResponse` có `faceVerified`, `livenessVerified`, `faceVerifyScore`, nhưng `useCheckinSubmit` chỉ lấy GPS rồi POST. Không có verification request/token được đưa vào check-in. Vì vậy Face ID hiện **không phải điều kiện bắt buộc của check-in ở frontend**, dù tenant bật setting.

## 4. Tính năng lõi 3 — Đăng ký và xác minh Face ID

### 4.1 Vì sao UI và logic nằm ở hai feature

- `src/features/face/`: API, hooks, store, type, image utility — logic Face ID.
- `src/features/profile/components/Face*.tsx`: UI camera/consent/progress/status — hiện được xem như một phần Profile.
- `app/face/enroll.tsx`: route render `FaceEnrollScreen`.

Khi sửa camera UI phải đọc cả `profile/components` và `face/hooks`; chỉ tìm trong `features/face/components` sẽ không thấy UI.

### 4.2 Xác định đúng employeeId

Không được dùng `user.id` thay employee ID:

```text
useCurrentEmployeeId()
  → đọc activeTenantId
  → GET /tenants/{tenant}/attendance/me/monthly?year&month
  → lấy field employeeId
  → HTTP 404 được coi là employeeId=null hợp lệ
```

User account ID và employee profile ID là hai entity khác nhau.

### 4.3 Enroll flow

```text
Profile → Face section → /face/enroll
  → FaceEnrollScreen
  → useFaceEnroll()
      startEnrollSession() trong Zustand RAM
      useCurrentEmployeeId()
      useFaceIdStatus(employeeId)
        GET /tenants/{t}/employees/{e}/face-id

  nếu chưa consent
    → FaceConsentSheet
    → POST .../face-id/consent
    → set consent optimistic trong session
    → invalidate status query

  bước capture
    → FaceEnrollCamera xin camera permission/chụp ảnh
    → mỗi ảnh được thêm vào face-enroll.store
    → có tối thiểu 3 ảnh mới cho đăng ký
    → prepareFaceImageForUpload()
        resize/nén/convert JPEG, mục tiêu dưới 1 MB
    → enrollFaceId(images)
        FormData, field `photos`, tên face-<index>.jpg
        POST multipart .../face-id/enroll
    → invalidate Face status
    → clear session
    → step=done
```

Nếu backend báo lỗi detection mà không chỉ rõ ảnh nào, hook xóa cả batch và bắt đầu lại.

### 4.4 Revoke

`ProfileFaceSection`/`FaceStatusCard` → `useFaceIdRevoke()` → `DELETE .../face-id` → invalidate status → toast. Đây là action nhạy cảm nên UI cần confirm trước khi gọi.

### 4.5 Verify technical flow đã có

```text
useFaceVerify(employeeId).submitVerify(photoUri)
  → prepareFaceImageBase64(photoUri)
  → POST .../face-id/verify
      { photoBase64, requiresLiveness: true }
  ← verifyRequestId
  → TanStack Query poll mỗi 1.5 giây:
      GET .../face-id/verify/{verifyRequestId}
  → status != pending: phase=result
  → lỗi: phase=error
  → quá 15 giây: phase=timeout
```

### 4.6 Khoảng trống

- `app/face/verify.tsx` chỉ redirect Profile.
- Không có screen sản phẩm hoàn chỉnh gọi `useFaceVerify`; hook/service mới là năng lực kỹ thuật.
- Verify không được nối với Check-in và không có bằng chứng backend liên kết verify request với attendance record.
- `face-quality.ts` chỉ kiểm tra kích thước, tỷ lệ khung và URI theo heuristic; nó không phát hiện khuôn mặt/liveness thật. Comment trong file còn gọi `FACE_CONSENT_VERSION = '1.0.0'` là mock. Backend/AI service vẫn phải validate và backend phải cung cấp/lưu consent version chính thức.
- Privacy/retention/consent version cho dữ liệu sinh trắc học phải chốt với backend/pháp lý, không thể suy ra chỉ từ UI.

## 5. Tính năng lõi 4 — Notification in-app

### 5.1 Bản đồ file

| Lớp | File | Vai trò |
|---|---|---|
| Page | `app/(tabs)/notifications.tsx` | Header + NotificationList |
| Component | `NotificationList.tsx`, `NotificationItem.tsx` | List/filter/paging/item action |
| Hook | `useNotifications.ts` | Infinite Query |
| Hook | `useUnreadCount.ts` | Badge count polling |
| Hook | `useMarkAsRead.ts` | Mark one/all + cache sync |
| Service | `notification.service.ts` | GET/PATCH endpoints |
| Utility | `notification.utils.ts` | read state, event label, time format |
| Layout consumer | `app/(tabs)/_layout.tsx` | Hiển thị tab badge |

### 5.2 Load list và badge

```text
Tabs mount
  → useUnreadCount()
  → GET /tenants/{t}/notifications?page=0&size=1
  → đọc unreadCount trong response
  → poll mỗi 60 giây
  → hiển thị badge, tối đa “99+”

Notifications page
  → NotificationList
  → useNotifications({ unreadOnly, pageSize:20 })
  → useInfiniteQuery page=0
  → scroll cuối → getNextPageParam → page tiếp theo
  → flatten pages[].items
```

### 5.3 Mark-read và đồng bộ cache

```text
User chạm notification chưa đọc
  → PATCH /tenants/{t}/notifications/{id}/read
  → patch mọi list cache: read=true, isRead=true, readAt=now
  → invalidate badge và list

“Đọc tất cả”
  → PATCH /tenants/{t}/notifications/read-all
  → patch mọi item cache
  → invalidate badge và list
```

Utility `isNotificationRead` chịu được backend trả `readAt`, `read` hoặc `isRead`, nhưng đây là compatibility workaround. Contract backend nên thống nhất một field.

### 5.4 Khoảng trống

`expo-notifications` có trong dependency nhưng không được import trong source. Hiện không có push token registration, permission flow, foreground/background listener hay deep link. Tính năng đang có chỉ là **in-app REST list + polling**.

## 6. Tính năng lõi 5 — Site và Assignment

### 6.1 Site list/detail

```text
Profile/Home → /(tabs)/site
  → SiteList
  → useSiteList(params)
  → GET /tenants/{t}/sites
  → loading/error/403/empty/list/pagination

Chọn item
  → /(tabs)/site/[id]
  → SiteDetail
  ├── useSiteDetail(id)
  │     GET /tenants/{t}/sites/{id}
  └── useSiteSupervisors(id)
        GET /tenants/{t}/sites/{id}/assignments
            ?role=supervisor&status=active
        với từng employeeId:
          GET /tenants/{t}/employees/{employeeId}
        ghép firstName + lastName
```

`SiteLocationMap.tsx` dùng native maps; bundler tự chọn `SiteLocationMap.web.tsx` trên web.

### 6.2 Assignment list

Backend không có list assignment toàn tenant theo comment/code, nên chọn site là điều kiện bắt buộc:

```text
/(tabs)/assignment
  → AssignmentListScreen
  ├── useSiteOptions()
  │     GET /tenants/{t}/sites?size=100&sortBy=name
  ├── user chọn site
  ├── useAssignmentList(siteId, filters)
  │     GET /tenants/{t}/sites/{siteId}/assignments
  │     với từng employeeId → GET employee detail
  └── useSiteShiftNames(siteId)
        GET site detail
        map shiftId → shift.name
```

### 6.3 Utility/store

- `assignment.mapper.ts`: label/màu/format role, status, date.
- `assignment.store.ts` hiện không chứa store; file chỉ `export {}` và giải thích filter đang dùng local `useState` trong component.
- `site.utils.ts`: options/label/format của site.

### 6.4 Khoảng trống/hiệu năng

- `assignment/[id].tsx` redirect về list; không có detail API flow.
- Site supervisor và Assignment list đều gọi một request cho từng employee (`N+1`). Cần backend batch endpoint hoặc include employee summary để danh sách lớn không chậm.
- Tìm tên ở Assignment có thể chỉ áp dụng trên page dữ liệu hiện có, không phải search toàn backend nếu API không hỗ trợ.
- Quyền dựa vào HTTP 403; client chưa có permission catalog thống nhất.

## 7. Tenant setup và setting chưa được tiêu thụ

```text
/(admin)/tenant-setup
  → admin layout lấy profile và check role
  → TenantSetupWizard 3 bước
      thông tin cơ bản
      settings
      plan/xác nhận
  → RHF + Zod
  → useCreateTenant()
  → POST /tenants
  → invalidate tenant cache
  → Home
```

`TenantSettings` có `notifications_enabled`, `late_checkin_alert`, `checkin_early_minutes`, `geofence_radius_meters`, `require_face_id`, `random_check_enabled`. Code tạo/cập nhật được setting, nhưng không đồng nghĩa mọi feature đã đọc và thực thi chúng. Hai ví dụ rõ nhất:

- `require_face_id`: chưa được Check-in đọc.
- `random_check_enabled`: Random Check chưa triển khai.

Ngoài wizard tạo tenant, các hàm/hook list, update tenant, settings và subscription chưa được page nào gọi. `getAvailablePlans()` tồn tại trong API layer nhưng wizard đang render `DEFAULT_PLAN_DETAILS` hard-code từ `tenant/utils.ts`. Giá/limit/feature plan trên UI vì vậy có nguy cơ lệch backend.

Trước khi sửa UI theo setting, cần lập ma trận “setting → backend enforcement → frontend behavior → test case”.

## 8. Catalog nhanh toàn feature

| Feature | Page | Component | Hook | Service | Utility/store | Mức hiện tại |
|---|---|---|---|---|---|---|
| Auth | `(auth)/*`, profile | Form components | Nhiều auth hooks | `auth/api.ts` | mapper/utils/store/storage | Khá đầy đủ |
| RBAC | select tenant/admin layout | — | session/select tenant | `rbac/api.ts` | — | Một phần |
| Tenant | tenant-setup | wizard | tenant hooks | `tenant/api.ts` | types/utils | Create đã nối |
| Site | site list/detail | Site* | 3 hooks | site service | types/utils | Read-only đã nối |
| Assignment | list | AssignmentListScreen | assignment hooks | assignment service | mapper/store | List đã nối, detail thiếu |
| GPS | gián tiếp check-in | — | useGps | gps service | types | Đã nối |
| Check-in | checkin/history/modal | Checkin* | 7 hooks | checkin service | mapper/store | Luồng GPS lõi đã nối |
| Face | enroll; verify redirect | Face UI trong profile | face hooks | face services | image utils/store | Enroll có, verify chưa thành flow |
| Notification | notifications/tab badge | Notification* | 3 hooks | notification service | utils | In-app có, push thiếu |
| Profile | profile | ProfileScreen/rows/Face UI | invitation/profile | invitation service + auth API | utils/types | Khá đầy đủ; invitation read-only |
| Attendance | redirect | — | — | employee-id gọi monthly | — | Chưa có màn hình |
| Random Check | redirect | — | — | — | — | Chưa triển khai |

## 9. Cách truy vết một bug xuyên các lớp

Ví dụ lỗi “bấm check-in nhưng kết quả sai”:

1. Page có truyền/render đúng component không?
2. Component chọn đúng `siteId`, disable/loading và gọi đúng callback không?
3. Hook có lấy đúng `activeTenantId`, GPS, `deviceId` và mutation payload không?
4. Service có đúng method/path/case field không?
5. Interceptor có gắn/refresh token không?
6. Backend response raw có đúng rule không?
7. `unwrapApiData`/mapper/type có làm mất field không?
8. `onSuccess` có persist/invalidate/navigation đúng không?
9. Component kết quả có query đúng `tenantId + checkinId` không?
10. Rule đang sai là rule frontend hay rule backend? Không sửa hiển thị để che một status backend sai.
