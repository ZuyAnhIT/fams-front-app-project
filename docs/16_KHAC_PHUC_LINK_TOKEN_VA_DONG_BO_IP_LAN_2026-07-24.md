# Báo cáo khắc phục link token và đồng bộ IP LAN — 2026-07-24

## 1. Phạm vi

Đợt sửa này xử lý ba luồng người dùng mở từ email:

1. xác thực email sau đăng ký;
2. đặt lại mật khẩu khi quên mật khẩu hoặc khi tài khoản bị khóa;
3. xác nhận email mới sau khi đổi thông tin cá nhân.

Ngoài ra đã bổ sung một lệnh duy nhất để đồng bộ IP LAN giữa Expo app, Next.js
web, Spring backend và URL ảnh MinIO khi máy phát triển đổi mạng Wi-Fi.

## 2. Nguyên nhân đã xác định

- Trình duyệt điện thoại không thể dùng `localhost` của máy tính.
- Next.js development chặn asset/HMR từ hostname LAN nếu hostname chưa nằm trong
  `allowedDevOrigins`; HTML ban đầu xuất hiện nhưng React không hydrate nên trang
  trông như tải vô hạn.
- Email đổi địa chỉ cũ trỏ thẳng tới REST API nên trình duyệt hiển thị JSON/script
  thô thay vì giao diện.
- React development mode có thể chạy effect hai lần; token xác thực là token dùng
  một lần nên request thứ hai có thể báo token không hợp lệ.
- Khi backend/web chưa chạy lại sau lúc sửa `.env`, email mới vẫn mang origin cũ.

## 3. Thay đổi đã thực hiện

### Expo app

- Route `/(auth)/verify-email`:
  - chống gửi request xác thực hai lần;
  - chỉ thử endpoint đổi email dự phòng khi endpoint đăng ký thực sự trả HTTP 400,
    không gửi thêm request khi mất mạng/server lỗi;
  - có trạng thái thành công, lỗi, nút **Thử lại** và nút trở về app/hồ sơ/đăng nhập;
  - request API có timeout chung 15 giây nên không còn quay vô hạn.
- Route `/(auth)/reset-password` có form nhập/xác nhận mật khẩu, báo lỗi token,
  thông báo thành công và đường quay lại.

### Web Next.js

- `/verify-email` có UI riêng cho đăng ký và đổi email.
- Request xác thực được dùng chung trong React Strict Mode để không tiêu thụ token
  hai lần; timeout 20 giây; lỗi mạng chuyển sang màn hình lỗi có **Thử lại**.
- `/reset-password` hiển thị form hoàn chỉnh và thông báo API thân thiện.
- Các màn hình kết quả có:
  - **Mở ứng dụng FAMS** bằng custom scheme của development build;
  - phương án tiếp tục trên web;
  - **Quay lại trang trước**.
- Proxy giữ tương thích với các link web cũ:
  - `/api/v1/auth/verify-email`;
  - `/api/v1/auth/reset-password`;
  - `/api/v1/auth/profile/email/confirm-change`.

### Backend Spring

- Email đăng ký, reset mật khẩu và xác nhận đổi email mới đều dùng
  `APP_FRONTEND_URL`.
- Hai API GET xác thực email phát hiện request trình duyệt (`Accept: text/html`) và
  trả redirect `302` tới UI `/verify-email`; token chưa bị tiêu thụ tại bước
  redirect.
- BFF/app yêu cầu `application/json` vẫn giữ hợp đồng API cũ và xử lý token bình
  thường.
- Link đổi email mới có `mode=email-change`, vì vậy UI gọi đúng endpoint.
- Reset mật khẩu thành công đồng thời xóa số lần đăng nhập sai và trạng thái khóa.

## 4. Đồng bộ IP LAN

Chạy tại `fams-front-app-project`:

```bash
npm run sync:lan
```

Script tự chọn IPv4 LAN và chỉ cập nhật các khóa sau, không in secret:

| Dự án | File | Khóa |
|---|---|---|
| Expo app | `.env` | `EXPO_PUBLIC_API_URL` |
| Next web | `.env.local` | `FAMS_DEV_ORIGINS` |
| Backend | `.env` | `APP_BASE_URL`, `APP_FRONTEND_URL`, `S3_PUBLIC_URL` |

Nếu máy có nhiều card mạng và tự chọn sai:

```bash
npm run sync:lan -- --ip 192.168.1.20
```

Nếu cần đồng bộ API URL vào môi trường EAS Development cho lần build tiếp theo:

```bash
npm run sync:lan:eas
```

Không cần chạy biến thể EAS mỗi lần mở Metro; bản development build đang cài sẽ
nhận JavaScript và biến public mới sau khi Metro được khởi động lại.

## 5. Khởi động lại bắt buộc sau khi đổi IP/source

Backend:

```bash
cd /home/duyanh/Projects/FAMS/fams-backend-project
make restart-api
```

Nếu stack chưa chạy:

```bash
make dev-d
```

Web:

```bash
cd /home/duyanh/Projects/FAMS/fams-front-web-project
npm run dev
```

App:

```bash
cd /home/duyanh/Projects/FAMS/fams-front-app-project
npm run start:dev-client:lan
```

Điện thoại và máy tính phải cùng Wi-Fi; firewall phải cho phép TCP 3000, 8080,
8082 và 9000. Với Google/Firebase Phone Auth phải dùng development build, không
dùng Expo Go.

## 6. Kết quả kiểm thử tự động

| Kiểm tra | Kết quả |
|---|---|
| App ESLint + TypeScript (`npm run quality`) | Đạt |
| Expo static export | Đạt, sinh đủ 51 route gồm `/verify-email` và `/reset-password` |
| Web ESLint | Đạt, 0 error; warning cũ ngoài phạm vi auth vẫn còn |
| Web TypeScript | Đạt |
| Playwright link token | Đạt 4/4 |
| Backend compile | Đạt với `maven.resources.skip=true` vì một số resource trong `target` đang do container sở hữu |
| Backend unit test redirect | Mã test đã thêm; WSL/JDK hiện tại chặn Mockito tự gắn Byte Buddy agent, không phải lỗi compile/logic |
| `npm run sync:lan` | Đạt, đã đồng bộ IP phát hiện `192.168.1.13` |

Playwright đã chứng minh:

1. link xác thực đăng ký chỉ gọi API một lần và hiện màn hình thành công;
2. link đổi email cũ được đưa về UI đúng `mode=email-change`;
3. form reset gửi đúng token và mật khẩu mới;
4. lỗi mạng thoát khỏi loading và hiện nút thử lại.

## 7. Kiểm thử thật cần thực hiện sau khi restart

Mỗi token chỉ dùng một lần. Không dùng lại email đã bấm trước đây.

1. Đăng ký một email mới, mở email mới nhất, xác nhận thấy màn hình
   **Xác thực thành công**, sau đó đăng nhập bằng email.
2. Chọn **Quên mật khẩu**, mở link mới nhất, đặt mật khẩu mới và đăng nhập lại.
3. Khóa tài khoản bằng số lần đăng nhập sai theo cấu hình, yêu cầu reset, đặt mật
   khẩu mới và kiểm tra đăng nhập được ngay.
4. Đổi email trong hồ sơ, mở link gửi tới email mới, kiểm tra màn hình xác nhận có
   nút mở app/web và hồ sơ hiển thị email mới.

Nếu email mới vẫn chứa IP cũ, backend chưa được restart sau `npm run sync:lan`.
Nếu `IP:3000` từ điện thoại báo từ chối kết nối, web chưa chạy hoặc firewall đang
chặn cổng 3000.

## 8. Giới hạn môi trường LAN

IP LAN + HTTP chỉ phù hợp phát triển. Giải pháp ổn định không phụ thuộc Wi-Fi cho
staging/production là dùng một domain HTTPS cố định (hoặc tunnel HTTPS cố định),
đặt `APP_FRONTEND_URL` và API URL theo domain đó, rồi cấu hình Android App Links /
iOS Universal Links. Khi đó email đã gửi không bị hỏng do máy đổi mạng.
