# Báo cáo hoàn thiện giao diện quản lý nhân viên và lời mời

Ngày thực hiện: 25/07/2026

Phạm vi:

- Front App: `/home/duyanh/Projects/FAMS/fams-front-app-project`
- Front Web: `/home/duyanh/Projects/FAMS/fams-front-web-project`
- Backend: sửa đúng 2 chỗ dựng URL email lời mời; không chạy thao tác ghi dữ liệu sống.

## 1. Kết luận nghiệp vụ

### Tạo hồ sơ và mời tài khoản là hai nghiệp vụ khác nhau

- **Tạo hồ sơ thủ công**: tạo `Employee` phục vụ HR, chưa tạo tài khoản, không cần mật khẩu, email/SĐT có thể để trống.
- **Mời tham gia**: gửi email để người nhận tạo hoặc nối tài khoản đăng nhập vào tenant.
- Nếu HR đã tạo hồ sơ có cùng email, backend nối tài khoản được chấp nhận vào hồ sơ cũ; workspace, assignment và dữ liệu HR không bị mất.
- Vì vậy không xóa tính năng tạo thủ công. Giao diện đã đổi nhãn thành “Thêm hồ sơ (chưa cần đăng nhập)” và giải thích rõ kết quả.

### Import và mời hàng loạt phải tách biệt

- Import `.xlsx` chỉ tạo nhiều hồ sơ HR, không tự gửi email.
- Mời hàng loạt là một hành động khác, phải có bước xem lại danh sách người nhận trước khi gửi.
- Backend hiện chưa có bulk-invite API nên frontend không giả lập bằng cách gọi tuần tự hàng trăm request.

Mô hình này phù hợp với cách các hệ thống workforce thực tế tách hồ sơ, lời mời và import:

- [Deputy — Adding team members](https://help.deputy.com/hc/en-au/articles/4657767244303-Adding-team-members): cho phép thêm người trước rồi gửi lời mời khi sẵn sàng.
- [Deputy — Invite team members](https://help.deputy.com/hc/en-au/articles/4657801078287-Invite-team-members-to-use-Deputy): lời mời là hành động có kiểm soát, hỗ trợ gửi lại/bulk.
- [Deputy — Bulk import/update](https://help.deputy.com/hc/en-au/articles/5898002694287-Bulk-import-or-bulk-update-team-member-data): import và cập nhật dữ liệu nhân sự bằng CSV/XLSX.
- [Connecteam — Add users](https://help.connecteam.com/en/articles/6529291-how-to-add-users-to-connecteam): tách thêm thủ công, import và invite link.

### Nhân sự nền tảng không phải Employee của tenant

- Người nhận lời mời nền tảng được gán role cấp platform.
- Không tạo `Employee`, workspace, assignment hoặc Face ID.
- Các API mời nền tảng và mời công ty được giữ riêng.

## 2. Phần Web đã hoàn thiện

### Company Portal

- Danh sách nhân viên: search, lọc trạng thái, lọc phòng ban, sort, phân trang.
- Export truyền đủ `search`, `status`, `department`.
- Tạo hồ sơ thủ công có mô tả rõ “không tạo tài khoản/không gửi email”.
- Mời nhân viên hỗ trợ email, SĐT, họ tên và role đúng phạm vi tenant.
- Lời mời người đã có tài khoản: chỉ cần chấp nhận.
- Lời mời người chưa có tài khoản: đặt mật khẩu.
- Nếu lời mời phát hiện tài khoản SĐT hiện có: có lựa chọn liên kết email vào tài khoản đó.
- Danh sách lời mời và hủy lời mời pending.
- Chuyển `active/inactive/terminated` có hộp xác nhận và mô tả tác động.
- Import chỉ nhận `.xlsx`; hiển thị tổng số dòng, số thành công, số lỗi và lỗi từng dòng.
- Chi tiết nhân viên có thông tin cá nhân, role, workspace, assignment và Face ID.
- Menu/route kiểm tra cả role và permission `employees:list`/`employees:read`.
- Có thông báo khi supervisor đang xem dữ liệu theo site scope.

### Platform Admin

- Màn “Nhân sự FAMS” có tab danh mục tài khoản và tab lời mời nền tảng.
- Gửi/hủy lời mời nền tảng.
- Chỉ cho chọn `PLATFORM_STAFF` hoặc custom platform role đang hoạt động; không đưa role tenant/`PLATFORM_ADMIN` vào luồng mời mặc định.
- Giao diện giải thích rõ platform staff không sinh hồ sơ Employee.

### Link công khai

- `/accept-invite?type=tenant&token=...`
- `/accept-invite?type=platform&token=...`
- Mỗi loại gọi đúng cặp validate/accept API.
- Có nút `famsfrontappproject://accept-invite?...` để chuyển từ browser vào bản App native.

### Lỗi tích hợp email đã sửa

Trước khi sửa, cả lời mời tenant và lời mời nền tảng đều dựng link email tới
`APP_BASE_URL/api/v1/.../accept`. Khi người dùng bấm link, trình duyệt gửi `GET`
vào endpoint chỉ hỗ trợ `POST`, vì vậy không thể mở form onboarding.

Đã sửa hai service backend dùng `app.frontend-url` và sinh link:

- `{frontend-url}/accept-invite?type=tenant&token=...`
- `{frontend-url}/accept-invite?type=platform&token=...`

Form Web/App validate token trước, rồi mới gọi API `POST` accept tương ứng.

## 3. Phần App đã hoàn thiện

- Thêm route công khai `/accept-invite`.
- Hỗ trợ cả tenant invitation và platform invitation.
- Validate token trước khi hiển thị.
- Người mới đặt và xác nhận mật khẩu.
- Người có tài khoản email chấp nhận trực tiếp.
- Có luồng nối email mời vào tài khoản số điện thoại hiện có.
- Sau khi chấp nhận: lưu token an toàn, gọi `/auth/me`, gọi `/roles/me`, xác định tenant và điều hướng theo cùng quy trình đăng nhập hiện tại.
- Thêm `/accept-invite` vào Android App Links và iOS Universal Links khi có `EXPO_PUBLIC_APP_URL`.
- Hồ sơ cá nhân lấy role thật từ `GET /roles/me`, hiển thị role/site scope.
- Thêm lối vào “Phân công của tôi”.
- Việc tự sửa hồ sơ vẫn dùng `PUT /auth/me`; App không gọi API HR `GET/PUT /employees/{id}`.

## 4. Kiểm thử

### Front App

- `npm run quality`: đạt (lint và TypeScript).
- `npx expo export --platform android --output-dir /tmp/fams-app-employee-export-codex --clear`: đạt; Metro bundle 1.540 module và tạo Android Hermes bundle.

### Front Web

- `npm run lint`: không có error; repository còn warning lint cũ.
- `npm run typecheck`: đạt.
- `npm run build -- --webpack`: đạt; route `/accept-invite`, `/admin/users`, `/customer/employees` và `/customer/employees/[id]` được build.
- E2E Chromium riêng nhóm nhân viên: **8/8 đạt** trong
  `employee.spec.ts` và `employee-management.spec.ts`.
- Nhóm nhân viên gồm các ca: phân biệt hồ sơ/invite/import/export, mời tenant,
  chi tiết workspace/assignment/role/Face ID, link accept tenant/platform, mời
  và hủy nhân sự nền tảng.
- Regression toàn Web ở lần chạy cuối: toàn bộ ca employee và các ca tenant/RBAC/token-link
  đã chạy đều đạt. Ca auth sống “đăng ký số điện thoại OTP” không thể chạy vì backend
  `localhost:8080` đang tắt (`ECONNREFUSED`); do file auth chạy serial, 6 ca auth sau
  đó được Playwright đánh dấu `did not run`. Không tính điều kiện môi trường này là pass.
- Ảnh bằng chứng:
  - `/home/duyanh/Projects/FAMS/fams-front-web-project/docs/test-evidence/employee-management`
  - `/home/duyanh/Projects/FAMS/fams-front-web-project/docs/test-evidence/employee`

### Backend

- `bash ./mvnw -q -DskipTests -Dproject.build.directory=/tmp/fams-api-build-codex compile`: đạt.
- Maven được chuyển output sang `/tmp` vì `api-server/target` hiện có một số file không cho user hiện tại ghi đè.
- Theo log/tài liệu backend người dùng cung cấp, 114 test employee/RBAC/tenant đã đạt trước đợt frontend này; đợt này không nhận là đã chạy lại 114 live test.

## 5. Điểm cần backend hỗ trợ tiếp

### Danh sách “nhân sự nền tảng hiện tại”

`GET /users?isPlatformAdmin=true` chỉ lọc cờ `User.isPlatformAdmin`. Người chỉ có role `PLATFORM_STAFF` được lưu ở `user_roles` có thể không xuất hiện trong bộ lọc này.

Frontend hiện:

- Gọi màn đầu là “Danh mục tài khoản”, không gọi sai là danh sách platform staff.
- Giải thích rõ bộ lọc Platform Admin.
- Dùng tab lời mời để quản lý invitation.

Đề xuất backend bổ sung một trong hai:

1. `GET /users?hasPlatformRole=true`, trả thêm `platformRoles`; hoặc
2. `GET /platform/staff`, join `user_roles` có `tenant_id IS NULL`.

### Mời hàng loạt sau import

Nếu cần, backend nên có endpoint bulk riêng nhận danh sách employee/email đã được HR duyệt, trả kết quả thành công/lỗi theo từng người. Không nên để frontend tự gọi N request không kiểm soát.

## 6. Điều kiện để link mở thẳng App thật

- Bản cài phải là development build/production build; Expo Go không đăng ký custom scheme và native App Link như ứng dụng độc lập.
- Đặt `EXPO_PUBLIC_APP_URL=https://<domain-thật>` trước khi build.
- Domain cần phục vụ:
  - Android: `/.well-known/assetlinks.json`
  - iOS: `/.well-known/apple-app-site-association`
- Backend `app.frontend-url` nên dùng cùng HTTPS domain. Nếu App Link chưa được cấu hình, link vẫn mở Web và người dùng bấm “Mở lời mời trong ứng dụng FAMS”.

## 7. Ca live cần người dùng thực hiện

Các test tự động dùng API mock theo đúng contract và không gửi email thật. Để chốt happy-path môi trường sống cần:

1. Một tài khoản Platform Admin.
2. Một tenant có HR/Admin.
3. Một email chưa có tài khoản.
4. Một email đã có tài khoản.
5. Nếu kiểm tra merge: một hồ sơ thủ công cùng email chưa có `userId`.
6. App development build đã cài trên Android/iPhone và backend/Web dùng URL HTTPS hoặc LAN mà điện thoại truy cập được.
