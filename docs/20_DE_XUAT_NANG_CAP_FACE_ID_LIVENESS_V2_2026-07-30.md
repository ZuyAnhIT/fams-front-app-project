# Đề xuất nâng cấp Face ID Active Liveness V2 — tài liệu bàn giao Backend/AI

> Ngày lập: 30/07/2026  
> Phạm vi: `fams-front-app-project`, `fams-backend-project/fams-api`, `fams-backend-project/ai-service`  
> Mục tiêu: sửa tỷ lệ từ chối người thật cao của active liveness hiện tại, vẫn giữ chống ảnh in/video phát lại, hỗ trợ Android và iOS, ưu tiên công nghệ miễn phí/mã nguồn mở.

## 1. Kết luận và quyết định kiến trúc

Giải pháp được đề xuất là **active liveness dựa trên một đoạn video liên tục**, kết hợp hai lớp:

1. **App — hướng dẫn, không phải nguồn quyết định bảo mật**: dùng detector native theo thời gian thực (ưu tiên Google ML Kit Face Detection) để báo người dùng đã đưa mặt vào khung, quay/cúi đủ góc, mở/nhắm mắt đúng hay chưa.
2. **Backend/AI — quyết định cuối cùng**: dùng MediaPipe Face Landmarker phân tích lại video liên tục, xác minh chuỗi hành động theo challenge, kiểm tra cùng một khuôn mặt xuyên suốt, rồi chạy passive PAD/MiniFASNet trên nhiều frame đại diện.

Không tiếp tục dùng thiết kế “một ảnh cho một hành động + ngưỡng pitch/yaw tuyệt đối” làm luồng self-service chính thức. Endpoint cũ có thể giữ tạm cho kiosk có HR giám sát và giai đoạn chuyển đổi.

```text
App nhận challenge ngẫu nhiên
  -> quay một video liên tục trong toàn bộ thử thách
  -> ML Kit chỉ cung cấp phản hồi tức thời
  -> tải video + timeline + challengeId
  -> AI giải mã và lấy mẫu frame
  -> MediaPipe kiểm tra chuyển động tương đối theo baseline
  -> kiểm tra open -> closed -> open đối với blink
  -> kiểm tra cùng một người trên toàn chuỗi
  -> MiniFASNet/PAD trên nhiều frame
  -> passed | failed + lỗi cụ thể từng bước
  -> enroll-from-challenge hoặc submit check-in
```

## 2. Bằng chứng lỗi hiện tại

Ngày 30/07/2026, bốn challenge từ camera điện thoại thật đều có kết quả:

```text
expected 'center', detected ['look_down']
```

Trong cùng các challenge, phần lớn hành động quay trái/phải vẫn được nhận đúng. Điều này cho thấy:

- ảnh đã đến AI service và detector vẫn nhìn thấy khuôn mặt;
- sai số nằm ở baseline pitch/head-pose, không phải do người dùng hoặc camera không hoạt động;
- ngưỡng tuyệt đối hiện tại không phù hợp với khác biệt hình học khuôn mặt, góc đặt camera và camera trước của từng thiết bị.

Pipeline hiện tại:

- `face_recognition`/dlib 68 landmarks;
- OpenCV `solvePnP` với mô hình mặt 3D chung;
- `pitch >= 12°`, `pitch <= -12°`, center trong khoảng `±10°`;
- một ảnh duy nhất cho mỗi hành động;
- blink được quyết định từ một frame có EAR thấp;
- MiniFASNet chỉ chạy trên frame center.

Tài liệu backend hiện tại cũng ghi nhận góc quay/cúi/ngẩng chưa được QA bằng camera điện thoại thật. Vì vậy đây là lỗi cần sửa ở thuật toán và protocol, không nên giải quyết bằng cách chỉ hướng dẫn người dùng thử lại.

## 3. Vì sao không chỉ hạ ngưỡng

Hạ `PITCH_THRESHOLD_DEG` hoặc mở rộng `CENTER_MAX_DEVIATION_DEG` có thể làm người thật dễ qua hơn nhưng gây các vấn đề:

- center và look-up/look-down có thể cùng được nhận trong một vùng;
- ảnh/video phát lại dễ thỏa điều kiện hơn;
- một frame nhiễu có thể được coi là hành động hợp lệ;
- vẫn không giải quyết sai lệch baseline giữa người và thiết bị;
- không chứng minh được chuyển động có diễn ra theo thời gian.

Ngưỡng phải được tính **tương đối theo baseline của chính phiên đó**, phải được duy trì trên nhiều frame và phải trải qua đúng thứ tự thời gian.

## 4. Yêu cầu nghiệp vụ không được thay đổi

1. Nhân viên phải tự consent trước khi App hoặc AI xử lý dữ liệu sinh trắc học.
2. Self-enrollment bắt buộc qua active liveness và vẫn chờ HR duyệt.
3. Face ID cũ vẫn có hiệu lực trong lúc một lượt re-enroll đang chờ duyệt.
4. Challenge phải gắn với `tenantId`, `employeeId`, `purpose` và `siteId` đối với check-in/check-out.
5. Challenge chỉ được tiêu thụ một lần và phải còn hạn.
6. Check-in ở site yêu cầu Face ID chỉ sử dụng challenge đúng site và đúng purpose.
7. Người không thể hoàn thành sinh trắc học phải có đường chuyển `pending_review`/HR hỗ trợ, không được rơi vào vòng lặp thử vô hạn.
8. Video/ảnh thô chỉ tồn tại đủ lâu để xử lý và duyệt; embedding và audit metadata tuân theo retention policy.

## 5. Giao thức API V2 đề xuất

### 5.1 Bắt đầu challenge

Giữ URL hiện tại và thêm version/capabilities vào response, hoặc tạo `/liveness-challenge/v2`. Tạo URL mới rõ ràng hơn và dễ rollback:

```http
POST /api/v1/tenants/{tenantId}/employees/{employeeId}/face-id/liveness-challenge/v2
Content-Type: application/json
```

Request:

```json
{
  "purpose": "enroll",
  "siteId": null,
  "clientCapabilities": {
    "continuousVideo": true,
    "realtimeFaceGuidance": true,
    "platform": "ios",
    "appVersion": "1.0.0"
  }
}
```

Response:

```json
{
  "challengeId": "uuid",
  "protocolVersion": 2,
  "nonce": "server-generated-random-value",
  "actions": [
    { "type": "center", "minHoldMs": 600 },
    { "type": "turn_left", "minHoldMs": 500 },
    { "type": "blink", "minCycles": 1 }
  ],
  "expiresAt": "2026-07-30T15:00:00Z",
  "maxVideoDurationMs": 12000,
  "maxUploadBytes": 8388608
}
```

Quy tắc:

- luôn bắt đầu bằng `center` để tạo baseline;
- chọn ngẫu nhiên hai hành động không lặp;
- trong giai đoạn P0, tạm chỉ random `turn_left`, `turn_right`, `blink`;
- chỉ bật lại `look_up`, `look_down` sau khi đạt bộ test thiết bị thật ở mục 12;
- lưu hash/nonce của challenge để chống thay thế payload và replay.

### 5.2 Nộp bằng chứng video

```http
POST /api/v1/tenants/{tenantId}/employees/{employeeId}/face-id/liveness-challenge/v2/{challengeId}/evidence
Content-Type: multipart/form-data
```

Multipart parts:

- `video`: MP4/H.264, một video liên tục, không ghép từ nhiều clip;
- `manifest`: JSON gồm thời gian monotonic tương đối, thông số camera và timeline mà App quan sát được;
- `integrityToken`: optional ở giai đoạn đầu, dành cho Play Integrity/App Attest sau này.

Manifest mẫu:

```json
{
  "protocolVersion": 2,
  "nonce": "same-server-nonce",
  "videoDurationMs": 7400,
  "cameraFacing": "front",
  "mirroredPreview": true,
  "encodedVideoMirrored": false,
  "width": 720,
  "height": 1280,
  "timeline": [
    { "action": "center", "fromMs": 500, "toMs": 1900 },
    { "action": "turn_left", "fromMs": 2400, "toMs": 4200 },
    { "action": "blink", "fromMs": 4700, "toMs": 6500 }
  ]
}
```

Backend không được tin kết quả `timeline` hay góc do App báo; metadata chỉ giúp khoanh vùng phân tích. AI phải tự xác minh lại trên video.

Vì xử lý video có thể vượt timeout HTTP thông thường, endpoint nên trả `202 Accepted`:

```json
{
  "challengeId": "uuid",
  "submissionId": "uuid",
  "status": "processing",
  "pollAfterMs": 1000
}
```

### 5.3 Lấy kết quả

```http
GET /api/v1/tenants/{tenantId}/employees/{employeeId}/face-id/liveness-challenge/v2/{challengeId}
```

Response đang xử lý:

```json
{
  "status": "processing"
}
```

Response hoàn tất:

```json
{
  "status": "passed",
  "completedAt": "2026-07-30T14:59:31Z",
  "quality": {
    "faceCoverage": 0.38,
    "brightness": 0.72,
    "sharpness": 0.81
  },
  "steps": [
    { "action": "center", "passed": true, "observedFrames": 8 },
    { "action": "turn_left", "passed": true, "observedFrames": 6 },
    { "action": "blink", "passed": true, "observedFrames": 5 }
  ],
  "pad": {
    "passed": true,
    "score": 0.84
  }
}
```

Không trả raw landmark, embedding hoặc thông số nội bộ đủ chi tiết để kẻ tấn công dò ngưỡng.

### 5.4 Tiêu thụ challenge

Giữ API hiện tại:

- enroll: `POST .../enroll/from-challenge?challengeId=...`;
- check-in/check-out: truyền `livenessChallengeId`.

Backend phải chấp nhận challenge V2 qua cùng state machine và atomic consume hiện tại. Không để App cần biết challenge được xử lý bởi engine V1 hay V2 sau khi đã `passed`.

## 6. Thuật toán AI V2

### 6.1 Tiền xử lý video

1. Xác minh MIME thực, codec, dung lượng và thời lượng; không chỉ tin extension.
2. Từ chối video có timestamp không đơn điệu, duration bất thường hoặc metadata mâu thuẫn.
3. Chuẩn hóa orientation theo metadata, sau đó xác định lại left/right theo ảnh encoded, không theo preview bị mirror.
4. Lấy mẫu khoảng 8–12 FPS; không cần chạy detector trên toàn bộ 30/60 FPS.
5. Mỗi frame phải có đúng một khuôn mặt trong các vùng hành động bắt buộc.
6. Kiểm tra chất lượng: mặt đủ lớn, không ra ngoài khung, blur/ánh sáng/occlusion trong giới hạn.

### 6.2 Baseline theo phiên

- Dùng median của nhiều frame center hợp lệ, không dùng một frame.
- Baseline gồm rotation/transform, vị trí, kích thước khuôn mặt và trạng thái mắt mở.
- Center không yêu cầu pitch tuyệt đối gần `0°`; yêu cầu ổn định, roll nhỏ, mặt trong khung và không có chuyển động lớn.
- Nếu baseline không ổn định thì trả lỗi chất lượng, không gán nhầm thành `look_down`.

### 6.3 Xác minh hành động theo chuỗi thời gian

Giá trị khởi đầu đề xuất để QA, **không coi là ngưỡng production trước khi hiệu chỉnh**:

| Hành động | Điều kiện sơ bộ |
|---|---|
| `center` | baseline ổn định tối thiểu 600 ms, ít nhất 5 frame hợp lệ |
| `turn_left/right` | yaw delta so với baseline đạt 15–30°, giữ ít nhất 400–500 ms và ít nhất 4 frame |
| `look_up/down` | pitch delta so với baseline đạt 10–25°, chỉ bật sau QA thiết bị thật |
| `blink` | bắt buộc chuỗi mắt mở → đóng → mở; không chấp nhận một frame mắt đóng độc lập |

Mỗi hành động phải xảy ra sau hành động trước. Một frame không được dùng để hoàn thành hai bước khác nhau.

MediaPipe Face Landmarker phù hợp hơn pipeline dlib 6 điểm vì cung cấp nhiều landmark 3D, face blendshapes và facial transformation matrix. Tuy nhiên vẫn phải hiệu chỉnh trên dữ liệu thật; thay thư viện không tự động tạo ra độ chính xác production.

### 6.4 Cùng một người và nhận diện danh tính

- Trích embedding trên nhiều frame chất lượng cao ở center và cuối mỗi hành động.
- Kiểm tra nhất quán danh tính xuyên suốt video trước khi average/aggregate.
- Khi check-in/check-out, so khớp với embedding đã được HR duyệt.
- Threshold phải tách riêng cho `same-person-within-session` và `verify-against-enrollment`; không dùng một giá trị cho cả hai mục đích.
- Ghi model version và threshold profile vào audit record để điều tra kết quả sau nâng cấp.

### 6.5 Passive PAD/anti-spoofing

- Không chỉ chạy MiniFASNet trên một frame center.
- Chọn tối thiểu 3–5 frame chất lượng cao ở các thời điểm khác nhau.
- Aggregate score theo policy đã hiệu chỉnh; không pass chỉ vì một frame có score cao.
- Test riêng ảnh in, ảnh trên màn hình, video replay và ảnh/video nén lại.
- Nếu PAD engine lỗi/hết tài nguyên: trả `processing_failed` hoặc chuyển nghiệp vụ sang `pending_review`; tuyệt đối không coi là pass.

MiniFASNet RGB là lớp phòng thủ hữu ích nhưng không phải chứng nhận “bank-grade”. NIST đã chỉ ra hiệu năng các thuật toán PAD phần mềm trên ảnh 2D thay đổi đáng kể theo loại presentation attack; cần đo trên tập tấn công thực tế của hệ thống.

## 7. State machine và chống replay

```text
created
  -> evidence_uploaded
  -> processing
  -> passed -> consumed
  -> failed
  -> expired
```

Yêu cầu bắt buộc:

- mỗi transition cập nhật atomic;
- chỉ chủ thể, tenant, purpose và site đã gắn mới nộp/tiêu thụ được;
- `nonce` dùng một lần;
- không cho upload evidence lần hai vào cùng challenge;
- `passed` phải được tiêu thụ trong thời gian hiện hành (đề xuất giữ tối đa 2 phút);
- hash video được lưu trong audit để phát hiện cùng payload được gửi lại, nhưng không cần giữ video lâu dài;
- rate-limit tách `start challenge`, `upload evidence` và `failed attempts` để tránh vừa spam vừa khóa nhầm người thật.

## 8. Mã lỗi cần chuẩn hóa

| HTTP | `errorCode` | Ý nghĩa/UX |
|---|---|---|
| 400 | `LIVENESS_UNSUPPORTED_CLIENT` | App quá cũ hoặc không hỗ trợ protocol bắt buộc |
| 400 | `INVALID_VIDEO_EVIDENCE` | File/codec/timeline không hợp lệ |
| 409 | `LIVENESS_CHALLENGE_EXPIRED` | Tạo challenge mới |
| 409 | `LIVENESS_CHALLENGE_ALREADY_USED` | Không gửi/tiêu thụ lại |
| 422 | `FACE_NOT_CENTERED` | Đưa mặt vào giữa khung |
| 422 | `FACE_TOO_SMALL` | Đưa điện thoại gần hơn |
| 422 | `POOR_LIGHTING` | Di chuyển tới nơi đủ sáng |
| 422 | `MULTIPLE_FACES_DETECTED` | Chỉ một người trong khung |
| 422 | `ACTION_NOT_COMPLETED` | Trả thêm `failedAction`, không trả ngưỡng nội bộ |
| 422 | `IDENTITY_INCONSISTENT` | Khuôn mặt không nhất quán trong phiên |
| 422 | `LIVENESS_SPOOF_SUSPECTED` | Không tiết lộ điểm/heuristic chi tiết cho App |
| 429 | `TOO_MANY_ATTEMPTS` | Trả `retryAfterSeconds` thật từ server |
| 503 | `LIVENESS_SERVICE_UNAVAILABLE` | Cho thử lại, không tính là một lần gian lận |

Response lỗi nên luôn có:

```json
{
  "success": false,
  "errorCode": "ACTION_NOT_COMPLETED",
  "userMessage": "Chưa nhận được hành động quay đầu sang trái.",
  "details": {
    "failedAction": "turn_left",
    "retryable": true
  }
}
```

Không trả exception Python, raw AI response hoặc đường dẫn file nội bộ.

## 9. Thay đổi App tương ứng

1. Chuyển từ Expo Go sang Development Build cho kiểm thử Face ID production-like.
2. Tích hợp detector native để hiển thị hướng dẫn real-time; kết quả detector chỉ dùng cho UX.
3. Quay một video liên tục thay vì chụp một ảnh cho mỗi hành động.
4. Chỉ chuyển action khi detector thấy điều kiện được giữ đủ thời gian.
5. Upload evidence, poll kết quả và map mã lỗi chuẩn hóa.
6. Vẫn giữ fallback có HR hỗ trợ nếu camera/khả năng tiếp cận không cho phép hoàn thành challenge.

Expo Go không thể chứa thêm native library ngoài các module đã được đóng gói sẵn. Vì vậy có thể dùng Expo Go cho màn hình/nghiệp vụ khác, nhưng kiểm thử ML Kit/Face ID V2 phải dùng Android/iOS Development Build.

## 10. Quyền riêng tư và vận hành

- Chỉ bắt đầu camera/record sau consent và sau thao tác rõ ràng của người dùng.
- Hiện chỉ báo đang quay.
- Mã hóa HTTPS khi truyền; mã hóa storage khi lưu tạm.
- Xóa video raw ngay sau xử lý thành công/thất bại theo thời gian ngắn đã cấu hình; nếu cần giữ cho HR duyệt phải ghi rõ mục đích và retention.
- Không ghi embedding, video hoặc ảnh base64 vào application log.
- Audit lưu challenge ID, model version, result, reason category, timestamps và hash; không lưu chi tiết landmark không cần thiết.
- Khi employee `terminated` hoặc revoke consent, tiếp tục xóa profile/embedding theo luồng hiện tại.

## 11. Khả năng tiếp cận và fallback nghiệp vụ

Không phải mọi nhân viên đều có thể blink/quay/cúi theo lệnh. Backend và UI cần hỗ trợ:

- challenge không dùng blink nếu người dùng khai báo nhu cầu accessibility được HR xác nhận;
- tối đa số lần thử hợp lý, sau đó cho gửi `pending_review` thay vì khóa vĩnh viễn;
- HR-assisted enrollment tại kiosk sau khi chính nhân viên đã consent;
- check-in tạm thời `pending_review` khi AI service lỗi, nhưng không tự đánh dấu `valid`.

Fallback phải được audit và phân quyền, tránh biến thành đường bỏ qua Face ID mặc định.

## 12. Bộ test nghiệm thu bắt buộc

### 12.1 Thiết bị và môi trường

- ít nhất 3 Android thuộc các phân khúc camera khác nhau;
- ít nhất 2 iPhone còn được hỗ trợ;
- ánh sáng trong nhà, ngoài trời, hơi ngược sáng và ánh sáng yếu trong giới hạn sử dụng;
- người dùng khác giới tính, độ tuổi, màu da, có/không kính thường;
- camera đặt cao/thấp hơn mắt và khoảng cách khác nhau.

### 12.2 Người thật

- center không còn bị gán `look_down` có tính hệ thống;
- turn left/right đúng với cả preview mirror và file encoded không mirror;
- blink phải thấy open → closed → open;
- không pass khi hành động quá nhỏ hoặc sai thứ tự;
- không fail toàn challenge chỉ vì một frame nhiễu nếu đủ số frame đạt yêu cầu;
- mục tiêu nghiệp vụ ban đầu: ít nhất 90% pass ở lần đầu và 95% trong tối đa hai lần trên tập QA nội bộ. Đây là gate sản phẩm, không phải tuyên bố chứng nhận PAD.

### 12.3 Tấn công presentation/replay

- ảnh in màu và đen trắng;
- ảnh hiển thị trên điện thoại/tablet/laptop;
- video khuôn mặt phát lại đúng/sai thứ tự;
- video challenge cũ gửi lại;
- cùng file upload vào challenge mới;
- đổi người giữa các hành động;
- ghép/cắt video hoặc timeline giả;
- hai request đồng thời tiêu thụ cùng challenge.

### 12.4 Hạ tầng

- AI service timeout/restart giữa lúc xử lý;
- job retry không tạo kết quả/embedding trùng;
- video quá lớn/sai codec/corrupt;
- rate limit trả đúng `retryAfterSeconds`;
- raw evidence được xóa đúng retention;
- regression enroll, HR approve/reject, revoke, check-in/check-out và site policy.

Backend cần lưu thống kê theo model version: success rate, retry rate, từng failure category, latency p50/p95, PAD score distribution và tỷ lệ manual review. Không log dữ liệu sinh trắc học thô.

## 13. Kế hoạch triển khai giảm rủi ro

### P0 — sửa khả năng sử dụng hiện tại

1. Ghi log nội bộ raw yaw/pitch/roll và quality theo model version, không trả ra App.
2. Tạm loại `look_up/look_down` khỏi action pool.
3. Không dùng pitch tuyệt đối để quyết định center; dùng baseline nhiều frame.
4. Chuẩn hóa error code và `retryAfterSeconds`.
5. Bổ sung test camera thật cho Android/iOS.

### P1 — Liveness V2

1. Thêm API challenge V2 + upload video async + poll result.
2. Tích hợp MediaPipe Face Landmarker và temporal action evaluator.
3. Chạy PAD trên nhiều frame và kiểm tra danh tính xuyên chuỗi.
4. App Development Build tích hợp guidance native và continuous recording.
5. Chạy shadow mode: V2 chấm nhưng chưa quyết định nghiệp vụ, so sánh với V1 trên tập QA có consent.

### P2 — hardening production

1. Bật V2 theo feature flag từng tenant/site.
2. Thêm Play Integrity/App Attest khi có production build.
3. Hiệu chỉnh threshold theo dữ liệu thiết bị thật và theo dõi drift.
4. Nếu yêu cầu bảo mật tăng lên mức tài chính/ngân hàng, đánh giá SDK PAD đã kiểm thử độc lập theo ISO/IEC 30107-3 thay vì tự tuyên bố pipeline RGB miễn phí là “bank-grade”.

## 14. Tiêu chí hoàn thành Backend/AI

- [ ] Không còn sai lệch center → look_down có tính hệ thống trên ma trận thiết bị thật.
- [ ] Action được xác minh theo delta so với baseline và nhiều frame liên tiếp.
- [ ] Blink được xác minh theo chuỗi open → closed → open.
- [ ] Video là một chuỗi liên tục; phát hiện replay/reuse/timeline bất thường.
- [ ] Cùng một danh tính xuyên suốt challenge.
- [ ] PAD chạy trên nhiều frame và fail-closed/pending-review khi engine lỗi.
- [ ] Challenge/site/purpose/TTL/atomic consume giữ đúng nghiệp vụ hiện tại.
- [ ] Có error code ổn định để App xử lý.
- [ ] Có retention, audit và xóa evidence tự động.
- [ ] Đạt bộ test mục 12 và không hồi quy các luồng Face ID/check-in hiện có.

## 15. Tài liệu kỹ thuật tham chiếu

- [Google ML Kit — Face detection concepts](https://developers.google.com/ml-kit/vision/face-detection/face-detection-concepts): Euler angles, eye-open classification và face tracking trên chuỗi frame.
- [Google MediaPipe — FaceLandmarkerResult](https://ai.google.dev/edge/api/mediapipe/python/mp/tasks/vision/FaceLandmarkerResult): landmarks, blendshapes và facial transformation matrices.
- [MediaPipe Face Mesh](https://github.com/google-ai-edge/mediapipe/blob/master/docs/solutions/face_mesh.md): mô hình landmark 3D thời gian thực trên thiết bị di động.
- [Silent-Face-Anti-Spoofing/MiniFASNet](https://github.com/minivision-ai/Silent-Face-Anti-Spoofing/blob/master/README_EN.md): mô hình PAD hiện dùng và cảnh báo độ ổn định phụ thuộc camera/môi trường.
- [Expo — Development builds FAQ](https://docs.expo.dev/develop/development-builds/faq/): giới hạn native module của Expo Go.
- [NIST FATE PAD](https://pages.nist.gov/frvt/html/frvt_pad.html): đánh giá độc lập thuật toán presentation attack detection trên ảnh 2D.
- [ISO/IEC 30107-3:2023](https://www.iso.org/standard/79520.html): nguyên tắc kiểm thử và báo cáo hiệu năng PAD.
- [NIST SP 800-63B — Presentation Attack Detection](https://pages.nist.gov/800-63-4/sp800-63b.html#presentation-attack-detection): yêu cầu PAD cho nhận diện khuôn mặt trong ngữ cảnh xác thực danh tính.

## 16. Nội dung ngắn để gửi đội Backend

> Active liveness hiện tại thất bại có tính hệ thống trên thiết bị thật: 4/4 frame center bị phân loại thành look_down do dùng pitch tuyệt đối từ dlib landmarks + solvePnP. Không nên chỉ hạ threshold. Đề nghị P0 tạm bỏ look_up/look_down, chuyển center/action sang baseline theo phiên và nhiều frame liên tiếp. Kiến trúc đích V2 là một video liên tục: App dùng ML Kit để hướng dẫn real-time nhưng backend không tin kết quả client; AI dùng MediaPipe Face Landmarker xác minh temporal actions, blink open-closed-open, cùng danh tính xuyên chuỗi và MiniFASNet trên nhiều frame. Giữ nguyên consent, HR approval, site binding, TTL và atomic consume. API/acceptance tests/error codes chi tiết nằm trong tài liệu này.
