# 04. Quy trình phát triển một tính năng

> Mục tiêu của quy trình này là ngăn tình trạng “mỗi màn hình chạy riêng nhưng nghiệp vụ không ăn khớp”. Với dự án hiện tại, không bắt đầu bằng việc code UI; bắt đầu bằng nguồn sự thật nghiệp vụ và hợp đồng dữ liệu.

## 1. Luồng chuẩn từ yêu cầu tới production

```text
Nghiệp vụ/actor/rule
  → khảo sát luồng hiện tại và dependency
  → chốt acceptance criteria + state transition
  → chốt API/permission/error contract
  → thiết kế route/query/store/component
  → triển khai từ type/service lên hook/component/page
  → test tự động + manual native/backend
  → quality/build gate
  → review nghiệp vụ + kỹ thuật + bảo mật
  → rollout/monitor/document
```

## 2. Bước 0 — Phân loại công việc

Trước khi thay đổi, ghi rõ một trong các loại:

| Loại | Ví dụ | Cách làm |
|---|---|---|
| Bug kỹ thuật | token refresh lặp, query key thiếu tenant | Tái hiện → xác định root cause → test regression → sửa nhỏ |
| Sai nghiệp vụ | check-in phải Face Verify nhưng code chỉ dùng GPS | Chốt lại rule với PO/backend trước khi code |
| Feature mới | random check | Phải có actor/state/API/permission/end-to-end design |
| Hoàn thiện placeholder | assignment detail | Xác nhận backend có detail endpoint và UX cần gì |
| Refactor | tách auth page lớn | Giữ behavior, thêm test trước, không đổi contract cùng lúc |
| Hạ tầng | CI/test/pin Node | Đánh giá tác động toàn repo và rollout |

Không trộn feature lớn, refactor rộng và nâng dependency trong cùng một thay đổi nếu không bắt buộc.

## 3. Bước 1 — Khảo sát hiện trạng

### 3.1 Checklist đọc code

1. Tìm route/page trong `app/`.
2. Theo import tới component/screen.
3. Theo hook tới service/store/utility.
4. Liệt kê endpoint, payload, response, error status.
5. Kiểm tra query key có tenant và identifier/filter không.
6. Kiểm tra success có invalidate/patch cache/persist/navigation gì.
7. Kiểm tra route guard và backend permission.
8. Tìm feature khác cùng tiêu thụ entity/setting đó.
9. Tìm platform override `.web.ts(x)` và native permission/config.
10. Đọc docs nhưng luôn đối chiếu code hiện tại; `app-structure.txt` và baseline cũ có thể lỗi thời.

Lệnh hữu ích:

```bash
rg --files app src/features
rg -n "TênComponent|useTenHook|endpoint-fragment" app src
rg -n "queryKey|invalidateQueries|setQueryData|activeTenantId" src/features
rg -n "Redirect|router\.(push|replace)|href" app src/features
```

### 3.2 Vẽ impact map trước khi sửa

Mẫu:

```text
Setting/Entity thay đổi
├── page/component nào hiển thị?
├── hook nào đọc/ghi?
├── service/endpoint nào liên quan?
├── query cache nào phải invalidated?
├── store/storage nào phải migrate/reset?
├── tenant/role/permission nào bị ảnh hưởng?
├── Android/iOS/Web có khác nhau không?
└── dữ liệu nhạy cảm/logging/retention nào liên quan?
```

## 4. Bước 2 — Chốt yêu cầu nghiệp vụ

Mỗi feature cần ít nhất các mục sau trước khi implement:

### 4.1 Actor và phạm vi

- Ai dùng: Employee, Supervisor, HR, Tenant Admin, Platform Admin?
- Trong tenant nào? Có cho phép chuyển tenant giữa luồng không?
- Điều kiện bắt đầu và kết thúc?
- Mobile-only hay có web?
- Online-only hay cần offline/retry/idempotency?

### 4.2 Rule và state machine

Viết rule dưới dạng có thể kiểm thử, không dùng câu mơ hồ.

Ví dụ tốt:

```text
GIVEN tenant.require_face_id = true
AND employee có Face ID enrolled
WHEN employee bắt đầu check-in
THEN app phải có Face Verify passed chưa hết hạn
AND backend phải liên kết verification đó với check-in record
ELSE check-in không được gửi/không được chấp nhận.
```

Liệt kê state và transition:

```text
idle → locating → verifying-face → submitting → accepted/pending/rejected
     ↘ permission-denied
     ↘ gps-disabled
                     ↘ face-failed/timeout
```

### 4.3 Acceptance criteria

Bao gồm happy path và edge case:

- không có tenant;
- không có quyền/HTTP 403;
- session hết hạn/refresh fail;
- mạng chậm/mất mạng/timeout;
- double tap/request trùng;
- app bị kill/mở lại;
- đổi tenant giữa chừng;
- permission từ chối/vĩnh viễn;
- dữ liệu empty/partial/field null;
- backend trả business rejection khác HTTP error.

### 4.4 Ai là nguồn sự thật

| Loại rule | Nguồn sự thật đề xuất |
|---|---|
| Permission, role, tenant membership | Backend |
| Attendance status/geofence/time window | Backend |
| Form format tức thời | Frontend + backend validate lại |
| Loading/modal/filter đang mở | Frontend local state |
| List/detail nghiệp vụ | Backend + Query cache |
| Ca check-in đang mở | Backend; local ID chỉ tối ưu/khôi phục UX |
| Token/session | Auth backend + secure local storage |

## 5. Bước 3 — Chốt hợp đồng backend/API

Không suy API từ UI. Đối chiếu OpenAPI/DTO/backend code với backend owner.

### 5.1 Contract checklist

- Method/path/base path và tenant scope.
- Authentication và permission code.
- Request field, naming, nullability, enum, format date/time/timezone.
- Response trực tiếp hay envelope `{success,message,data}`.
- Pagination dùng `content/page/totalPages` hay `items/page_size`.
- Business error code/message và HTTP status.
- Idempotency/retry behavior cho mutation.
- Multipart field, MIME, size, số file.
- API có liên kết entity không, ví dụ `verifyRequestId` với `checkinId`.
- PII/biometric/GPS logging và retention.

### 5.2 Type và mapper

Nếu DTO backend khác model app, khai báo tách:

```ts
interface BackendThingDto { /* đúng contract */ }
interface Thing { /* model dùng trong app */ }

function mapThing(dto: BackendThingDto): Thing { /* hàm thuần */ }
```

Mapper đặt ở `utils/*mapper.ts` hoặc gần `api-mappers.ts`, có unit test. Không “giải quyết” khác naming bằng type assertion tràn lan.

## 6. Bước 4 — Thiết kế kỹ thuật theo cấu trúc repo

### 6.1 Chọn feature và file

```text
src/features/<feature>/
├── types/<feature>.type.ts
├── utils/<feature>.mapper.ts
├── services/<feature>.service.ts
├── hooks/use-<feature>.ts
├── store/<feature>.store.ts       # chỉ khi cần
└── components/<FeatureScreen>.tsx

app/(group)/feature.tsx            # page route mỏng
```

Không bắt buộc tạo thư mục rỗng. Với module nhỏ, type/api ở root feature như `tenant`/`auth` hiện tại vẫn chấp nhận được, nhưng giữ naming nhất quán trong module.

### 6.2 Thiết kế query key

Query key phải chứa tất cả input làm thay đổi dữ liệu:

```ts
const featureKeys = {
  all: ['feature'] as const,
  list: (tenantId: string, params: ListParams) =>
    ['feature', 'list', tenantId, params] as const,
  detail: (tenantId: string, id: string) =>
    ['feature', 'detail', tenantId, id] as const,
};
```

- Tenant-scoped query luôn có `tenantId`.
- `enabled` phải false khi thiếu tenant/id bắt buộc.
- Chọn `staleTime`, retry, refetch interval theo độ biến động/nguy cơ, không copy mù mặc định.
- Mutation phải xác định cache nào patch và cache nào invalidate.

### 6.3 Chọn loại state

```text
Dữ liệu từ backend?                → TanStack Query
Chỉ một component dùng?            → useState/useReducer
Nhiều component dùng, client-only? → Zustand/context
Cần sống qua restart?              → storage có scope/migration
Token/secret?                      → SecureStore native, không AsyncStorage
```

Nếu persistence theo user/tenant, key phải scope cả hai và reset context khi logout/switch tenant.

### 6.4 Thiết kế permission/guard

- Page group có cần auth guard không?
- UI có permission info để ẩn/disable action trước không?
- Backend vẫn phải chặn request.
- HTTP 403 cần một `FeedbackState` rõ ràng, không hiển thị như lỗi mạng chung.
- Không dùng role string của frontend nếu backend đã có permission code nhưng chưa map.

### 6.5 Thiết kế trạng thái UI

Mỗi screen/list phải xác định:

- initial loading;
- background refetch;
- empty;
- error + retry;
- forbidden;
- offline/timeout nếu quan trọng;
- submit pending/double tap;
- business accepted/pending/rejected;
- accessibility label/hint;
- responsive width và keyboard behavior.

Ưu tiên component chung `AppButton`, `AppHeader`, `FeedbackState`, `ResponsiveContainer`, `ConfirmDialog`, `ToastProvider` và token trong `src/theme/tokens.ts`.

## 7. Bước 5 — Thứ tự triển khai

Thứ tự khuyến nghị giúp lỗi lộ sớm ở biên dữ liệu:

1. **Types/enums**: model request/response/domain.
2. **Pure utilities/mappers**: parse/normalize/validation/format.
3. **Service/API**: path/method/payload/unwrap/map; không có UI side effect.
4. **Query key + hook**: enabled/cache/mutation/error/orchestration.
5. **Store**: chỉ nếu thiết kế đã chứng minh cần client shared/persist state.
6. **Component/screen**: tất cả UI state, accessibility và action.
7. **Page/layout**: route params, guard, navigator wiring.
8. **Cross-feature integration**: Home quick action, badge, Profile row, setting consumption.
9. **Documentation/tests**: thực hiện cùng thay đổi, không để “sau”.

Khi backend chưa sẵn sàng, có thể implement type/service contract và UI state với fixture trong test/story riêng; không để mock fallback chạy lặng lẽ trong production path.

## 8. Bước 6 — Test strategy

Repo hiện chưa có test runner/script `test`; đây là lỗ hổng cần bổ sung. Khi chọn stack test, pin vào `package.json`, thêm CI và tài liệu chạy. Tối thiểu cần các tầng:

| Tầng | Nên test gì | Ví dụ |
|---|---|---|
| Unit | Mapper/utility/validation | auth response naming, phone normalize, distance, read flag |
| Service contract | Method/path/payload/unwrap/error | refresh payload, multipart field, pagination |
| Hook | query enabled/key, mutation success/error/cache | tenant switch, concurrent 401, notification patch |
| Component | loading/error/empty/403/action | chọn site, disable double tap, retry |
| Integration | nhiều layer với mocked server | login→tenant select, check-in→result |
| E2E/native | camera/GPS/Firebase/SecureStore/navigation | Android development build với backend test |

### Test matrix bắt buộc cho feature tenant-scoped

```text
tenant A data không xuất hiện ở tenant B
switch tenant khi query đang chạy
logout/login bằng user khác trên cùng thiết bị
403 khác 404 khác timeout
token hết hạn trong lúc mutation
app restart nếu có persistence
```

### Test matrix cho camera/GPS/biometric

```text
permission chưa hỏi / granted / denied / blocked
hardware/service tắt hoặc không có
ảnh HEIC/JPEG, quá lớn, detection fail
GPS accuracy null/thấp
verify pending/pass/fail/timeout
không log ảnh base64, token hoặc tọa độ thô
```

## 9. Bước 7 — Quality và build gate

Chạy tối thiểu:

```bash
npm run quality
```

Nó gồm:

```bash
npm run lint
npm run typecheck
```

Với thay đổi routing/platform/config, chạy thêm tương ứng:

```bash
npx expo config --type public
npx expo export --platform web --output-dir /tmp/fams-web-export --clear
npx expo export --platform android --output-dir /tmp/fams-android-export --clear
```

Build artifact để ở `/tmp`, không ghi vào repo. Native Firebase/Google/camera/GPS phải test bằng EAS development build/dev client trên thiết bị hoặc emulator phù hợp; bundle pass không chứng minh runtime integration pass.

## 10. Bước 8 — Review checklist

### Nghiệp vụ

- Acceptance criteria đã được PO/BA/backend thống nhất?
- Rule nằm đúng phía frontend/backend?
- State transition có thiếu nhánh không?
- Tenant setting có thực sự được tiêu thụ?
- Feature liên quan có bị lệch sau thay đổi?

### API/data

- Contract đúng OpenAPI/DTO?
- Naming/null/enum/timezone/pagination đúng?
- Query key có tenant/id/filter?
- Cache invalidation đầy đủ?
- Có N+1 hoặc request thừa?

### Auth/security/privacy

- Route có guard phù hợp?
- Backend permission vẫn được enforce?
- Không log/commit token, Firebase file, ảnh mặt, GPS?
- Upload endpoint/MIME/size/retention hợp lệ?
- Logout/switch tenant có clear đúng context/cache?

### UI/UX

- Loading/error/empty/forbidden/success/pending?
- Double tap và retry có an toàn?
- Android/iOS/Web và bàn phím/responsive?
- Accessibility label/hint và hit area?
- Không mở link đến placeholder chưa làm?

### Maintainability

- Page mỏng, component không gọi Axios trực tiếp?
- Mapper/utility là hàm thuần?
- Không tạo store để nhân bản Query data?
- Comment giải thích “vì sao”, không lặp lại code?
- Docs/catalog đã cập nhật?

## 11. Definition of Done đề xuất

Một feature chỉ được gọi là hoàn thành khi:

1. Nghiệp vụ và acceptance criteria được xác nhận.
2. API/permission/error contract được xác nhận với backend.
3. Page–component–hook–service–utility/store nối hoàn chỉnh.
4. Happy path và edge case quan trọng có test.
5. Tenant isolation, auth expiry và permission được test.
6. Loading/error/empty/forbidden/pending UX đầy đủ.
7. Native integration được test trên development build nếu có.
8. `npm run quality` pass và build/export liên quan pass.
9. Không có secret/artifact/debug log trong Git.
10. Tài liệu cấu trúc/luồng/môi trường hoặc feature README được cập nhật.
11. PO/BA xác nhận behavior, QA có evidence/test result.
12. Có rollback/feature flag nếu thay đổi có rủi ro cao.

## 12. Ví dụ áp dụng — nối Face Verify vào Check-in

Đây là ví dụ quy trình, chưa phải yêu cầu đã được phê duyệt:

### Discovery cần trả lời

- Backend có trả tenant settings cho employee không?
- Verify pass có TTL bao lâu?
- Check-in request nhận `verifyRequestId`, token hay backend tự tìm verification gần nhất?
- Check-out có cần verify không?
- Face chưa enroll/consent/revoked thì UX nào?
- Liveness fail/timeout cho phép retry bao nhiêu lần?
- Backend chống replay một verification cho nhiều check-in ra sao?

### Thiết kế dự kiến sau khi contract được chốt

```text
CheckinHome load tenant settings + face status
  → require_face_id=false: GPS flow hiện tại
  → require_face_id=true:
      bắt buộc employeeId + enrolled
      chụp ảnh → useFaceVerify → passed
      lấy GPS
      submit check-in kèm bằng chứng verification theo contract
      backend validate tenant/user/TTL/replay/geofence
```

### Test quan trọng

- setting false không mở camera;
- setting true nhưng chưa enroll;
- permission camera/GPS bị từ chối;
- verify pass/fail/timeout;
- verify pass nhưng check-in timeout rồi retry;
- đổi tenant sau verify;
- verification của user/tenant khác;
- backend từ chối replay/expired verification;
- app bị background/kill giữa flow.

Ví dụ này cho thấy chỉ “gọi hook Face trước hook Check-in” là chưa đủ; cần contract liên kết và rule chống replay ở backend.

## 13. Cách cải thiện code cũ mà không làm vỡ dự án

1. Chọn một vertical slice có acceptance criteria rõ.
2. Viết test tái hiện behavior hiện tại/sai trước khi sửa.
3. Chuẩn hóa biên API bằng mapper thay vì đổi type xuyên toàn app cùng lúc.
4. Sửa query key/cache/tenant isolation trước tối ưu UI.
5. Dùng feature flag hoặc ẩn entry point nếu backend chưa sẵn sàng.
6. Không “hoàn thành” placeholder bằng dữ liệu giả production.
7. Ghi rõ phần nào đã code, phần nào cần backend/PO xác nhận trong PR và docs.
