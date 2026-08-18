# 11. Sửa lỗi Metro và kết nối API — 24/07/2026

## Nguyên nhân

1. `.env` từng chứa khoảng trắng trong URL:

   ```text
   http:// 192.168.1.145:8080/api/v1
   ```

   URL này không hợp lệ và làm Axios báo mất kết nối.

2. Cổng Metro mặc định `8081` đang được Windows `svchost` sử dụng. Chạy thêm
   Expo process trong khi Metro cũ còn hoạt động gây thông báo xung đột cổng.

3. Lỗi `ERR_SOCKET_BAD_PORT ... 65536` quan sát trong terminal Codex phát sinh
   do sandbox không được phép bind cổng. Ngoài sandbox, Expo xác định đúng cổng
   `8081` bận và Metro chạy bình thường ở `8082`.

## Thay đổi frontend

- URL hiện tại đã đúng:

  ```env
  EXPO_PUBLIC_API_URL=http://192.168.1.145:8080/api/v1
  ```

- `src/config/env.ts` trim, kiểm tra protocol, khoảng trắng và bỏ dấu `/` cuối.
  Cấu hình sai từ nay trả thông báo rõ thay vì lỗi network chung chung.
- Thêm script Expo Go LAN cố định cổng `8082`:

  ```bash
  npm run start:go:lan
  ```

- Script Development Build LAN cũng dùng `8082` và clear cache:

  ```bash
  npm run start:dev-client:lan
  ```

- Các link email LAN dùng hai route web ở cổng `3000`, vì vậy khi test xác thực
  email hoặc đặt lại mật khẩu phải chạy thêm terminal:

  ```bash
  npm run start:web:auth:lan
  ```

## Bằng chứng

| Kiểm tra | Kết quả |
|---|---|
| Docker `fams-api` | Healthy |
| Health qua localhost | HTTP 200 |
| Health qua `192.168.1.145` | HTTP 200 |
| Metro `8082/status` | `packager-status:running` |
| GET health chạy trực tiếp từ runtime iPhone | HTTP 200 — `FAMS Auth Module is running` |
| ESLint | PASS |
| TypeScript | PASS |
| `git diff --check` | PASS |

Runtime iPhone đang là Expo Go (`host.exp.Exponent`). API thường hoạt động,
nhưng Firebase Phone Auth và native Google Sign-In vẫn cần Development Build.

## Lệnh sử dụng

Chỉ chạy một Metro process:

```bash
npm run start:go:lan
```

Hoặc khi đã cài FAMS Development Build:

```bash
npm run start:dev-client:lan
```

Khi test link email trên trình duyệt điện thoại, giữ Metro native ở `8082` và
chạy thêm web auth gateway ở một terminal khác:

```bash
npm run start:web:auth:lan
```
