# Báo cáo App — Ca làm việc, phân công và site được phép check-in

Ngày rà soát ban đầu: 27/07/2026.  
Cập nhật theo contract backend mới: 28/07/2026.

Tài liệu nguồn:

- Backend `docs/api/shift-assignment-management-api.md`.
- Backend `docs/api/shift-assignment-ui-permissions-guide.md`.
- Code thật của `ShiftService`, `AssignmentService`, `CheckinService` và các repository liên quan.

## 1. Phân chia Web và App

Các thao tác quản trị ca/phân công là Web-only:

- Tạo, sửa, ngừng dùng, xóa ca.
- Cấu hình OT và giới hạn giờ.
- Tạo, xem danh sách, sửa, hủy phân công.

App chỉ sở hữu trải nghiệm của chính nhân viên:

- Gọi `GET /tenants/{tenantId}/checkin/available-sites`.
- Hiển thị site, ca, vai trò và trạng thái geofence của các phân công hợp lệ hôm nay.
- Chọn đúng assignment/site rồi check-in.
- Check-out ca đang mở và xem lịch sử của chính mình.

Không dùng API HR `GET .../sites/{siteId}/assignments` để dựng “Phân công của
tôi” cho nhân viên thường. API đó cần `assignments:list`, trả danh sách người
khác và thuộc màn điều phối trên Web.

## 2. Đối chiếu hệ thống thực tế

Thiết kế hiện tại phù hợp các mẫu sản phẩm phổ biến:

- Deputy cho phép một nhân viên có nhiều shift trong cùng ngày và dùng cảnh báo
  overlap thay vì cấm cứng nhiều địa điểm trong một ngày:
  https://help.deputy.com/hc/en-au/articles/4688713423759-Schedule-overview
- Deputy xem overlap là một tiêu chí quan trọng khi đề xuất người cho shift:
  https://help.deputy.com/hc/en-au/articles/4688708241295-Using-preferred-team-members-when-scheduling
- Connecteam liên kết geofence với job/site và chỉ cho nhân viên clock-in đúng
  công việc/địa điểm được phép:
  https://help.connecteam.com/en/articles/3597710-how-to-create-a-geofence

Do đó các quyết định đúng cần giữ:

- Assignment là trục nối Employee + Site + Shift.
- Workspace/Department không thay thế Assignment.
- Cho phép Site A buổi sáng và Site B buổi tối.
- Chặn hai ca thật sự chồng giờ.
- App có thể hiện rỗng, một hoặc nhiều site hợp lệ trong ngày.
- Assignment không có `shiftId` là dữ liệu hợp lệ, nghĩa là không gắn khung giờ
  ca cụ thể.

## 3. Thay đổi đã thực hiện trên App

- Chọn card theo `assignmentId`, không dùng `siteId` làm định danh UI.
- Hiển thị giờ `HH:mm`, không để chuỗi API `HH:mm:ss`.
- Hiển thị rõ ca qua đêm với nhãn “qua ngày hôm sau”.
- Hiển thị rõ assignment không gắn ca cụ thể.
- Hiển thị vai trò tại site (`worker`/`supervisor`).
- Hiển thị site không có geofence là “Không giới hạn vùng GPS”.
- Cho phép kéo xuống để tải lại assignment mới.
- Hiển thị `userMessage`/business error backend khi quá sớm, mất phân công,
  phiên hết hạn hoặc đang có ca mở; không thay bằng lỗi chung chung.
- Chặn rejected `mutateAsync` lọt ra press handler sau khi toast đã xử lý lỗi.
- Quick action và hồ sơ cá nhân không còn dẫn nhân viên sang màn danh sách
  assignment quản trị. Cả hai dẫn tới “Nơi làm hôm nay” trong màn check-in.
- Thông báo loại `assignment` cũng dẫn tới “Nơi làm hôm nay”, không mở màn HR
  dùng API `assignments:list` rồi gây 403 cho nhân viên thường.
- Tích hợp bốn field mới của `available-sites`: `serverNow`,
  `checkinAllowedFrom`, `checkinAllowedUntil`, `availabilityStatus`.
- Sắp xếp card ưu tiên nơi đang mở/không giới hạn, tiếp theo là ca sắp mở và
  cuối cùng là ca đã đóng.
- Hiển thị badge `Có thể chấm công`, `Sắp đến giờ`, `Đã hết giờ` hoặc
  `Không giới hạn giờ` trên từng card.
- Nút check-in chỉ bật cho trạng thái `open` và `unrestricted`; `upcoming` và
  `closed` có thông báo cụ thể thay vì để người dùng gửi request chắc chắn lỗi.
- Countdown của ca sắp mở được tính từ `serverNow` và thời gian đã trôi qua kể
  từ lúc nhận response. App không phụ thuộc đồng hồ thiết bị phải đúng và không
  tự sao chép logic timezone/ca qua đêm của backend.
- Ánh xạ lỗi nghiệp vụ `EMPLOYEE_NOT_ACTIVE`, `SITE_INACTIVE`,
  `CHECKIN_TOO_EARLY`, `CHECKIN_TOO_LATE` và `DUPLICATE_RESOURCE` sang thông
  báo hành động được trên giao diện.

## 4. Kết quả đối chiếu backend sau cập nhật

Không sửa backend trong đợt App này. Đối chiếu tài liệu cập nhật và code hiện
tại cho thấy các mục được nêu trong báo cáo trước đã được xử lý:

| Mục | Trạng thái sau cập nhật |
|---|---|
| P0-1 — Employee inactive/terminated | `available-sites` trả rỗng; POST check-in trả `403 EMPLOYEE_NOT_ACTIVE`; vẫn cho checkout phiên đã mở và xem lịch sử |
| P0-2 — Site inactive | Chặn assignment mới, loại khỏi nơi làm hôm nay và POST check-in trả `422 SITE_INACTIVE` |
| P0-3 — Nhiều phiên mở | Kiểm tra theo employee thay vì assignment; migration V73 thêm unique index chống race condition |
| P0-4 — Timezone/ca qua đêm | `available-sites` và submit dùng chung bộ giải quyết occurrence theo timezone của từng site |
| P1-1 — Validation giờ ca | Create/update đã kiểm tra `startTime`, `endTime` và `allowOvernight` |
| P1-2 — Check-in sau khi ca kết thúc | Trả `422 CHECKIN_TOO_LATE` |
| P1-3 — Timezone không hợp lệ | Validate IANA zone ngay khi tạo/sửa site |
| UX §5 | Response đã có đủ bốn field thời gian/trạng thái mà App cần |

Backend vẫn là nguồn quyết định cuối cùng khi submit. Trạng thái trên card App
chỉ có nhiệm vụ hướng dẫn UX.

### Điểm cần thống nhất thêm, không chặn bản App này

Tài liệu định nghĩa `allowOvernight=true` là `endTime` thuộc ngày kế tiếp.
Validation backend hiện cho phép hai thời điểm khác nhau, kể cả `08:00–17:00`
với `allowOvernight=true`; trường hợp đó được hiểu là ca 33 giờ. Nếu sản phẩm
không có ca dài hơn 24 giờ, nên siết quy tắc overnight thành
`endTime < startTime`. Nếu ca dài hơn 24 giờ là chủ đích, cần ghi rõ giới hạn
thời lượng tối đa trong nghiệp vụ Web.

Lỗi `409 DUPLICATE_RESOURCE` hiện ghi site dưới dạng UUID trong technical
`message`, chưa có tên site hoặc dữ liệu có cấu trúc. App đã hiển thị được thời
gian phiên mở và hướng dẫn check-out. Để UX có thể nêu đúng site và điều hướng
thẳng tới phiên cần đóng, backend nên bổ sung `openCheckinId`, `openSiteId`,
`openSiteName`, `checkInAt` vào `data`/`details` thay vì yêu cầu client phân
tích chuỗi message.

## 5. Contract App đã tích hợp

```json
{
  "serverNow": "2026-07-27T08:10:00+07:00",
  "checkinAllowedFrom": "2026-07-27T07:45:00+07:00",
  "checkinAllowedUntil": "2026-07-27T17:00:00+07:00",
  "availabilityStatus": "open"
}
```

Giá trị `availabilityStatus`: `open | upcoming | closed | unrestricted`:

- `open`: trong cửa sổ check-in, nút được bật;
- `unrestricted`: assignment không gắn shift, nút được bật;
- `upcoming`: chưa tới `checkinAllowedFrom`, nút tắt và hiển thị countdown;
- `closed`: đã qua `checkinAllowedUntil`, nút tắt và báo ca đã kết thúc.

## 6. Checklist nghiệm thu live

1. Employee active + assignment hôm nay: thấy site và check-in được.
2. Employee inactive/terminated: không thấy site và POST check-in bị chặn.
3. Site inactive: không thấy site; client gọi trực tiếp cũng bị chặn.
4. Một session đang mở ở Site A: check-in Site B trả `409`.
5. Ca sáng Site A + ca tối Site B: cả hai card xuất hiện, không bị coi là overlap.
6. Hai ca chồng thật: backend không cho tạo/cập nhật assignment.
7. Ca qua đêm thứ Hai: 02:00 thứ Ba vẫn tìm đúng assignment thứ Hai.
8. Server UTC, site Asia/Ho_Chi_Minh: ngày/thứ lấy theo site.
9. Check-in trước early window và sau shift end: đều bị chặn với message đúng.
10. Assignment không gắn ca: card vẫn hiện và check-in không bị giới hạn giờ ca.
11. Có/không có geofence: kết quả valid/pending_review đúng contract.
12. Kéo refresh sau khi HR đổi assignment: card cũ biến mất/card mới xuất hiện.

## 7. Xác minh tự động phía App

- `npm run lint`: đạt.
- `npm run typecheck`: đạt.
- `git diff --check`: đạt, không có lỗi whitespace.
- `npx expo-doctor`: đạt 18/18 kiểm tra.
- Expo export Android: đạt.
- Expo export iOS: đạt.
- Sau khi đổi IP LAN, export lần đầu còn dùng Metro cache chứa IP cũ
  `192.168.1.15`. Đã export lại với `--clear` và kiểm tra trực tiếp bundle Android
  lẫn iOS đều chứa đúng `192.168.1.15:8080`.
- `GET /api/v1/auth/health` qua IP LAN hiện tại `192.168.1.15:8080`: HTTP
  200, backend đang hoạt động.
- Gọi route `available-sites` không có token: HTTP 401 đúng lớp bảo vệ; chưa thể
  kiểm chứng payload có dữ liệu nếu không dùng phiên đăng nhập nhân viên thật.

Các kiểm thử gọi API có xác thực và GPS thật vẫn cần tài khoản nhân viên, dữ
liệu assignment theo khung giờ phù hợp và thiết bị vật lý. Chưa được ghi là đạt
cho tới khi thực hiện checklist mục 6 trên môi trường tích hợp.
