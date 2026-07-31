# Báo cáo đối chiếu và hoàn thiện Attendance trên App

> Ngày kiểm tra: 31/07/2026  
> Phạm vi mã nguồn: `fams-front-app-project`  
> Tài liệu backend đối chiếu: `attendance-management-api.md`, `attendance-ui-permissions-guide.md`

## 1. Kết luận

Backend đã có đủ API/nghiệp vụ cho 11 yêu cầu. Trước đợt này App đã có màn kết quả và lịch sử check-in/out, nhưng màn **Bảng công của tôi** chưa tồn tại thật (route chỉ chuyển về Trang chủ). Đợt triển khai này đã hoàn thiện phần App còn thiếu:

- Bảng công cá nhân theo tháng, có chuyển tháng và kéo để làm mới.
- Thẻ tổng quan: ngày ghi nhận, tổng giờ, đi muộn, về sớm, OT và thiếu check-out.
- Danh sách ngày có giờ vào/ra, số phiên, site và chi tiết khi mở rộng.
- Cảnh báo tổng quan và badge riêng cho phiên `pending_review` và `rejected`.
- Badge `HR đã điều chỉnh`, kèm lý do trong phần chi tiết.
- Điều hướng **Bảng công** ở thanh tab và Trang chủ.
- Tự làm mới cache bảng công sau check-in/check-out.
- Không cộng OT hai lần: `totalWorkMinutes` là tổng cuối, `totalOtMinutes` chỉ được hiển thị là “trong đó OT”.

Các màn quản trị HR thuộc Web, không được đưa vào App nhân viên. Đây là phân tách đúng theo tài liệu quyền và cách các hệ thống chấm công thực tế tổ chức quy trình duyệt.

## 2. Đối chiếu 11 tính năng

| # | Tính năng | Nơi xử lý đúng | Kết quả kiểm tra |
|---|---|---|---|
| 1 | Hiển thị kết quả check-in/out | App + backend | **Đã có**. App đọc `status` và `message` từ backend, phân biệt `valid`, `pending_review`, `rejected`; không hardcode mọi trường hợp thành lỗi GPS. |
| 2 | Nhân viên xem lịch sử chấm công | App + backend | **Đã có**. Có phân trang, giờ vào/ra, site, trạng thái, Face vào/ra và mở chi tiết. |
| 3 | HR xem danh sách check-in | Web + backend | Backend đã có tìm kiếm/lọc/sort/phân trang. **Không dựng trên App** theo ma trận bàn giao. |
| 4 | HR xem chi tiết check-in | Web + backend | Backend đã trả bằng chứng GPS/Face ID. **Không dựng trên App**. |
| 5 | Tự động tạo attendance summary | Backend | Đã có job và recompute; chỉ session `valid` được tính. App chỉ đọc kết quả, không tự tính lại nghiệp vụ. |
| 6 | Tính đi muộn | Backend, App hiển thị | Backend tính theo snapshot ca lúc check-in. App hiển thị số ngày/phút tháng và số phút từng ngày. |
| 7 | Tính về sớm | Backend, App hiển thị | Backend tính; App hiển thị số ngày/phút tháng và chi tiết ngày. |
| 8 | Tính OT | Backend, App hiển thị | App hiển thị OT như phần nằm trong tổng giờ, không cộng thêm lần hai. |
| 9 | Phát hiện thiếu checkout | Backend, App hiển thị | App có số ngày thiếu checkout và badge đỏ ở ngày liên quan. |
| 10 | Nhân viên xem bảng công ngày/tháng | App + backend | **Đã hoàn thiện trong đợt này** bằng `/attendance/me/monthly`. |
| 11 | HR xem bảng công tổng hợp | Web + backend | Backend đã gộp theo employee+site và phân trang tại DB. **Không dựng trên App**. Web vẫn phải hoàn thiện rào chắn chốt lương như mục 6. |

## 3. Luồng dữ liệu và các quyết định nghiệp vụ

### 3.1 Không tự tính bảng công trên thiết bị

App lấy kết quả đã chốt theo rule từ backend. Các phép tính phụ thuộc site timezone, ca qua đêm, snapshot shift, trạng thái Face/liveness và quyết định HR; tự tính lại ở App sẽ dễ lệch dữ liệu chính thức.

### 3.2 Ba trạng thái không được nhập làm một

- `valid`: được tính vào công.
- `pending_review`: chưa được tính; số liệu ngày/tháng có thể thấp hơn thực tế và chưa chốt.
- `rejected`: đã bị loại khỏi công sau quyết định HR.

Ngày có nhiều session có thể vừa có session hợp lệ vừa có session chờ duyệt/từ chối. Vì vậy App đọc `hasPendingReviewSession` và `hasRejectedSession`, không suy luận chỉ từ `AttendanceSummary.status` (`present`/`incomplete`).

### 3.3 Bản ghi HR điều chỉnh

Khi `adjustmentReason != null`, App thông báo rõ “HR đã điều chỉnh”. Lý do được hiển thị trong phần chi tiết để nhân viên có thể đối chiếu sai lệch. Nếu sau này lý do có thể chứa ghi chú nội bộ nhạy cảm, backend nên tách thành `employeeVisibleReason` và `internalAuditReason` thay vì để frontend tự đoán.

### 3.4 `presentDays` không đồng nghĩa chắc chắn đã được trả công

Backend đếm số dòng summary/ngày có ghi nhận, kể cả ngày chỉ có phiên pending/rejected và tổng bằng 0. Vì vậy App dùng nhãn **Ngày ghi nhận**, không dùng nhãn dễ gây hiểu nhầm “Ngày được tính lương”.

### 3.5 Quan hệ với các module trước

- Tenant: mọi query có `tenantId` đang active; đổi công ty tạo query key khác, không lộ bảng công chéo tenant.
- Employee: endpoint `/me` tự suy ra employee từ user trong tenant; App không gửi `employeeId` để dò dữ liệu người khác.
- Site/shift/assignment: summary giữ `siteId`, `shiftId`, `assignmentId`; App hiển thị site, backend chịu trách nhiệm snapshot và ca qua đêm.
- Check-in/Face ID/liveness: chỉ kết quả session đã qua policy và có trạng thái `valid` mới đi vào số liệu.
- Offline: khi đồng bộ tạo/thay đổi check-in, backend recompute; sau các thao tác check-in/check-out App làm mới cache attendance.

## 4. Đối chiếu với hệ thống thực tế

Thiết kế thẻ tổng quan + danh sách từng ngày, tách giờ thường/OT và trạng thái duyệt phù hợp với cách QuickBooks Time trình bày báo cáo giờ và quy trình approvals. QuickBooks chỉ đưa timesheet sang payroll sau bước duyệt và tách rõ approved/submitted/unapproved; đây là cơ sở để FAMS không coi `pending_review` là số liệu cuối cùng:

- [QuickBooks Time reports guide](https://quickbooks.intuit.com/learn-support/en-uk/help-article/list-reports/quickbooks-time-reports/L0WYtn0mw_GB_en_GB)
- [Approve, unapprove, and reject timesheets](https://quickbooks.intuit.com/learn-support/en-us/help-article/manage-timesheets/approve-unapprove-reject-timesheets-quickbooks/L3fq6c1oN_US_en_US)

Deputy cũng phân quyền sửa/duyệt timesheet ở Web cho Supervisor/Location Manager/System Administrator và đưa timesheet về Pending khi bỏ duyệt. Điều này ủng hộ quyết định để quy trình HR trên Web, còn App tập trung vào dữ liệu cá nhân:

- [Deputy — Unapprove time and/or pay in timesheets](https://help.deputy.com/hc/en-au/articles/4689565799439-Unapprove-time-and-or-pay-in-timesheets)

## 5. Kiểm thử đã thực hiện

### 5.1 Kiểm thử API sống, không tạo dữ liệu rác

Backend local trả health `UP`. Đã đăng nhập bằng nhân viên seed thuộc hai công ty và gọi API thật:

| Kịch bản | Kết quả |
|---|---|
| `/attendance/me/monthly?year=2026&month=7` tại công ty thứ nhất | HTTP 200, đúng tenant/employee, 22 daily summaries |
| Cùng API tại công ty thứ hai | HTTP 200, tách đúng tenant/employee, 22 daily summaries |
| Kiểm tra field mới tháng | Có `daysWithPendingReview`, `daysWithRejectedSession` |
| Kiểm tra field mới ngày | Có `hasPendingReviewSession`, `hasRejectedSession`, `adjustmentReason` |
| Không gửi access token | HTTP 401 |
| `month=13` | HTTP 400 |

Phiên test đã được logout. Không tạo/sửa/xóa tenant, employee, check-in hay attendance.

### 5.2 Kiểm tra frontend

- `npm run lint`: đạt.
- `npm run typecheck`: đạt.
- `npx expo export --platform android`: đạt (1.568 modules).
- `npx expo export --platform ios`: đạt (1.572 modules).
- API types khớp DTO Java thật của `AttendanceMonthlyResponse` và `AttendanceSummaryResponse`.
- Đã kiểm tra query key chứa `tenantId + year + month`; không tái sử dụng dữ liệu tháng/công ty cũ.

### 5.3 Phạm vi chưa thể khẳng định chỉ bằng test tự động hiện tại

- Backend ghi nhận bộ script attendance hiện tại đạt 7/9 file (54/54 assertion ở các file chạy được); hai script late/OT còn lỗi fixture giờ ca, không phải lỗi API đã xác minh. Cần sửa fixture để có regression trọn bộ.
- Nhánh `missing_checkout=true` chưa có test E2E với phiên mở ở ngày quá khứ.
- Trạng thái UI pending/rejected/adjusted đã được kiểm tra bằng type/logic; dữ liệu seed tháng 7 hiện có giá trị 0 cho hai cờ cảnh báo, nên vẫn cần một lượt UAT bằng bản ghi thật có các trạng thái này để xác nhận màu sắc/nội dung trên thiết bị.

## 6. Việc cần làm ở Web và backend

### P0 — Backfill dữ liệu sau migration V79 — ĐÃ KHẮC PHỤC

Backend đã bổ sung endpoint backfill platform-admin, chạy lại logic recompute chuẩn và xử lý dữ liệu lịch sử. Kiểm tra read-only sau bản vá cho thấy 143/143 ngày hiện có session pending đã mang cờ đúng, không còn summary cờ `false` sai. API nhân viên thật trả đúng `daysWithPendingReview=3` và đúng 3 daily summary pending trên mỗi tenant đã kiểm tra. Chi tiết nghiệm thu nằm tại `docs/25_YEU_CAU_BACKEND_ATTENDANCE_BACKFILL_2026-07-31.md`.

Các thay đổi export Excel, permission `attendance:export`, guard `409 ATTENDANCE_NOT_READY` và `unlock-and-recompute` thuộc Company Portal dành cho HR, không được đưa vào App nhân viên theo ma trận quyền mới.

### P0 — Web phải bảo vệ bước chốt lương

Web cần hiển thị `daysWithPendingReview`/`daysWithRejectedSession` và không được âm thầm xuất/chốt khi còn pending. Cảnh báo chỉ ở UI chưa đủ an toàn nếu backend chưa có khái niệm kỳ công đã khóa. Khuyến nghị backend bổ sung lifecycle kỳ công:

`OPEN → REVIEWING → LOCKED/EXPORTED`

API chuyển sang `LOCKED` phải tự kiểm tra toàn bộ dữ liệu tháng ở server và từ chối khi còn pending, trừ khi người có quyền override kèm lý do audit. Sau khi khóa, mọi dữ liệu offline đến muộn phải tạo exception/reopen workflow, không sửa bảng lương âm thầm.

### P1 — Làm rõ split shift

Hiện một employee có hai ca khác nhau trong cùng ngày sẽ dùng snapshot ca của session đầu để tính late/early cho cả ngày. Cần chốt một trong hai:

1. Không hỗ trợ split shift: backend chặn assignment/check-in tạo hai ca khác nhau cùng ngày; hoặc
2. Có hỗ trợ: tính late/early/OT theo từng session/shift rồi mới aggregate ngày.

Không nên để trạng thái hiện tại như một hành vi ngầm.

### P1 — Phát hiện dữ liệu đến muộn sau điều chỉnh tay

Summary có `adjustmentReason` bị khóa khỏi recompute, nhưng hiện chưa có cờ báo rằng check-in offline mới đã đến sau lần điều chỉnh. Nên bổ sung `hasNewSourceDataAfterAdjustment` hoặc lưu `sourceDataUpdatedAt`/`adjustedAt` để Web yêu cầu HR xem lại.

### P1 — Hoàn thiện regression backend

- Sửa fixture của `test_late_detection.sh` và `test_ot_minutes.sh`.
- Thêm test E2E `missing_checkout=true` cho ngày quá khứ.
- Thêm test split shift theo quyết định sản phẩm ở trên.

## 7. File App đã thay đổi

- `app/(tabs)/attendance.tsx`
- `app/(tabs)/_layout.tsx`
- `app/(tabs)/home.tsx`
- `src/features/attendance/components/MyAttendanceScreen.tsx`
- `src/features/attendance/hooks/use-my-monthly-attendance.ts`
- `src/features/attendance/services/attendance.service.ts`
- `src/features/attendance/types/attendance.type.ts`
- `src/features/checkin/hooks/use-checkin-submit.ts`
- `src/features/checkin/hooks/use-checkout-submit.ts`
