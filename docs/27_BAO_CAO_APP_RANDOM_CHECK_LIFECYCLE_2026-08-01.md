# Báo cáo App — vòng đời Random Check

Ngày kiểm tra: 01/08/2026  
Nhánh App: `feature/random-check-lifecycle-ui`

## 1. Kết luận

App đã có và đã được đồng bộ đủ phần nghiệp vụ dành cho nhân viên: nhận yêu cầu, chỉ hiển thị check đã thực sự được gửi, đếm ngược theo thời gian máy chủ, thu GPS, chụp selfie trực tiếp khi policy yêu cầu Face ID/liveness, gửi đúng một phản hồi, hiển thị trạng thái AI đang xử lý và poll kết quả cuối.

Các công việc sinh lịch, snapshot cấu hình, xếp hàng dispatch và tự huỷ check là nghiệp vụ hệ thống/backend; không dựng màn hình nhân viên cho các bước này. Việc HR huỷ thủ công hoặc theo dõi check thuộc Web theo phân quyền của tài liệu backend.

## 2. Đối chiếu 10 tính năng

| Tính năng | Nơi xử lý đúng | Kết quả trên App |
|---|---|---|
| Sinh scheduled checks đầu ca | Backend job | Không tạo UI; App chỉ nhận check đã dispatch |
| Snapshot config | Backend | App đọc `configSnapshot.checkMode` của từng check, không đọc config hiện tại |
| Delayed dispatch | Backend Redis ZSET/job | App ưu tiên `status=sent`, không suy đoán từ `scheduledAt` |
| Huỷ scheduled check | Backend/Web HR | App tự mất check sau lần refresh/poll |
| Gửi notification | Backend FCM + in-app | Đã đăng ký FCM token, xử lý foreground, background tap và token refresh |
| Hiển thị check đang chờ | App | Có badge/banner/danh sách và đồng hồ đếm ngược |
| Phản hồi GPS | App | Lấy GPS chính xác rồi POST `/respond` |
| GPS + Face ID | App | Kiểm tra Face ID enrolled, chỉ cho chụp camera trực tiếp |
| GPS + Face ID + liveness | App + AI backend | App gửi ảnh thật; không tin score do client tự tạo; poll kết quả AI |
| Từ chối phản hồi trễ | Backend + App | Khoá thao tác khi `secondsRemaining` về 0 và xử lý `CHECK_EXPIRED` |

## 3. Điều chỉnh đã thực hiện

### 3.1 Đồng hồ chống lệch giờ thiết bị

Mốc ban đầu lấy từ `secondsRemaining` của response backend và trừ thời gian đã trôi kể từ lúc React Query nhận response. `expiresAt` chỉ còn là fallback tương thích dữ liệu cũ. Nhờ đó việc người dùng đổi giờ điện thoại không kéo dài thời hạn phản hồi.

Ngay trước khi gửi, App kiểm tra lại thời gian còn lại. Khi về 0, form bị đóng và danh sách được tải lại; backend vẫn là lớp quyết định cuối cùng với HTTP 410.

### 3.2 Không làm lộ lịch kiểm tra trong tương lai

App chỉ hiển thị check có `status=sent`; check `pending` và `scheduledAt` tương lai không còn xuất hiện dưới dạng “Sắp tới”. Đây là yêu cầu bảo toàn tính bất ngờ của spot check.

Backend đã bổ sung lớp bảo vệ tương ứng: check `pending` chỉ xuất hiện trong `/my-pending` khi còn tối đa 60 giây trước thời điểm dự kiến. App vẫn chỉ hiện `sent`, vì `pending` chưa phải yêu cầu được phép phản hồi.

### 3.3 Chống gửi trùng khi mạng chập chờn

Nếu POST bị timeout/mất response hoặc trả `ALREADY_RESPONDED`, App gọi `GET /{checkId}/my-result` để đối soát. Chỉ khi server xác nhận `status=responded` và có `respondedAt`, App mới báo đã gửi. Nếu check vẫn `sent`, App không tự suy diễn thành công và không tự động POST lặp lại.

### 3.4 Push FCM cho Android/iOS

- Thêm `@react-native-firebase/messaging` đúng cùng phiên bản `25.1.0` với Firebase App/Auth.
- Thêm config plugin Firebase Messaging và Expo Notifications, channel Android `random-checks` mức HIGH.
- Sau đăng nhập: xin quyền, lấy FCM registration token và đăng ký `POST /api/v1/me/devices`.
- Cập nhật token mới qua `onTokenRefresh`.
- Foreground: refresh inbox + random-check query và hiện toast khẩn.
- Background/quit: hệ điều hành hiển thị notification; khi người dùng chạm, App đọc `data.checkId` và mở thẳng đúng check.
- Đăng xuất: cố gắng huỷ token qua `DELETE /api/v1/me/devices/{deviceToken}` trước khi xoá phiên.
- Expo Go được bỏ qua an toàn, không import/chạy native module; polling và inbox vẫn hoạt động.

## 4. Liên kết nghiệp vụ

- Employee/assignment/site bị inactive hoặc huỷ: backend huỷ check; App không giữ bản sao lịch riêng.
- Tenant switching: mọi query dùng `activeTenantId`; query cache được làm mới sau switch nên không trộn check giữa công ty.
- Face ID: mode face chỉ mở khi hồ sơ của employee trong tenant hiện tại đã `enrolled` và không yêu cầu đăng ký lại.
- Geofence: App chỉ gửi GPS/accuracy; backend quyết định trong/ngoài vùng theo site của check.
- Attendance/violation: App không tự kết luận công hoặc vi phạm. Kết quả random check do backend/AI chốt và được phản ánh ở bảng công/báo cáo.
- Liveness: đây là passive liveness trên ảnh selfie theo pipeline AI hiện tại, không phải active challenge riêng trên màn Random Check.

## 5. Kiểm thử tự động đã chạy

| Kiểm tra | Kết quả |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npx expo config --type public` | PASS; nhận đủ plugin Notifications + Firebase Messaging |
| `npx expo export --platform web` | PASS |
| `npx expo export --platform android` | PASS, 1714 modules |
| `npx expo export --platform ios` | PASS, 1716 modules |
| `git diff --check` | PASS |

Các bước trên xác minh code, type, config và bundle; không thay thế push/permission/camera/GPS test trên điện thoại thật.

## 6. Đối chiếu các điều chỉnh backend mới

### 6.1 P0 — hạn chế lộ check `pending`: ĐÃ ĐỒNG BỘ

Backend giới hạn `pending` theo `scheduledAt <= now + 60 giây`, kể cả khi gọi tường minh `?status=pending`. App không hiển thị record `pending`, chỉ dùng các lần `sent` thực tế. Hai lớp này vừa tránh rò rỉ lịch cả ngày vừa không làm App nhận nhầm một lần chưa dispatch.

### 6.2 P1 — metadata trong FCM data payload: ĐÃ ĐỒNG BỘ

Backend hiện gửi `eventType/checkId/siteId/expiresAt` dưới dạng String→String trong `Message.data`. App đọc trực tiếp `data.checkId` khi mở từ background/quit và truyền `checkId` vào route. Metadata trong inbox vẫn được hỗ trợ; dữ liệu cũ thiếu metadata sẽ fallback về danh sách chung.

Android đã có default channel `random-checks` mức HIGH từ config plugin App, nên notification message không khai báo channel riêng vẫn dùng channel mặc định này.

### 6.3 P1 — tách preference in-app và push: BACKEND ĐÃ SỬA

App không cần đổi contract: backend đã đánh giá `inAppEnabled` và `pushEnabled` độc lập. Trường hợp tắt inbox nhưng bật push vẫn nhận được random check trên thiết bị; lúc mở từ push, App dùng FCM data payload thay vì phụ thuộc bản ghi inbox.

### 6.4 Các giới hạn đã biết

- Backend chưa phân biệt `processingStatus=failed` với AI còn đang xử lý; App chỉ có thể timeout và hướng dẫn tải lại.
- Ca qua đêm vẫn là P2 theo tài liệu backend.
- Backend đã có job xoá ảnh check-in/random-check/liveness theo mốc cấu hình mặc định 30 ngày. Retention ảnh enrollment còn chờ logic nhận biết hồ sơ đang đợi HR duyệt, và con số 30 ngày vẫn cần xác nhận pháp lý.

## 7. Kịch bản cần test thủ công trên development build

Không dùng Expo Go cho bài test push FCM. Cần cài EAS development build có module native mới.

1. Đăng nhập nhân viên, cho phép Notifications, Location và Camera.
2. Backend/HR tạo hoặc chờ một check `location_only`; xác nhận push xuất hiện khi App foreground và background.
3. Chạm notification; xác nhận mở màn “Kiểm tra ngẫu nhiên” và tự mở đúng `checkId` vừa nhận.
4. Xác nhận chỉ check đã gửi xuất hiện, không thấy giờ check tương lai.
5. Kiểm tra đồng hồ giảm từng giây; đổi giờ hệ thống điện thoại và xác nhận thời hạn không bị kéo dài.
6. Gửi GPS trong geofence; xác nhận kết quả được chốt ngay.
7. Lặp với `location_face`; xác nhận cần Face ID enrolled, camera không cho chọn ảnh thư viện, màn kết quả hiện “đang xác minh” trước khi AI hoàn tất.
8. Lặp với `location_face_liveness`; xác nhận cả Face ID và Người thật có kết quả riêng.
9. Tắt mạng ngay sau khi bấm gửi rồi bật lại; xác nhận App đối soát kết quả và không tạo phản hồi thứ hai.
10. Để check hết hạn; xác nhận nút bị khoá và backend trả/ghi nhận no-response theo job.
11. Huỷ assignment hoặc terminate nhân viên khi check đang chờ; xác nhận check biến mất sau refresh và không tạo vi phạm oan.
12. Chuyển tenant; xác nhận check, Face ID và kết quả đều đổi theo công ty mới.

## 8. Tham chiếu kỹ thuật và thực tế

- Expo xác nhận remote push không có đầy đủ trong Expo Go và yêu cầu development build: <https://docs.expo.dev/versions/v54.0.0/sdk/notifications/>.
- Expo mô tả React Native Firebase Messaging là lựa chọn dùng FCM trực tiếp trên Android/iOS: <https://docs.expo.dev/guides/using-push-notifications-services/>.
- React Native Firebase mô tả `onMessage`, hành vi foreground/background/quit và notification payload: <https://rnfirebase.io/messaging/usage>.
- QuickBooks Time mô tả geofence nhắc nhân viên khi vào/rời địa điểm, nhưng người dùng vẫn kiểm soát thao tác clock-in/out: <https://quickbooks.intuit.com/learn-support/en-us/help-article/feature-preferences/set-use-geofencing-quickbooks-time/L3pZUXKzW_US_en_US>.
- Deputy dùng ảnh xác minh tại thời điểm chấm công và cho quản trị viên bật/tắt policy: <https://help.deputy.com/hc/en-au/articles/14133681301007-Disable-enable-photo-verification-for-timesheets-on-the-Deputy-mobile-app>.

## 9. Trạng thái bàn giao

Phần code App đã hoàn tất và qua kiểm tra tự động. Hai việc không thể xác nhận trong môi trường terminal là delivery FCM/APNs tới thiết bị thật và chất lượng camera/GPS/AI tại hiện trường; thực hiện theo mục 7 sau khi tạo lại development build.
