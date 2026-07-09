/**
 * Nguồn sự thật cho domain Assignment là `site/types/Site.ts` — Assignment luôn
 * gắn với 1 site cụ thể ở backend (route nested `/sites/{siteId}/assignments`,
 * không có bảng/endpoint assignment độc lập). Re-export tại đây để feature
 * assignment có type module riêng theo guide, không định nghĩa lại field để
 * tránh 2 định nghĩa lệch nhau.
 *
 * "Cần xác nhận thêm": schema thiết kế DB (FAMS_Database_Design_GD1_Final_Project)
 * mô tả các field/enum sau, nhưng KHÔNG tồn tại trong backend hiện tại
 * (com.fams.modules.assignment) — đã không đưa vào type để tránh đoán:
 * - `tenant_user_id` → thực tế field là `employeeId`.
 * - `shift_template_id` → thực tế field là `shiftId` (trỏ tới `Shift`, không phải
 *   "shift_template" riêng).
 * - `role_at_site` với 7 giá trị (worker/lead/supervisor/safety_officer/engineer/
 *   security/manager) → thực tế `role` chỉ có 2 giá trị: 'worker' | 'supervisor'.
 * - `assignment_type` ('primary'/'temporary'/'support'/'replacement') → field này
 *   không tồn tại trong entity/DTO backend.
 * - `is_primary` (boolean) → không tồn tại trong entity/DTO backend.
 * - `assignment_status` với 4 giá trị (planned/active/completed/cancelled) →
 *   thực tế `status` chỉ có 2 giá trị: 'active' | 'cancelled'.
 * - Filter theo `site_id` (query param) → thực tế site được chọn qua path
 *   `/sites/{siteId}/assignments`, không phải query filter.
 * - Filter theo khoảng `start_date`/`end_date` → backend không có param này.
 */
export type {
  Assignment,
  AssignmentListParams,
  AssignmentListResponse,
  AssignmentRole,
  AssignmentStatus,
  EmployeeSummary,
  PageResponse,
  Shift,
  Site,
  SiteListParams,
  SiteListResponse,
} from '@/features/site/types/Site';
