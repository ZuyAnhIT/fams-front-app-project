# Báo cáo đồng bộ App với Face ID Active Liveness P0

> Tài liệu lịch sử. Pipeline P0 này đã được thay bằng InsightFace ngày
> 31/07/2026; trạng thái App mới nhất nằm tại
> `docs/22_BAO_CAO_DONG_BO_APP_FACE_ID_INSIGHTFACE_2026-07-31.md`.

Ngày thực hiện: 30/07/2026  
Phạm vi: `fams-front-app-project`  
Nguồn đối chiếu: `fams-backend-project/docs/api/face-id-management-api.md`, bản cập nhật 30/07/2026.

## 1. Kết luận

Backend chưa triển khai API video/MediaPipe V2. Backend đã chọn bước P0 tương
thích ngược:

- frame `center` trở thành baseline pitch/yaw của chính challenge;
- các frame tiếp theo được so theo delta với baseline;
- action pool tạm thời chỉ còn `turn_left`, `turn_right`, `blink`;
- API start/submit/enroll/check-in/check-out không đổi.

Vì contract không đổi, App không tạo endpoint hoặc luồng V2 giả. App tiếp tục
dùng `expo-camera`, chụp đúng một frame cho mỗi action và gửi theo thứ tự.

## 2. Thay đổi trên App

### 2.1 Hướng dẫn theo baseline

- Bước đầu nói rõ đây là mốc cho toàn bộ thử thách.
- Yêu cầu nhìn vào ống kính, giữ mặt trong khung.
- Sau bước đầu, yêu cầu giữ nguyên vị trí điện thoại và chỉ quay đầu/nhắm mắt.
- Màn giới thiệu chỉ mô tả đúng action pool P0: quay trái, quay phải hoặc nhắm
  mắt; không còn hướng dẫn người dùng chờ lệnh cúi/ngẩng từ backend hiện tại.
- Vẫn giữ parser/UI cho `look_up` và `look_down` để tương thích nếu backend bật
  lại sau QA mà không cần phát hành gấp một bản App mới.

### 2.2 Thông báo lỗi theo kết quả AI

App đọc `steps[].action`, `steps[].reason` và `steps[].detected` để phân biệt:

- nhìn chưa thẳng;
- quay chưa đủ góc;
- quay ngược hướng;
- camera chụp khi mắt vẫn mở;
- không phát hiện hoặc phát hiện nhiều khuôn mặt;
- fail passive anti-spoof;
- khuôn mặt giữa các bước không nhất quán.

Không hiển thị raw exception/threshold của AI. Mọi challenge fail vẫn phải tạo
challenge mới, không upload lại frame vào challenge đã hoàn tất.

### 2.3 Hoàn tất enroll và bảo vệ dữ liệu

- Nếu `enroll/from-challenge` lỗi sau khi liveness pass, App giữ đúng
  `userMessage` backend thay vì thay bằng lỗi chung chung.
- Màn check-out giờ xử lý lỗi tải trạng thái Face ID giống check-in: không mở
  camera khi chưa xác định được consent/status và có nút thử lại.
- Luồng consent, HR pending approval, re-enroll, revoke, site binding, TTL và
  atomic consume giữ nguyên theo nghiệp vụ hiện tại.

## 3. Phạm vi không triển khai

- Không thêm ML Kit/MediaPipe vào App vì backend chưa chọn P1/V2.
- Không chuyển sang quay video hoặc gọi endpoint `/v2` chưa tồn tại.
- Không bỏ hỗ trợ Expo Go cho P0; camera và upload JPEG hiện tại vẫn dùng được.
- Không tự nới threshold ở App vì backend/AI là nguồn quyết định cuối cùng.

## 4. Kịch bản test thủ công bắt buộc

1. Đặt điện thoại ngang hoặc thấp hơn mắt như cách sử dụng bình thường.
2. Bắt đầu challenge, nhìn vào ống kính và giữ điện thoại ổn định ở bước 1.
3. Xác nhận challenge chỉ trả hai action bổ sung thuộc quay trái/quay phải/nhắm
   mắt, không có cúi/ngẩng.
4. Làm đúng action: kiểm tra frame center không còn bị báo `look_down`.
5. Cố ý quay chưa đủ: App phải báo cần quay thêm đúng hướng.
6. Cố ý quay ngược: App phải báo quay ngược hướng.
7. Blink nhưng mở mắt trước lúc chụp: App phải hướng dẫn nhắm mắt khi đếm về 0.
8. Làm đúng toàn bộ: enroll chuyển sang “Đã gửi, đang chờ HR duyệt”.
9. Lặp lại với check-in và check-out tại site `gps_face_liveness`; challenge phải
   gắn đúng `siteId` và chỉ được dùng một lần.
10. Tắt backend khi mở màn check-out: App không được mở camera và phải hiện nút
    “Thử lại”.

## 5. Điều kiện để đánh giá P0 đạt

- Không còn lỗi center → look_down có tính hệ thống trên các thiết bị từng lỗi.
- Người thật hoàn thành được trong tối đa hai lần ở điều kiện đủ sáng.
- Quay sai hướng, ảnh tĩnh lặp lại và nhiều khuôn mặt vẫn bị từ chối.
- Không có hồi quy consent, HR approval, đăng ký lại, check-in và check-out.

Nếu P0 vẫn có tỷ lệ từ chối người thật cao sau ma trận test thiết bị thật, dùng
`docs/20_DE_XUAT_NANG_CAP_FACE_ID_LIVENESS_V2_2026-07-30.md` làm spec triển khai
P1/V2; không tiếp tục nới ngưỡng heuristic vô hạn.

## 6. Kết quả kiểm tra tự động

| Kiểm tra | Kết quả |
|---|---|
| `npm run quality` (ESLint + TypeScript) | PASS |
| `git diff --check` | PASS |
| `npx expo-doctor` | PASS 18/18 |
| Expo export Android | PASS, 1.564 modules |
| Expo export iOS | PASS, 1.568 modules |
| Backend `/actuator/health` | HTTP 200, `UP` |
| Container `fams-ai` | `running`, `healthy` |
| P0 code đang được AI container nạp | `actions=turn_left,turn_right,blink`; `baseline_sanity=45.0` |

Không tự tạo challenge API mới trong bước kiểm tra tự động vì backend giới hạn
5 challenge/10 phút cho mỗi nhân viên; tạo challenge bằng terminal sẽ chiếm
lượt và cản trở bài test khuôn mặt thật trên điện thoại. Happy path P0 vẫn cần
người dùng thực hiện các hành động camera ở mục 4.

Trong lúc kiểm tra, bind mount `/app/app` của container AI từng bị rỗng/stale
sau Uvicorn reload, khiến container chuyển `unhealthy` và chưa nạp được P0 dù
source trên host đã cập nhật. Đã tạo lại **riêng** `fams-ai` bằng Compose để
remount source; không rebuild database, không chạy migration và không sửa code
backend. Sau đó `/health` trả `ok`, container `healthy` và import trực tiếp xác
nhận đúng action pool/baseline mới nêu trong bảng.
