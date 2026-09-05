# #18 — Trang chủ app không hiện ca làm & #19 — Thông báo đẩy ngoài ứng dụng

Ngày: 2026-09-03 · Repos: `fams-front-app-project`, `fams-backend-project`

## #18 — Trang chủ không hiển thị danh sách ca làm hôm nay

### Triệu chứng
Nhân viên đã được phân công, nhưng trang chủ hiện "Chưa có ca làm" +
"Không thể tải lịch làm việc. Kéo xuống để thử lại." — phải bấm **Mở chấm công** mới thấy danh
sách ca. Ngày trên header hiện lỗi "03/09/YYYY".

### Nguyên nhân
1. Widget "CA LÀM HÔM NAY" chỉ đọc `useEmployeeDashboard()` (`GET /dashboard/employee`). Khi
   **một** request đó lỗi (mạng chập chờn, hoặc backend tính "hôm nay" theo múi giờ tenant =
   UTC trong khi công trình ở `Asia/Ho_Chi_Minh`), `dashboardQuery.isError` → xoá sạch danh
   sách, dù `GET /checkin/available-sites` (màn Chấm công dùng) vẫn trả đủ ca.
2. Widget chỉ hiện `firstShift` + dòng "+N ca khác" — không phải danh sách như người dùng mong
   đợi.
3. `formatTenantDate` cũ dùng chuỗi `.replace()` nối nhau, phân biệt hoa/thường → nếu tenant
   cấu hình token khác kiểu (vd `dd/MM/yyyy`) thì `YYYY`/`yyyy` không được thay → ra
   "03/09/YYYY".

### Đã sửa — [app/(tabs)/home.tsx](../../../app/(tabs)/home.tsx)
- Gọi thêm `useAvailableSites()` (đúng hook màn Chấm công đang dùng).
- Gộp 2 nguồn theo `assignmentId` (`useMemo`) — bản ghi từ dashboard thắng khi trùng (có
  `siteName`/`role` chuẩn cho ngày). Nhân viên luôn thấy **mọi** ca mà một trong hai endpoint
  biết.
- Hiện **toàn bộ** danh sách ca (mỗi ca: tên công trình + tên ca + khung giờ), không cắt còn 1.
- Chỉ hiện trạng thái lỗi khi **cả hai** query lỗi *và* không có ca nào. Nếu chỉ dashboard lỗi
  nhưng available-sites có dữ liệu → hiện danh sách + ghi chú nhỏ "Danh sách lấy từ màn hình
  chấm công — kéo xuống để đồng bộ lại."
- `RefreshControl` kéo-để-tải-lại giờ refetch cả `availableSitesQuery`.

### Đã sửa — [src/features/tenant/tenant-format.ts](../../../src/features/tenant/tenant-format.ts)
`formatTenantDate` viết lại thành **một lượt** `replace(/yyyy|yy|dd|mm/gi, …)` — không phân biệt
hoa/thường, không còn khả năng sót token. Thêm hỗ trợ `YY` (2 số).

## #19 — Push OS ngoài ứng dụng + deep-link khi bấm

### Đã có sẵn (không đổi)
Foreground push (`onMessage` → toast + invalidate query), tap khi app đang chạy/nền
(`onNotificationOpenedApp` + `getInitialNotification` → `resolveNotificationHref`), đăng ký
token FCM (`POST /me/devices`), refresh token.

### Thiếu → đã bổ sung
1. **`setBackgroundMessageHandler` chưa được đăng ký** → React Native Firebase cảnh báo và bỏ
   data message khi app ở nền/đã tắt. Thêm entry point mới:
   - [index.js](../../../index.js) — chạy `registerPushBackgroundHandler()` **trước**
     `import 'expo-router/entry'`. `package.json` → `"main": "index.js"`.
   - [src/features/notification/push-background.ts](../../../src/features/notification/push-background.ts)
     — đăng ký handler (no-op trên Expo Go), đảm bảo kênh Android tồn tại khi cold-start.
2. **Kênh thông báo Android** — trước chỉ tạo `random-checks`. Android 8+ bỏ qua notification
   không có kênh. Thêm `ensureAndroidNotificationChannels()` tạo `fams-default` (importance
   HIGH) — khớp `channelId` backend gửi trong `FcmClient.AndroidConfig`. Gọi khi đăng ký thiết
   bị + trong background handler. `app.json` → `expo-notifications.defaultChannel = "fams-default"`.
3. **Deep-link** — [notification-navigation.ts](../../../src/features/notification/utils/notification-navigation.ts):
   `ASSIGNMENT` → `/(tabs)/my-assignments` (trước là `/(tabs)/checkin`), `VIOLATION` /
   `EXPLANATION` → `/(tabs)/exceptions` (sửa path sai `/exceptions`), `ROLE` → `/(tabs)/profile`.

### Backend đi kèm (repo `fams-backend-project`)
- Phân công tạo/huỷ giờ phát `ASSIGNMENT_CREATED_EMPLOYEE` / `ASSIGNMENT_CANCELLED_EMPLOYEE`
  (in-app + push) — xem `docs/test-evidence/assignment-push-notifications/`.
- `FcmClient` thêm `AndroidConfig` (priority HIGH, channel `fams-default`, sound) + `ApnsConfig`.

## Test

- `npx tsc --noEmit` — sạch.
- `npx eslint` (home.tsx, notification/, tenant-format.ts, index.js) — sạch.
- `npx tsx --test tests/**/*.test.ts` — 18/18 pass, gồm case mới
  `#18: mixed-case tokens never leave a literal token in the output`
  (`dd/MM/yyyy` → `03/09/2026`, `DD/MM/YY` → `03/09/26`).
- `tests/app-config.test.ts` — pass (xác nhận `app.json` + `"main": "index.js"` vẫn parse OK).

> Push thật cần **dev build / APK** (Expo Go SDK 54 không kèm `@react-native-firebase/messaging`).
> Sau khi merge: chạy lại `npx expo prebuild` / build EAS để `index.js` + kênh mới có hiệu lực;
> QA xác nhận trên thiết bị (gửi 1 phân công → thấy push ngoài app → bấm vào → mở
> "Phân công của tôi").
