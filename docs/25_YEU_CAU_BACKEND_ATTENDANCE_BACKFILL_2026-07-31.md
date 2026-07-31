# Nghiệm thu backend: backfill Attendance Summary sau migration V79

> Trạng thái: **ĐÃ KHẮC PHỤC VÀ NGHIỆM THU** ngày 31/07/2026. Không có dữ liệu backend nào bị App sửa trong quá trình kiểm tra.

## 0. Kết quả nghiệm thu sau bản vá backend lần 2

Backend đã bổ sung endpoint platform-admin dùng chung logic recompute chuẩn và đã chạy backfill dữ liệu lịch sử. Kiểm tra read-only lại trên database hiện tại xác nhận:

| Chỉ số | Kết quả sau bản vá |
|---|---:|
| Ngày employee+site hiện còn session `pending_review` | 143 |
| Summary tìm thấy tương ứng | 143 |
| Summary có `has_pending_review_session=true` đúng | 143/143 |
| Summary còn cờ `false` sai | 0 |

Số lượng hiện tại là 143 thay vì 146 tại thời điểm phát hiện ban đầu vì dữ liệu test đã thay đổi giữa hai lần đo; tỷ lệ đối soát trên trạng thái hiện tại là 100%.

API sống `/attendance/me/monthly?year=2026&month=7` của nhân viên seed thuộc hai tenant trả:

- Tenant thứ nhất: `totalWorkMinutes=9120`, `daysWithPendingReview=3`, đúng 3 daily summary có cờ pending.
- Tenant thứ hai: `totalWorkMinutes=10260`, `daysWithPendingReview=3`, đúng 3 daily summary có cờ pending.

App hiện hiển thị cảnh báo tổng quan và badge trên đúng các dòng này. Khi còn pending, tiêu đề tổng được đổi thành **Tổng quan tạm tính** và ghi rõ tổng giờ chưa gồm các phiên đang chờ HR duyệt.

Các phần dưới đây được giữ lại như lịch sử phát hiện và tiêu chí đã dùng để bàn giao backend.

## 1. Lịch sử phát hiện P0 trước khi sửa

Migration `V79__attendance_summary_status_filtering_and_adjustment_protection.sql` thêm:

- `has_pending_review_session` mặc định `false`;
- `has_rejected_session` mặc định `false`.

Nhưng migration không backfill/tính lại các summary lịch sử. Database hiện tại có:

| Chỉ số | Giá trị kiểm tra |
|---|---:|
| Check-in `pending_review` | 146 phiên |
| Ngày employee+site có pending | 146 ngày |
| Summary tương ứng vẫn có `has_pending_review_session=false` | 146/146 ngày |
| Summary có `total_work_minutes` khác tổng session `valid` | 146/146 ngày |
| Tổng số phút bị tính thừa trên dữ liệu hiện tại | 71.880 phút |

Ví dụ nhân viên seed `truong.van.dat@gmail.com`:

| Tenant | Pending | Tổng API/summary hiện tại | Tổng chỉ từ session valid |
|---|---:|---:|---:|
| `6ee08ec0-...` | 2 | 10.560 phút | 9.600 phút |
| `c184dc4a-...` | 3 | 11.880 phút | 10.260 phút |

App không thể tự phát hiện sai lệch này vì API đang trả cả tổng cũ và cờ `false`. Không được vá bằng cách để App tự cộng lại check-in history: backend phải là nguồn dữ liệu bảng công duy nhất.

## 2. Cách xử lý đề xuất

Sau khi deploy V79 và code recompute mới, chạy một job backfill có kiểm soát cho mọi summary chưa điều chỉnh tay:

1. Chọn các cặp `tenantId + employeeId + siteId + attendanceDate` có session tồn tại.
2. Gọi chung logic `AttendanceSummaryService.recompute()` mới, không viết lại một công thức SQL khác.
3. Bỏ qua summary có `adjustmentReason != null` theo cơ chế bảo vệ hiện tại; đưa các dòng này vào báo cáo để HR quyết định thủ công.
4. Chạy theo batch, idempotent, có log tổng số dòng thành công/thất bại/bị bỏ qua.
5. Sau backfill, đối soát:
   - `hasPendingReviewSession = EXISTS(status='pending_review')`;
   - `hasRejectedSession = EXISTS(status='rejected')`;
   - `totalWorkMinutes` chỉ lấy session `valid`;
   - tổng hợp tháng khớp tổng daily summary.

Không nên dùng một câu `UPDATE` chỉ sửa hai boolean vì các field `totalWorkMinutes`, `sessionCount`, late/early/OT/missingCheckout cũ cũng có thể đang tính cả session không hợp lệ.

## 3. Điều kiện nghiệm thu

- Không còn summary chưa điều chỉnh tay có cờ pending/rejected lệch với session nguồn.
- Không còn summary chưa điều chỉnh tay có tổng phút khác logic recompute mới.
- API `/attendance/me/monthly` của nhân viên seed nêu trên trả đúng 9.600 và 10.260 phút nếu trạng thái session nguồn không đổi.
- `daysWithPendingReview` trả lần lượt đúng số ngày pending theo tenant.
- Có test migration/backfill trên fixture chứa valid + pending + rejected trong cùng ngày.
- Backfill chạy lại lần hai không làm thay đổi kết quả.

## 4. Lưu ý triển khai

Thực hiện backup database trước khi chạy production. Chạy dry-run thống kê trước, sau đó mới cho phép ghi và lưu báo cáo đối soát. Đây là thao tác backend/database nên phía App không tự thực hiện.
