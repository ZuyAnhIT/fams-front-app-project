/**
 * Feature này không có Zustand store.
 *
 * Danh sách phân công là server state (TanStack Query, xem
 * `hooks/use-assignment.ts` — `assignmentKeys`). Các state khác (site đang
 * chọn, filter status/role/employeeId, search, page, sort) là local UI state
 * của màn hình, sống trong `useState` của component
 * (`components/assignment.component.tsx`) — cùng pattern với
 * `site/components/SiteList.tsx` (feature `site` cũng không có store).
 *
 * Không tạo store rỗng chỉ để "cho có" theo checklist mục 15/guide mục 5:
 * chỉ tạo khi có client/UI state thật cần chia sẻ giữa nhiều component
 * (hiện chưa phát sinh nhu cầu đó).
 */
export {};
