# Báo cáo đồng bộ App với Face ID InsightFace

Ngày thực hiện: 31/07/2026  
Phạm vi: `fams-front-app-project`  
Nguồn đối chiếu: `fams-backend-project/docs/api/face-id-management-api.md`, mục `0.0c`.

## 1. Kết luận

Backend/AI đã thay pipeline dlib bằng InsightFace nhưng giữ nguyên API và state
machine nghiệp vụ:

- SCRFD phát hiện khuôn mặt;
- ArcFace tạo embedding 512 chiều;
- landmark 106 điểm 2D và 68 điểm 3D;
- head pose từ mô hình 3D của InsightFace;
- MiniFASNet passive anti-spoof giữ nguyên;
- consent, active-liveness challenge, HR duyệt, site policy, check-in/out và
  atomic consume không đổi.

Do API không đổi, App không gửi hoặc nhận embedding và không cần tích hợp
InsightFace native. App tiếp tục gửi JPEG theo challenge do server cấp.

## 2. Thay đổi trên App

### 2.1 Khôi phục đủ action liveness

Màn hướng dẫn lại mô tả đầy đủ action pool:

- nhìn thẳng làm baseline;
- quay trái;
- quay phải;
- ngẩng mặt;
- cúi mặt;
- nhắm cả hai mắt.

App vẫn giữ điện thoại cố định giữa các bước và đọc trực tiếp `actions` từ
backend, không tự chọn action hoặc tự kết luận pose.

### 2.2 Migration embedding cũ

ArcFace 512 chiều không thể so với embedding dlib 128 chiều. App đã bổ sung:

- thông báo nâng cấp trong thẻ Face ID của người đang `enrolled`;
- ưu tiên hai field contract tương thích ngược `embeddingModel` và
  `requiresReEnrollment` nếu backend bổ sung sau này;
- trong khi backend chưa trả hai field trên, đối chiếu `enrolledAt` với mốc
  `EXPO_PUBLIC_FACE_ID_ARCFACE_ROLLOUT_AT` của từng môi trường để nhận biết hồ
  sơ được duyệt trước lúc triển khai ArcFace;
- CTA `Nâng cấp / Đăng ký lại Face ID`;
- chặn chủ động luồng **check-in mới** của hồ sơ cũ trước khi mở camera, chuyển
  thẳng nhân viên sang đăng ký lại và chờ HR duyệt;
- không chặn **check-out** của phiên đang mở, tránh giữ nhân viên trong một ca
  không thể kết thúc; kết quả bất đồng bộ vẫn hướng dẫn đăng ký lại nếu mismatch;
- nội dung chờ duyệt không còn khẳng định hồ sơ cũ chắc chắn vẫn chấm công được;
- nếu check-in hoặc check-out trả `faceVerified=false` và score `null`, màn kết
  quả hiện thẻ `Cần đăng ký lại Face ID` cùng nút đi thẳng tới self-enroll;
- vẫn giữ luồng HR duyệt trước khi hồ sơ mới có hiệu lực.

App không tự thu hồi consent và không xóa hồ sơ cũ khi yêu cầu đăng ký lại.

### 2.3 Kết quả check-in/out

Backend xử lý face verification bất đồng bộ. App tiếp tục poll kết quả tối đa
30 giây. Khi mismatch embedding cũ được backend chuyển thành
`pending_review`, App:

- hiện Face ID không đạt;
- không crash hoặc hiển thị exception AI;
- đề nghị đăng ký lại;
- vẫn cho nhân viên gửi giải trình để HR xử lý bản ghi đã phát sinh.

## 3. Khoảng trống contract cần Backend cân nhắc

`GET .../face-id` hiện chỉ trả `status`, consent và review state; không trả model
đã tạo embedding. App vì vậy **không thể xác định chính xác trước check-in** hồ
sơ nào là dlib 128 chiều và hồ sơ nào là ArcFace 512 chiều.

UX hiện tại dùng mốc rollout theo `enrolledAt` để chặn trước check-in, đồng thời
nhận biết gián tiếp sau callback bằng `faceVerified=false + score=null` cho
check-out/bản ghi đã phát sinh. Mốc thời gian là phương án chuyển tiếp, chính xác
khi cấu hình đúng thời điểm deploy của từng môi trường nhưng vẫn kém chắc chắn
hơn metadata do backend trả trực tiếp.

Khuyến nghị backend bổ sung một trong hai cách sau trong đợt migration:

1. Tốt nhất: migration đánh dấu mọi profile khác 512 chiều thành
   `requires_reenrollment`, không coi là usable cho site Face ID.
2. Hoặc mở rộng `FaceIdStatusDto` bằng hai field tương thích ngược:

```json
{
  "embeddingModel": "dlib_128|arcface_512|null",
  "requiresReEnrollment": true
}
```

App đã khai báo hai field optional và sẽ ưu tiên chúng ngay khi backend trả về.
Đây là thay đổi response bổ sung, không phá client cũ. App chỉ chặn check-in;
check-out của phiên đang mở vẫn phải được phép thực hiện và chuyển chờ duyệt nếu
không xác minh được.

Ngoài ra, `CheckinResponse` nên có mã lỗi face verification đã chuẩn hóa, ví dụ
`faceVerificationErrorCode=EMBEDDING_MODEL_OUTDATED`, thay vì chỉ lưu error code
trong description của violation. Khi đó App không cần suy đoán từ score `null`.

## 4. Kịch bản test thủ công

### 4.1 Đăng ký mới bằng InsightFace

1. Employee consent và bắt đầu đăng ký.
2. Xác nhận challenge có thể trả cả `look_up` và `look_down`.
3. Nhìn thẳng, giữ điện thoại cố định và hoàn thành hai action ngẫu nhiên.
4. Xác nhận App hiện đúng lỗi nếu cố ý thực hiện sai action.
5. Làm đúng để gửi hồ sơ; App chuyển sang chờ HR duyệt.
6. HR duyệt trên Web; App tải lại thấy `status=enrolled`.

### 4.2 Hồ sơ cũ

1. Dùng employee có embedding dlib cũ.
2. Hồ sơ phải hiện thông báo nâng cấp và nút đăng ký lại.
3. Mở check-in: App phải chặn trước camera và hiện `Nâng cấp Face ID`.
4. Nếu employee đang có phiên mở thì check-out vẫn được thực hiện; callback
   không được làm crash hệ thống và bản ghi chuyển `pending_review` khi mismatch.
5. Màn kết quả phải hiện `Cần đăng ký lại Face ID` và CTA camera.
6. Đăng ký lại, HR duyệt, sau đó check-in và check-out phải xác thực thành công.

### 4.3 Action và chống giả mạo

1. Test quay trái/phải, cúi/ngẩng và nhắm mắt trên ít nhất hai Android và một
   iPhone.
2. Test góc cầm điện thoại ngang mắt và thấp hơn mắt.
3. Test ảnh in/màn hình và lặp cùng một ảnh cho mọi action: phải bị từ chối.
4. Test nhiều khuôn mặt, thiếu sáng, mặt ra ngoài khung và challenge hết hạn.

## 5. Những điều App không thực hiện

- Không lưu hoặc chuyển đổi vector 128 → 512 chiều.
- Không nhận embedding từ API.
- Không tự quyết định score/threshold ArcFace.
- Không bỏ qua HR approval cho lượt đăng ký lại.
- Không gọi API V2 video/MediaPipe chưa được backend triển khai.
- Không gọi challenge tự động trong test terminal để tránh chiếm rate-limit
  5 lượt/10 phút của tài khoản test thật.

## 6. Kết quả kiểm tra tự động

| Kiểm tra | Kết quả |
|---|---|
| `npm run quality` (ESLint + TypeScript) | PASS |
| `git diff --check` | PASS |
| `npx expo-doctor` | PASS 18/18 |
| Expo export Android | PASS, 1.564 modules |
| Expo export iOS | PASS, 1.568 modules |
| Spring API `/actuator/health` trên host | HTTP 200, `UP` |
| `fams-ai` | `running`, `healthy` |
| InsightFace runtime | `1.0.1`, CPUExecutionProvider |
| Model pack | detection, recognition, landmark 2D/3D, genderage |
| Action pool runtime | `turn_left`, `turn_right`, `look_up`, `look_down`, `blink` |

Kiểm tra runtime được thực hiện trực tiếp trong container, không chỉ đọc source
trên host. Happy path pose/blink cuối cùng vẫn cần camera và khuôn mặt thật.
