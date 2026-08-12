# Báo cáo khắc phục tồn đọng App và luồng liên quan — 2026-08-11

## 1. Phạm vi và nguyên tắc

- Ưu tiên sửa lỗi có thể làm App khởi động sai, dùng sai tenant, mất bằng chứng
  chấm công hoặc tạo dữ liệu chấm công không đáng tin cậy.
- Không thay đổi các luồng Google, Firebase Phone Auth, Face ID/active liveness và
  link token đang hoạt động; chỉ bổ sung guard/cấu hình và kiểm thử hồi quy.
- Các thay đổi Web đang dang dở được giữ nguyên. Web chỉ được kiểm tra ở chế độ
  lint, typecheck và production build.

## 2. Các vấn đề đã xử lý

### 2.1 Cấu hình môi trường và IP LAN

- Production build của App không còn âm thầm rơi về `localhost` khi thiếu
  `EXPO_PUBLIC_API_URL`; build sẽ dừng với thông báo cấu hình rõ ràng.
- `scripts/sync-lan-env.mjs` hỗ trợ hai chế độ tách biệt:
  - `npm run start:go:lan`: cập nhật IP LAN và callback Expo Go
    `exp://<IP>:8082/--/login`.
  - `npm run start:dev-client:lan`: cập nhật IP LAN và callback native
    `famsfrontappproject://login`.
- Thêm `.nvmrc` và `engines` để thống nhất Node `20.19.4`/Node 20 LTS giữa máy
  phát triển và CI.

### 2.2 HTTPS App Links và Universal Links

- Cấu hình hiện tại chỉ sinh Android App Links/iOS Associated Domains khi
  `EXPO_PUBLIC_APP_URL` là một HTTPS origin hợp lệ.
- Chỉ cho ba đường dẫn email công khai: `/reset-password`, `/verify-email`,
  `/accept-invite`.
- Không quảng bá universal link giả khi chưa có domain production, tránh link mở
  App nhưng hệ điều hành không thể xác minh ownership.

### 2.3 Check-in offline và bằng chứng Face

- Ảnh bằng chứng offline được giữ tối đa 24 giờ trong vùng dữ liệu riêng của App.
- Quá hạn: xóa file ảnh, giữ một dòng trạng thái `expired` không chứa ảnh để nhân
  viên biết cần liên hệ HR; không xóa âm thầm toàn bộ lịch sử hàng đợi.
- App nói rõ ảnh tĩnh offline chỉ là bằng chứng ngoại lệ, không phải active
  liveness thành công; mode `gps_face_liveness` vẫn phải vào `pending_review`.
- Backend bổ sung giới hạn tương ứng: bản ghi cũ hơn 24 giờ hoặc timestamp đi
  trước giờ server quá 5 phút bị từ chối theo từng record.

### 2.4 Tenant, quyền và định dạng

- App đọc đúng hợp đồng tenant settings hiện tại và áp dụng định dạng ngày/giờ,
  màu primary/secondary/accent theo tenant đang active.
- Ngày dạng `YYYY-MM-DD` được format không qua UTC nên không bị lệch ngày.
- Sau switch tenant, provider tự đọc lại settings theo `activeTenantId`; các màn
  hình tiếp tục dùng tenant ID mới từ auth store/query key.
- Route mobile tạo tenant cũ được chuyển hướng an toàn về Home vì nghiệp vụ tạo
  tenant là Web-only. Deep link cũ không còn mở nhầm wizard chỉ guard theo role.
- Supervisor có đúng permission đã có lối vào danh sách phân công tại site từ
  màn hồ sơ.

### 2.5 Build Backend không còn đóng gói class đã xóa

- Phát hiện image API chứa class `Department*` cũ dù source và migration V71 đã
  chuyển hoàn toàn sang Workspace. Điều này làm API restart với lỗi thiếu bảng
  `departments` sau khi recreate container.
- Sửa Dockerfile từ `mvn package` thành `mvn clean package`; image mới không còn
  artifact Java cũ. Không tạo lại bảng `departments` vì làm vậy sẽ đi ngược mô
  hình nghiệp vụ hiện tại.
- Sau rebuild, `/actuator/health` trả HTTP 200, `status=UP`.

### 2.6 Chất lượng và CI App

- Thêm unit tests cho App config, TTL bằng chứng offline và tenant formatter.
- `npm run quality` hiện chạy lint + TypeScript + unit tests.
- Thêm GitHub Actions chạy `npm ci`, quality, Expo Doctor và kiểm tra version
  package Expo trên mỗi push/PR.

## 3. Bằng chứng kiểm thử

| Hạng mục | Kết quả |
|---|---|
| App lint + TypeScript + unit tests | PASS — 9/9 test |
| Expo Doctor | PASS — 18/18 check |
| `expo install --check` | PASS — dependencies aligned |
| Export bundle Android | PASS — 1.731 module |
| Export bundle iOS | PASS — 1.733 module |
| Backend Maven regression | PASS — 8/8 test khi nạp đúng môi trường host |
| Backend health sau clean rebuild | PASS — HTTP 200/UP |
| Offline timestamp cũ hơn 24 giờ | PASS — `rejected`, không tạo DB row |
| Offline timestamp tương lai quá 5 phút | PASS — `rejected`, không tạo DB row |
| Tenant settings live contract | PASS — HTTP 200, đúng date/time/brand fields |
| Web lint/typecheck/build | PASS; lint còn 104 warning, 0 error |

Hai nonce test sống offline là
`ed8d0740-4353-4388-af0f-a492297ea548` và
`32977d6c-75ad-40a8-b539-32884bc22256`; truy vấn sau test trả
`createdRows=0`.

## 4. Tồn đọng cần quyết định hoặc hạ tầng bên ngoài

### P0 trước production

1. Cung cấp HTTPS frontend origin production để đặt `EXPO_PUBLIC_APP_URL` và
   host hai file xác minh:
   - `/.well-known/assetlinks.json`
   - `/.well-known/apple-app-site-association`
2. Cung cấp Android production certificate SHA-256 và Apple Team ID.
3. Bổ sung `GoogleService-Info.plist` cho iOS; xác nhận Android OAuth client có
   package `com.fams.mobile` và SHA-1/SHA-256 đúng. Google/OTP/FCM native phải
   test bằng development build/EAS build, không thể kết luận bằng Expo Go.

### P1 cần lập đợt nâng cấp riêng

- `npm audit --omit=dev` còn 27 cảnh báo gián tiếp (12 high, 15 moderate) trong
  chuỗi Expo/Metro. `npm audit fix --force` yêu cầu đổi major sang Expo SDK 57 và
  có thể phá Firebase/camera/native build; không được chạy ép trong nhánh ổn
  định. Cần một nhánh nâng SDK riêng, build EAS Android+iOS và regression native.
- Web còn 104 lint warning (`any`, `<img>`); không chặn build nhưng nên giảm dần
  theo module thay vì sửa hàng loạt.
- Test `contextLoads` Backend hiện phụ thuộc DB/Redis/MinIO và `.env` thật; nên
  tạo test profile/Testcontainers và tắt scheduler trong test để CI hoàn toàn cô
  lập. Logic mới đã có unit test độc lập và test sống xác nhận.

## 5. Kết luận

Các lỗi P0 có thể xử lý an toàn trong code hiện tại đã được sửa và regression
đạt. App không còn tự dùng localhost ở production, không giữ ảnh Face offline vô
hạn, không mở sai màn tạo tenant, đồng bộ đúng định dạng/brand theo tenant và
bundle được cho cả Android/iOS. Các việc còn lại cần tài sản production hoặc một
đợt migration major riêng, không nên ép vào nhánh ổn định hiện tại.
