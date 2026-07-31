# Báo cáo hoàn thiện App Face ID và active liveness

> Cập nhật InsightFace ngày 31/07/2026: backend đã thay dlib bằng SCRFD +
> ArcFace 512 chiều, khôi phục cúi/ngẩng và yêu cầu hồ sơ cũ đăng ký lại. App
> đã đồng bộ tại `docs/22_BAO_CAO_DONG_BO_APP_FACE_ID_INSIGHTFACE_2026-07-31.md`.
>
> Cập nhật P0 ngày 30/07/2026: backend đã chuyển head-pose sang baseline theo
> từng challenge và tạm bỏ `look_up`/`look_down`. App đã đồng bộ UX và chẩn
> đoán lỗi trong `docs/21_BAO_CAO_DONG_BO_APP_FACE_ID_P0_2026-07-30.md`.

Ngày thực hiện: 28/07/2026  
Phạm vi thay đổi: `fams-front-app-project`  
Tài liệu backend đối chiếu:

- `docs/api/face-id-management-api.md`
- `docs/api/face-id-ui-permissions-guide.md`

## 1. Kết luận

App đã được cập nhật theo state machine mới của backend:

- Nhân viên phải tự ghi nhận consent trước khi đăng ký.
- Self-enroll không còn gửi 3–5 ảnh tĩnh vào API `/enroll`; App tạo active-liveness challenge, chụp đúng một frame cho từng hành động ngẫu nhiên và chỉ gọi `/enroll/from-challenge` khi challenge đạt.
- Đăng ký thành công chuyển sang `reviewStatus=pending`, không tuyên bố Face ID đã dùng được.
- App hiển thị độc lập trạng thái Face ID đã duyệt và trạng thái hồ sơ đang chờ HR duyệt/bị từ chối.
- Nhân viên có Face ID cũ vẫn thấy thông báo Face ID cũ tiếp tục có hiệu lực trong lúc đăng ký lại đang chờ duyệt.
- Chấm công tại site bắt buộc Face ID chạy một challenge mới với `purpose=checkin`, sau đó gửi `livenessChallengeId` cùng request check-in.
- App xử lý `FACE_ID_REQUIRED` và `FACE_ID_NOT_ENROLLED`, có đường dẫn sang đăng ký Face ID.
- Nhân viên có thể thu hồi consent/hồ sơ Face ID, kèm cảnh báo hậu quả đối với site bắt buộc Face ID.
- HR xem hàng đợi, duyệt/từ chối người khác và cấu hình site vẫn là Web-only đúng theo tài liệu.

Backend đã sửa các P0 trong báo cáo lần đầu. App đã đồng bộ contract mới và
test API thật xác nhận các điểm có thể kiểm tra không cần ảnh khuôn mặt thật.
Happy-path camera/liveness đầy đủ vẫn cần thực hiện thủ công trên điện thoại vì
terminal không thể tạo các tư thế khuôn mặt thật.

## 2. Công nghệ đang dùng

### 2.1 Phía App

- `expo-camera`/`CameraView`: mở camera trước và chụp frame.
- `expo-image-manipulator`: chuẩn hóa JPEG, resize và nén trước khi upload.
- App không lưu embedding, không tự quyết định khuôn mặt có hợp lệ và không dùng Face ID/Touch ID của iPhone/Android để thay cho nhận diện nhân viên.
- App không dùng ML Kit để nhận dạng danh tính. ML Kit Face Detection chỉ phù hợp bổ sung phản hồi thời gian thực như vị trí mặt, góc đầu, xác suất mở mắt; chính Google cũng phân biệt face detection với face recognition.

### 2.2 Phía backend/AI theo code hiện tại

- Challenge gồm `center` và hai hành động ngẫu nhiên trong quay trái/phải, nhìn lên/xuống, chớp mắt.
- Backend kiểm tra đúng hành động, một khuôn mặt, cùng một người giữa các frame, passive anti-spoofing trên frame chính diện, rồi giữ embedding ở server.
- Đây là bước tiến rõ rệt so với chỉ lưu ảnh phẳng, nhưng chưa nên gọi là “bank-grade”. Ba ảnh rời không chứng minh được tính liên tục của một phiên video và chưa có bằng chứng kiểm thử PAD độc lập theo ISO/IEC 30107-3.

## 3. Luồng nghiệp vụ App sau cập nhật

### 3.1 Đăng ký lần đầu

```text
Hồ sơ
  → xem thông tin consent
  → nhân viên chủ động đồng ý
  → xin quyền camera
  → tạo challenge purpose=enroll
  → center + 2 hành động ngẫu nhiên
  → gửi frame theo đúng thứ tự
  → challenge passed
  → enroll/from-challenge
  → reviewStatus=pending
  → chờ HR duyệt trên Web
  → status=enrolled
```

Không tạo challenge trước khi quyền Camera sẵn sàng, tránh mất thời gian trong TTL 90 giây. Khi challenge hết hạn hoặc bất kỳ bước nào thất bại, App bắt buộc tạo challenge mới.

### 3.2 Đăng ký lại

- Chỉ cho gửi lượt mới nếu không có `reviewStatus=pending`.
- Nếu đang có `status=enrolled`, khuôn mặt đã duyệt trước đó tiếp tục dùng được.
- Nếu HR từ chối, App hiện `rejectionReason` và CTA “Đăng ký lại Face ID”.

### 3.3 Chấm công

```text
Chọn site
  → site yêu cầu Face ID?
     → có: kiểm tra Face ID đã duyệt
          → challenge purpose=checkin + siteId
          → passed
          → lấy GPS
          → submitCheckin(livenessChallengeId)
     → không: submit bình thường
```

`available-sites` hiện trả `requireFaceIdCheckin`; App mở camera chủ động. Nhánh
422 vẫn được giữ như lớp phòng vệ vì backend vẫn là nguồn quyết định cuối cùng.
Challenge check-in được gắn đúng `siteId` và phải được tiêu thụ trong vòng hai
phút sau khi pass.

### 3.4 Thu hồi

- Nhân viên được cảnh báo việc thu hồi làm mất quyền tự chấm công ở site bắt buộc Face ID cho tới khi đăng ký và được duyệt lại.
- App không hiển thị nút thu hồi lần nữa khi hồ sơ đã ở trạng thái `revoked`.

## 4. Phạm vi giao diện

### App đã triển khai

- Consent Face ID của chính nhân viên.
- Active-liveness self-enroll.
- Xem trạng thái chính, chờ duyệt, bị từ chối và lý do.
- Đăng ký lại.
- Thu hồi.
- Active-liveness trước check-in tại site bắt buộc Face ID.
- Xử lý lỗi nghiệp vụ Face ID khi check-in.

### Web-only, không dựng trong App

- Danh sách tổng quan nhân viên đã/chưa đăng ký.
- Hàng đợi HR duyệt Face ID.
- Duyệt/từ chối hồ sơ người khác.
- HR thu hồi Face ID của người khác.
- Toggle `requireFaceIdCheckin` trong form site.

## 5. Đối chiếu backend sau khi sửa

### Các P0 đã được xác nhận

| Hạng mục | Trạng thái |
|---|---|
| Employee xem trạng thái Face ID của chính mình | Đã sửa; test sống nhận HTTP 200 bằng tài khoản employee thường |
| `available-sites.site.requireFaceIdCheckin` | Đã thêm; test sống xác nhận field tồn tại |
| Challenge check-in bind `siteId` | Đã thêm; thiếu site nhận 400, có site hợp lệ nhận 200 |
| Freshness hai phút và atomic consume | Đã có trong `CheckinService`/`consumeIfPassed`; cần test camera thật để chạy đến bước consume |
| Publish AI job lỗi chuyển `pending_review` | Đã có trong code backend |
| Preview ảnh chờ duyệt | Đã có endpoint JPEG, thuộc Web-only |
| Consent guard trước challenge enroll | Đã chặn tại `startLivenessChallenge` |
| Rate limit 5 lần/10 phút | Đã sửa; test sống 5 lần nhận 200, lần 6 nhận 429 `TOO_MANY_ATTEMPTS` |

App đã bổ sung:

- Gửi `siteId` khi tạo challenge `purpose=checkin`.
- Coi `requireFaceIdCheckin` là field bắt buộc của contract.
- Hiện thông báo rate-limit, disable nút và đếm ngược 10 phút.
- Khi challenge không còn hợp lệ/khác site, yêu cầu làm challenge mới.

### Vấn đề backend còn lại phát hiện khi kiểm tra lại

Endpoint revoke và tài liệu mô tả người dùng rút consent, phải đồng ý lại trước
khi đăng ký. Tuy nhiên `ai-service/app/routers/enroll.py` khi
`DELETE /enroll/{employeeId}` hiện đặt `status='revoked'` và xóa embedding nhưng
không đặt:

```text
consent_given = false
consent_given_at = null
```

Dữ liệu seed cũng có hồ sơ `status=revoked` nhưng `consentGiven=true`. Kết quả là
App/backend có thể cho đăng ký lại ngay mà không hiện lại consent sheet, trái với
Javadoc revoke và nội dung UI “rút lại đồng ý”.

Cần chọn và thống nhất một trong hai nghiệp vụ:

1. `revoke` đồng thời là rút consent: backend đặt consent false và bắt đồng ý lại;
   đây là phương án phù hợp với UI/tài liệu hiện tại.
2. Tách hai action “xóa mẫu Face ID” và “rút consent”, bổ sung endpoint/trạng thái
   riêng và sửa lại nội dung App.

### P1 chưa thuộc đợt backend này

1. Consent cần lưu `noticeVersion`, policy URL, mục đích, tenant/data controller và nguồn ghi nhận.
2. Có phương thức chấm công thay thế/manual review cho người không đồng ý hoặc không dùng được sinh trắc học.
3. Thực hiện DPIA, lịch retention và quy trình yêu cầu truy cập/xóa dữ liệu.
4. Bổ sung Play Integrity/App Attest trong production build.
5. Kiểm thử PAD độc lập, FMR/FNMR và ngưỡng góc trên thiết bị/dân số thực tế.
6. Cân nhắc video continuity nếu mô hình rủi ro thực tế yêu cầu mức chống replay cao hơn.

## 6. Kết quả kiểm tra tự động

| Kiểm tra | Kết quả |
|---|---|
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `git diff --check` | PASS |
| `npx expo-doctor` | PASS 18/18 |
| Expo export Android | PASS |
| Expo export iOS | PASS |
| Backend `/actuator/health` tại cấu hình LAN hiện tại | HTTP 200, `UP` |
| Migration Face ID V75/V76 | PASS |
| Employee tự gọi `GET .../face-id` | PASS, HTTP 200 |
| `available-sites` có `requireFaceIdCheckin` | PASS, HTTP 200 |
| Start check-in challenge thiếu `siteId` | PASS, HTTP 400 |
| Start check-in challenge đúng `siteId` | PASS, HTTP 200 |
| Rate limit 5 lần/10 phút | PASS, lần thứ 6 HTTP 429 `TOO_MANY_ATTEMPTS` |

Sáu challenge test được tạo để kiểm tra contract/rate-limit đã được xóa đúng ID
sau khi test; không thay đổi hồ sơ Face ID hay check-in hiện có. Chưa chạy bước
nộp frame/pass liveness vì terminal không có chuỗi ảnh khuôn mặt thật đúng từng
hành động.

## 7. Checklist test sống trên điện thoại

Chuẩn bị:

- Một tài khoản employee active có assignment hôm nay.
- Một tài khoản HR khác employee, có `face_id:manage`.
- Một site active, assignment/shift đang trong cửa sổ check-in, geofence phù hợp và `requireFaceIdCheckin=true`.
- Android/iPhone có camera trước, App Development Build hoặc Expo Go cho phần camera thuần; kiểm thử App Attest/Play Integrity bắt buộc Development/Production Build.

Kịch bản:

1. Employee mở Hồ sơ → Face ID: trạng thái tải được, không 403.
2. Chọn Đăng ký → không tick consent thì nút tiếp tục bị khóa.
3. Đồng ý → từ chối quyền Camera: App không tạo/thu frame.
4. Cấp quyền → challenge có ba hành động, đếm ngược và giới hạn 90 giây.
5. Dùng cùng một ảnh/không làm đúng tư thế: challenge fail, App hiện bước lỗi và bắt tạo challenge mới.
6. Làm đúng: UI báo “đã gửi, chờ HR duyệt”; chưa được phép check-in Face ID nếu chưa có hồ sơ cũ.
7. HR Web thấy đúng employee và ảnh preview, không thể tự duyệt hồ sơ chính mình.
8. HR từ chối: App poll/tải lại thấy lý do và cho đăng ký lại.
9. Gửi lại và HR duyệt: App thấy `status=enrolled`.
10. Chọn site bắt buộc Face ID: App mở challenge trước submit check-in.
11. Challenge passed + GPS hợp lệ: tạo check-in đúng site.
12. Dùng lại challenge vừa tiêu thụ: backend từ chối.
13. Dùng challenge đã quá cửa sổ freshness hoặc tạo cho site A để check-in site B: backend từ chối.
14. Thu hồi Face ID: ảnh/embedding/pending submission bị xóa; site bắt buộc chuyển sang luồng đăng ký.
15. Chuyển employee thành `terminated`: Face ID bị tự thu hồi và check-in bị chặn.

## 8. Nguồn tham khảo kỹ thuật và pháp lý

- NIST SP 800-63B yêu cầu PAD cho nhận diện khuôn mặt và nêu yêu cầu kiểm thử độc lập/metric: <https://pages.nist.gov/800-63-4/sp800-63b.html>
- NIST SP 800-63A đề cập PAD theo ISO/IEC 30107-3 và manual review trong kiểm chứng từ xa: <https://pages.nist.gov/800-63-4/sp800-63a.html>
- NIST Face Analysis Technology Evaluation – PAD: <https://pages.nist.gov/frvt/html/frvt_pad.html>
- Expo Camera: <https://docs.expo.dev/versions/v54.0.0/sdk/camera/>
- Google ML Kit Face Detection: <https://developers.google.com/ml-kit/vision/face-detection/>
- AWS Face Liveness mô tả video challenge, confidence/audit images và giới hạn của hệ thống liveness: <https://docs.aws.amazon.com/rekognition/latest/dg/face-liveness.html>
- Apple App Attest: <https://developer.apple.com/documentation/DeviceCheck/establishing-your-app-s-integrity>
- ICO về biometrics trong chấm công lao động, consent và phương án thay thế: <https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/employment/monitoring-workers/can-we-use-biometric-data-for-time-and-access-control-and-monitoring/>
- Luật Bảo vệ dữ liệu cá nhân 91/2025/QH15, hiệu lực 01/01/2026: <https://vanban.chinhphu.vn/?classid=1&docid=214590&pageid=27160&typegroupid=3>
- Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân: <https://xaydungchinhsach.chinhphu.vn/toan-van-nghi-dinh-13-2023-nd-cp-bao-ve-du-lieu-ca-nhan-119230516104357809.htm>
