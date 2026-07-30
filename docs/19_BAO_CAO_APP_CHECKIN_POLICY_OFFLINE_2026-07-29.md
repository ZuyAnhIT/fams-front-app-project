# Báo cáo hoàn thiện App — Check-in/out GPS, Face ID, liveness và offline

Ngày thực hiện: 29/07/2026  
Phạm vi thay đổi: `fams-front-app-project`  
Backend được đọc và smoke test; **không sửa mã backend**.

## 1. Kết luận

App đã được cập nhật theo contract mới:

- Bỏ hoàn toàn cờ cũ `requireFaceIdCheckin`.
- Dùng duy nhất `effectiveCheckinPolicy` do
  `GET /checkin/available-sites` resolve theo đúng site + shift occurrence.
- Hỗ trợ đủ ba mức:
  - `gps_only`: GPS;
  - `gps_face`: GPS + ảnh camera trước;
  - `gps_face_liveness`: GPS + active liveness.
- Check-out áp dụng lại Face ID/liveness giống check-in.
- Hiển thị kết quả Face ID riêng ở lúc vào ca và ra ca; trạng thái `null`
  được diễn giải là “Đang xác thực” khi policy yêu cầu.
- Round 2/V78: dùng `effectiveCheckinPolicy` snapshot từ chính bản ghi cho
  checkout, phục hồi ca sau restart và quyết định polling worker Face ID.
- Hiển thị `siteName`, nguồn `online/offline`, GPS checkout và trạng thái/điểm
  Face ID của cả hai đầu trong kết quả; lịch sử có tóm tắt Face vào/ra.
- Chủ động kiểm tra Face ID khi chọn ca có policy Face, disable chấm công và
  đưa CTA đăng ký/xem trạng thái duyệt thay vì chờ backend báo lỗi.
- Có hàng đợi check-in offline, tự đồng bộ qua `POST /checkin/sync` khi mạng
  trở lại và có nút đồng bộ thủ công.
- Bản ghi offline bị `rejected`/`conflict` không bị xóa âm thầm; App hiển thị
  lý do và cho người dùng tự xóa sau khi đã kiểm tra.

Các màn cấu hình policy cho site/shift thuộc HR/Admin Web, không dựng trên App
nhân viên.

## 2. Luồng nghiệp vụ trên App

### 2.1 Check-in

1. App tải site được phân công hôm nay.
2. Backend trả cửa sổ giờ, thời gian server và `effectiveCheckinPolicy`.
3. App chặn thao tác sớm/muộn theo hint để UX rõ ràng; backend vẫn là nguồn
   quyết định cuối cùng.
4. Tùy policy:
   - GPS: lấy vị trí rồi submit;
   - Face: bắt buộc chụp trực tiếp, không cho chọn từ thư viện;
   - Liveness: tạo challenge đúng `purpose=checkin`, đúng `siteId`, thực hiện
     ba hành động ngẫu nhiên rồi submit challenge ID.
5. Thành công lưu context ca đang mở để sau khi kill/restart App vẫn checkout
   đúng site và đúng policy.

### 2.2 Check-out

- Nếu GPS-only: xác nhận, lấy GPS và gọi checkout.
- Nếu Face: mở camera trước, chụp ảnh rồi gửi
  `employeePhotoBase64`.
- Nếu liveness: challenge dùng chính xác `purpose=checkout` và `siteId`.
- Sau thành công App xóa ca đang mở cục bộ, hiển thị `workMinutes` do backend
  tính và kết quả xác minh vào/ra ca.

### 2.3 Offline

- Chỉ check-in offline vì backend hiện chỉ có payload
  `OfflineCheckinRequest`, không có checkout offline.
- App dùng `clientNonce` UUID để idempotent.
- Ảnh bằng chứng chỉ lưu trong vùng document riêng của App, không vào gallery;
  xóa ngay khi backend trả `accepted`.
- `gps_face_liveness` khi offline chỉ có ảnh tĩnh nên App báo trước rằng kết
  quả sẽ `pending_review`, đúng contract backend.
- Một lượt pending offline chặn người dùng tạo thêm lượt check-in để tránh hai
  phiên mở.

## 3. Kết quả kiểm thử

| Kiểm tra | Kết quả |
|---|---|
| ESLint | PASS, 0 warning |
| TypeScript `tsc --noEmit` | PASS |
| Expo export Android | PASS, 1.564 modules |
| Expo export iOS | PASS, 1.568 modules |
| Backend containers | 5/5 healthy |
| Login seed employee | PASS |
| `GET available-sites` thật | PASS |
| Response có `serverNow`, cửa sổ giờ, trạng thái và policy | PASS |
| Giá trị sống `effectiveCheckinPolicy=gps_only` | PASS |
| `POST /checkin/sync` batch rỗng, không tạo dữ liệu | PASS, HTTP 200 |
| Validation sync payload sai | PASS, HTTP 400 |
| V78 history: `source`, tên nhân viên/site, GPS checkout | PASS |
| V78 detail: 6 field Face + policy/source | PASS |
| V78 available-sites policy occurrence | PASS |

Các luồng camera/GPS cần kiểm thử acceptance trên điện thoại thật vì CLI không
thể cấp camera, GPS hoặc mô phỏng khuôn mặt người dùng.

## 4. Checklist test thủ công Android/iOS

1. Đăng nhập bằng một nhân viên active, có assignment hôm nay.
2. Với ca `gps_only`, kiểm tra không mở camera và kết quả có GPS.
3. Với ca `gps_face`, kiểm tra chỉ mở camera trước, không có nút thư viện ảnh;
   chụp và hoàn tất cả check-in lẫn checkout.
4. Với ca `gps_face_liveness`, hoàn thành ba hành động; kiểm tra challenge
   check-in không dùng lại được cho checkout.
5. Kill App sau check-in, mở lại; App phải khôi phục trạng thái “Đang trong ca”
   và checkout được.
6. Tắt Wi-Fi và dữ liệu di động:
   - GPS-only phải hiện “đang chờ đồng bộ”;
   - policy Face phải lưu ảnh;
   - policy liveness phải cảnh báo “chờ HR duyệt”.
7. Bật mạng: kiểm tra tự đồng bộ, hoặc bấm “Đồng bộ ngay”; bản ghi accepted
   biến mất khỏi hàng đợi và chuyển sang ca đang mở.
8. Thay đổi assignment/site thành inactive trước khi sync: App phải giữ dòng
   rejected và hiển thị lý do.
9. Checkout, mở màn kết quả: kiểm tra giờ vào/ra, tổng phút làm, Face ID/liveness
   của cả hai đầu.

## 5. Đối chiếu phản hồi backend V78

### Đã sửa — ngày offline theo timezone site

Backend đã chuyển việc xác định `checkinDate` sang timezone IANA của site và
dùng chung zone cho ngày/thứ, assignment và cửa sổ ca. App không cần workaround.

### Đã sửa — snapshot policy trên CheckinRecord

Backend đã thêm `effective_checkin_policy`, set cho online/offline và checkout
dùng snapshot thay vì cấu hình live. App round 2 đã đổi thứ tự ưu tiên:

- snapshot từ bản ghi;
- fallback cache occurrence ở App;
- fallback policy hiện tại chỉ dành cho record cũ trước V78 có snapshot `null`.

Backend cũng đã trả `source`, tên nhân viên/site, GPS checkout và các field Face
đầy đủ. Smoke test trên dữ liệu seed xác nhận response thật có các field này.

### Còn cần quyết định sản phẩm — bảo mật và vòng đời dữ liệu offline

Đề nghị backend quy định:

- thời gian tối đa được phép sync muộn;
- sai lệch device timestamp tối đa;
- lưu audit `receivedAt`, device ID và client nonce;
- chính sách lưu/xóa ảnh bằng chứng;
- device attestation / mock-location signal cho ca rủi ro cao;
- thông báo/push khi job Face async chuyển bản ghi sang `pending_review`.

## 6. Tham khảo sản phẩm thực tế

- QuickBooks Workforce chỉ chia sẻ GPS trong thời gian nhân viên đang clocked
  in, dùng geofence và yêu cầu vị trí chính xác.
- Harvest cho phép ghi nhận offline, tự sync khi có mạng; các bản ghi chưa sync
  có badge, xem được lỗi từng dòng và có thao tác “Sync all/Try again”.

Thiết kế App lần này áp dụng cùng nguyên tắc: minh bạch thời điểm lấy GPS, hàng
đợi không bị ẩn, lỗi từng bản ghi và retry có chủ đích; đồng thời giữ backend
là nguồn quyết định công hợp lệ.
