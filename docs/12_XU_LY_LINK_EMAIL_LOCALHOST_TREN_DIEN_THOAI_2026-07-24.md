# 12. Xử lý link email còn `localhost` trên điện thoại

> Tài liệu bàn giao cho người thao tác backend. Codex không sửa `.env`, source,
> build hoặc restart backend.

## 1. Kết luận kiểm tra ngày 24/07/2026

Ở lần kiểm tra đầu, backend chạy với:

```env
APP_BASE_URL=http://localhost:3000
APP_FRONTEND_URL=http://localhost:3000
```

Vì vậy link gửi qua email vẫn chứa `localhost`. Trên điện thoại, `localhost`
trỏ tới chính điện thoại chứ không phải máy tính đang chạy FAMS.

Ở lần kiểm tra lại lúc 14:23, link mới đã dùng đúng hai origin LAN:

```text
Frontend: http://192.168.1.155:3000
Backend:  http://192.168.1.155:8080
```

Hai link frontend vẫn lỗi `ERR_CONNECTION_REFUSED` vì khi đó không có tiến trình
nào lắng nghe cổng `3000`; backend `8080` và Metro native `8082` vẫn chạy.

Link trong ảnh:

```text
http://localhost:3000/api/v1/auth/profile/email/confirm-change?token=...
```

là link **xác nhận thêm/đổi email hồ sơ**. Link này được
`UserProfileService.requestEmailChange()` tạo từ `APP_BASE_URL`.

Hai luồng còn lại dùng `APP_FRONTEND_URL`:

- đăng ký email/gửi lại xác thực: `/verify-email?token=...`;
- quên mật khẩu: `/reset-password?token=...`.

Frontend đã có đủ hai route trên. Route `/verify-email` cũng đã hỗ trợ
`mode=email-change` và gọi đúng API xác nhận đổi email.

## 2. Cách test ngay trong mạng LAN, không cần App Links

Cách này mở màn hình xác thực/đặt lại mật khẩu bằng trình duyệt trên điện thoại.
Nó dùng được với Expo Go, Android và iPhone miễn là điện thoại cùng Wi-Fi với
máy tính.

### Backend `.env`

Với IP máy tính hiện tại là `192.168.1.155`:

```env
APP_BASE_URL=http://192.168.1.155:8080
APP_FRONTEND_URL=http://192.168.1.155:3000
CORS_ALLOWED_ORIGIN_PATTERNS=http://localhost:*,http://127.0.0.1:*,http://192.168.*.*:*,http://10.*.*.*:*
```

Ý nghĩa:

- `APP_BASE_URL` là origin thật của Spring Boot, nên phải dùng cổng `8080`;
- `APP_FRONTEND_URL` là nơi phục vụ giao diện web có hai route nhận token;
- không thêm `/api/v1` và không thêm dấu `/` ở cuối hai giá trị.

Sau khi tự cập nhật backend, cần restart container/process backend để biến môi
trường mới có hiệu lực.

### Chạy giao diện web nhận link

Trong frontend, chạy một Metro riêng cho web ở cổng `3000`:

```bash
npm run start:web:auth:lan
```

Không đóng Metro native đang chạy ở cổng `8082`. Trước khi yêu cầu email mới,
mở trên trình duyệt điện thoại:

```text
http://192.168.1.155:3000/reset-password?token=test
```

Đạt khi thấy màn hình FAMS báo token không hợp lệ, thay vì lỗi không kết nối.

### Kết quả sửa và kiểm tra ngày 24/07/2026

Frontend web đã được khởi động ở cổng `3000` và kiểm tra qua đúng IP LAN:

| Route | HTTP | Nội dung render |
|---|---:|---|
| `/reset-password?token=test` | 200 | `Đặt mật khẩu mới` |
| `/verify-email?token=test` | 200 | Giao diện kết quả xác thực email |

Không có lỗi build/runtime. Cần giữ terminal chạy
`npm run start:web:auth:lan`; đóng terminal này thì cổng `3000` lại ngừng và
link email LAN sẽ bị `ERR_CONNECTION_REFUSED`.

### Giới hạn của phương án LAN

- Chỉ hoạt động khi điện thoại và máy tính cùng mạng.
- IP máy tính thay đổi thì phải cập nhật lại hai biến.
- Link mở trình duyệt, chưa tự mở native app.
- Chỉ email tạo **sau khi restart backend** mới có URL mới; email cũ vẫn chứa
  `localhost` và không tự thay đổi.

## 3. Xử lý riêng link thêm/đổi email

### Phương án tối thiểu, không đổi source backend

Chỉ cần sửa `APP_BASE_URL` sang IP LAN/API HTTPS. Khi người dùng bấm link, trình
duyệt gọi thẳng API và nhận JSON thành công. Chức năng hoạt động nhưng UX chưa
thân thiện.

### Phương án khuyến nghị

Sửa `UserProfileService` để dùng `app.frontend-url` thay cho `app.base-url` khi
tạo link xác nhận đổi email. Cần đổi field/constructor:

```java
private final String frontendUrl;

public UserProfileService(
        UserRepository userRepository,
        AvatarStorageService avatarStorageService,
        EmailVerificationService emailVerificationService,
        EmailService emailService,
        PhoneOtpService phoneOtpService,
        @Value("${app.frontend-url}") String frontendUrl) {
    this.userRepository = userRepository;
    this.avatarStorageService = avatarStorageService;
    this.emailVerificationService = emailVerificationService;
    this.emailService = emailService;
    this.phoneOtpService = phoneOtpService;
    this.frontendUrl = frontendUrl;
}
```

Sau đó đổi đoạn tạo URL:

```java
String verificationUrl = UriComponentsBuilder.fromUriString(frontendUrl)
        .path("/verify-email")
        .queryParam("token", token)
        .queryParam("mode", "email-change")
        .build()
        .encode()
        .toUriString();
```

Kết quả:

```text
{APP_FRONTEND_URL}/verify-email?token=<token>&mode=email-change
```

Frontend đã triển khai sẵn contract này. Endpoint backend xử lý token vẫn giữ
nguyên:

```text
GET /api/v1/auth/profile/email/confirm-change?token=<token>
```

Nên dùng template email riêng cho “xác nhận đổi email”; ảnh kiểm tra hiện vẫn
dùng nội dung “Welcome to FAMS / If you did not register”, dễ khiến người dùng
hiểu nhầm đây là email đăng ký.

## 4. Cấu hình đúng cho staging/production

Giải pháp chính thức là hai domain HTTPS có thể truy cập từ Internet:

```env
APP_BASE_URL=https://api.<domain-that>
APP_FRONTEND_URL=https://app.<domain-that>
```

Frontend Development/Production Build:

```env
EXPO_PUBLIC_API_URL=https://api.<domain-that>/api/v1
EXPO_PUBLIC_APP_URL=https://app.<domain-that>
```

Domain `EXPO_PUBLIC_APP_URL` phải phục vụ:

- `/.well-known/assetlinks.json` cho Android;
- `/.well-known/apple-app-site-association` cho iOS.

Sau khi cấu hình association files và build lại app, hai link HTTPS
`/verify-email` và `/reset-password` sẽ mở app qua Android App Links/iOS
Universal Links; nếu app chưa được cài, chúng vẫn mở giao diện web.

Không dùng `localhost`, IP LAN hoặc URL `http://` cho staging/production.

## 5. Không dùng custom scheme với Expo Go

Custom scheme của app là:

```text
famsfrontappproject://
```

Scheme này chỉ thuộc Development Build/ứng dụng native đã build. Expo Go không
đăng ký scheme riêng của dự án, và một số ứng dụng email cũng hạn chế link
không phải HTTP/HTTPS. Vì vậy:

- test nhanh bằng Expo Go: dùng phương án web LAN ở mục 2;
- test mở thẳng native app: dùng Development Build và ưu tiên HTTPS App
  Links/Universal Links ở mục 4.

## 6. Checklist kiểm tra lại

1. Từ Chrome/Safari điện thoại mở
   `http://192.168.1.155:8080/api/v1/auth/health` và nhận HTTP 200.
2. Mở `http://192.168.1.155:3000/reset-password?token=test` và thấy UI FAMS.
3. Restart backend sau khi tự cập nhật biến môi trường.
4. Yêu cầu một email hoàn toàn mới; không dùng lại email đã gửi trước đó.
5. Đăng ký email: link là `/verify-email?token=...`, không có `/api/v1`.
6. Quên mật khẩu: link là `/reset-password?token=...`, không có `/api/v1`.
7. Đổi email:
   - nếu chưa sửa source: link API dùng host `192.168.1.155:8080`;
   - nếu đã áp dụng phương án khuyến nghị: link là
     `/verify-email?token=...&mode=email-change`.
8. Mở link, hoàn tất luồng, sau đó thử đăng nhập bằng email/mật khẩu mới.
9. Không chụp hoặc ghi token thật vào tài liệu kiểm thử vì token chỉ dùng một
   lần và có quyền thay đổi tài khoản/mật khẩu.
