# FAMS Mobile — Current Status & Chat Handoff

> Cập nhật lần cuối: **2026-07-23**  
> Mục đích: cung cấp đủ ngữ cảnh để một chat/agent mới có thể tiếp tục công việc mà không cần đọc lại toàn bộ lịch sử hội thoại.

## 1. Mục tiêu hiện tại

Dự án đang được hoàn thiện theo hai hướng:

1. Chuẩn hóa UI/UX để giao diện thực tế, responsive và nhất quán với hệ thống quản lý chấm công doanh nghiệp.
2. Tạo **Android EAS Development Build** để kiểm thử đầy đủ native feature: Firebase Phone Auth, Google Sign-In, camera/Face ID, GPS, SecureStore và image picker.

Mục tiêu gần nhất chưa hoàn tất là tạo APK development, cài lên điện thoại Android thật và chạy app qua Expo Dev Client.

## 2. Kết luận kỹ thuật quan trọng

- Dự án là Expo SDK 54 + React Native 0.81 + Expo Router 6.
- Không dùng Expo Go để test đầy đủ. Firebase Auth và Google Sign-In là native module, bắt buộc dùng development build/dev client.
- Android thật là nền tảng phù hợp nhất để test hiện tại.
- Backend Spring Boot và MinIO local đang hoạt động, truy cập được từ LAN.
- Web chỉ phù hợp test UI, API thông thường và responsive; không đại diện đúng camera, Face ID, GPS, Phone OTP, SecureStore hoặc Google Sign-In native.
- Không chạy `npm audit fix --force`: npm đề xuất nâng major Expo và có thể phá tương thích SDK 54.

## 3. Những việc đã hoàn thành

### 3.1 UI/UX remediation

- Bổ sung design token dùng chung: màu, spacing, radius, layout và shadow đa nền tảng.
- Bổ sung các component dùng chung: AppButton, AppHeader, ConfirmDialog, FeedbackState và ResponsiveContainer.
- Cải thiện responsive, loading/error/empty state, CTA và accessibility cho các màn hình chính.
- Cải thiện dashboard, check-in/check-out, lịch sử chấm công, notification, site, assignment, profile và auth.
- Chuẩn hóa shadow riêng cho Web/iOS/Android; không còn cảnh báo deprecated `shadow*` từ component.
- Loại bỏ/ẩn các entry point chưa có nghiệp vụ backend đầy đủ thay vì hiển thị chức năng giả.

Chi tiết UI nằm trong [UI_UX_GUIDE.md](UI_UX_GUIDE.md).

### 3.2 Cấu hình và chất lượng mã

- Expo đã đồng bộ từ `54.0.35` lên `~54.0.36`.
- `npm run quality` hiện chạy cả ESLint và TypeScript.
- Expo Doctor gần nhất đạt **18/18 checks** sau khi đồng bộ dependency.
- Export/bundle đã thành công cho Web, Android và iOS.
- Android bundle gần nhất: **1.551 modules**, hoàn tất không có lỗi build.
- `app.config.ts` chỉ nạp Firebase service file khi file local hoặc EAS file variable thực sự tồn tại.
- `eas.json` đã khai báo rõ environment `development`, `preview`, `production`.
- `.env` và Firebase file local không được commit; quyền file local đã được siết về mode `600`.

### 3.3 Backend local

Backend nằm tại:

```text
/home/duyanh/Projects/FAMS/fams-backend-project
```

Trạng thái đã xác minh:

- `GET http://127.0.0.1:8080/api/v1/auth/health`: hoạt động.
- `GET http://192.168.1.135:8080/api/v1/auth/health`: hoạt động qua LAN.
- MinIO tại cổng `9000`: healthy.
- Spring Boot không khai báo `server.address`, vì vậy mặc định đã lắng nghe trên các interface; không cần sửa thành `0.0.0.0`.
- CORS local đã hỗ trợ `localhost`, `127.0.0.1`, `192.168.*.*` và `10.*.*.*`.
- Endpoint upload avatar thật:

```text
POST /api/v1/auth/profile/avatar
Content-Type: multipart/form-data
Field: file
```

App local đã được cấu hình:

```env
EXPO_PUBLIC_AVATAR_UPLOAD_URL=/auth/profile/avatar
```

Không tự động sửa backend trong giai đoạn EAS vì backend worktree cũng đang có nhiều thay đổi chưa commit.

## 4. Cấu hình local hiện tại

Không ghi giá trị credential đầy đủ vào tài liệu này. Trạng thái cần biết:

| Cấu hình | Trạng thái |
|---|---|
| `EXPO_PUBLIC_API_URL` | Đã cấu hình tới `http://192.168.1.135:8080/api/v1` |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Đã cấu hình |
| `EXPO_PUBLIC_AVATAR_UPLOAD_URL` | `/auth/profile/avatar` |
| `google-services.json` | Có local, package `com.fams.mobile`, đang gitignore |
| `GoogleService-Info.plist` | Chưa có; iOS Firebase chưa sẵn sàng |
| Android SDK / `adb` / emulator | Chưa cài trên máy |
| EAS CLI global | Chưa cài; đang dùng `npx eas-cli@latest` |

`google-services.json` hiện đúng Android package và có API key, nhưng chưa chứa OAuth Android client. Google Sign-In vẫn cần cấu hình Android OAuth client bằng SHA-1 của development credential.

## 5. Blocker hiện tại: quyền EAS project

EAS CLI đang đăng nhập tài khoản:

```text
zuyanhit
```

Source đang liên kết với EAS project ID:

```text
e0abbdee-9b61-422d-b997-416a40e921cd
```

Tài khoản hiện tại không có quyền đọc project này:

```text
Entity not authorized: AppEntity[e0abbdee-9b61-422d-b997-416a40e921cd]
```

Vì vậy các bước sau **chưa được thực hiện**:

- Chưa tạo EAS Environment Variables.
- Chưa upload `google-services.json` dưới dạng EAS file variable.
- Chưa đọc/tạo Android development credentials.
- Chưa lấy SHA-1/SHA-256 từ EAS.
- Chưa chạy EAS development build.
- Chưa có APK/QR cài đặt.

## 6. Quyết định cần người dùng thực hiện

Chọn một trong hai phương án.

### Phương án A — Giữ EAS project hiện tại

Đăng nhập tài khoản Expo đang sở hữu project hoặc nhờ owner cấp quyền project cho `zuyanhit`.

Không gửi mật khẩu vào chat. Chạy trong terminal cá nhân:

```bash
cd /home/duyanh/Projects/FAMS/fams-front-app-project
npx eas-cli@latest logout
npx eas-cli@latest login
npx eas-cli@latest whoami
```

Sau đó báo cho chat mới username đã đăng nhập. Đây là phương án ưu tiên nếu project cũ có credentials/build history cần giữ.

### Phương án B — Tạo EAS project mới

Người dùng phải xác nhận rõ:

```text
Cho phép tạo EAS project mới dưới tài khoản zuyanhit
```

Chỉ sau xác nhận này mới được relink source, vì thao tác sẽ tạo project ID, credentials và build history mới.

## 7. Trình tự tiếp tục sau khi giải quyết quyền EAS

Chat mới nên thực hiện đúng thứ tự:

1. Chạy `npx eas-cli@latest whoami` và `npx eas-cli@latest env:list development` để xác nhận quyền.
2. Tạo EAS development environment variables:
   - `EXPO_PUBLIC_API_URL`
   - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
   - `EXPO_PUBLIC_AVATAR_UPLOAD_URL`
3. Upload `google-services.json` dưới dạng EAS file variable tên `EXPO_ANDROID_GOOGLE_SERVICES_FILE`.
4. Chạy Android credentials và lấy SHA-1/SHA-256.
5. Hướng dẫn người dùng tạo/cập nhật Android OAuth client trong Google Cloud/Firebase:
   - Package: `com.fams.mobile`
   - SHA-1/SHA-256: từ EAS development credential.
6. Firebase Console: bật Phone Authentication và nên tạo test phone number + OTP cố định.
7. Sau khi Google/Firebase cập nhật, chạy:

```bash
npx eas-cli@latest build --platform android --profile development
```

8. Gửi người dùng URL/QR build, hướng dẫn tải và cài APK.
9. Chạy Metro:

```bash
npm run start:dev-client -- --lan --clear --port 8090
```

10. Điện thoại và máy tính cùng Wi-Fi; mở app **FAMS Development**, không mở Expo Go.

## 8. Checklist test trên Android thật

1. Email login: đúng/sai mật khẩu, khóa tài khoản.
2. Google Sign-In.
3. Firebase Phone OTP và số điện thoại test.
4. 2FA, chọn tenant và chuyển tenant.
5. Phân quyền Employee/Manager/HR/Admin.
6. Cấp/từ chối camera; consent và Face ID enrollment.
7. Cấp/từ chối location; bật/tắt GPS.
8. Check-in trong/ngoài bán kính, checkout và lịch sử.
9. Random check.
10. Site/map, assignment và attendance.
11. Notification đã đọc/chưa đọc.
12. Profile, avatar, đổi mật khẩu, 2FA và logout all.
13. Backend mất kết nối, token hết hạn, refresh token và trạng thái offline.

Lưu ý: Face ID cần AI service/backend face endpoint hoạt động; Phone OTP backend cần Firebase Admin (`FCM_PROJECT_ID`, `FCM_SERVICE_ACCOUNT_JSON`) được cấu hình. Backend health thành công không tự động chứng minh hai integration này đã có credential đầy đủ.

## 9. Lệnh kiểm tra an toàn

```bash
npm run quality
npx expo export --platform android --output-dir /tmp/fams-android-export --clear
curl http://192.168.1.135:8080/api/v1/auth/health
```

Không ghi build artifact vào repository. Dùng `/tmp` cho export kiểm tra.

## 10. Lưu ý về Git/worktree

Worktree frontend đang có rất nhiều file sửa/xóa/thêm từ đợt remediation kiến trúc, tính năng và UI/UX. Các thay đổi này là công việc hiện hữu của người dùng/agent trước đó.

Chat mới phải:

- Không chạy `git reset --hard`.
- Không dùng `git checkout -- .`.
- Không xóa/revert thay đổi ngoài phạm vi nhiệm vụ.
- Kiểm tra `git status --short` trước khi chỉnh sửa.
- Dùng `apply_patch` cho thay đổi thủ công.

Backend worktree cũng đang dirty; không sửa backend nếu người dùng chưa yêu cầu rõ.

## 11. Tài liệu liên quan

- [README chính](../README.md)
- [Kiến trúc và luồng kỹ thuật](PROJECT_TECHNICAL_GUIDE.md)
- [Đánh giá kiến trúc baseline](ARCHITECTURE.md)
- [Quy chuẩn UI/UX](UI_UX_GUIDE.md)
- [Auth feature README](../src/features/auth/README.md)

## 12. Prompt ngắn để tiếp tục ở chat mới

Có thể dán nguyên văn:

```text
Hãy đọc docs/PROJECT_HANDOFF.md trước. Tiếp tục mục tiêu tạo Android EAS Development Build cho FAMS. Giữ nguyên toàn bộ worktree hiện có, kiểm tra trạng thái EAS account/project trước, rồi tiếp tục từ blocker được ghi trong tài liệu. Không dùng Expo Go và không tự tạo EAS project mới nếu tôi chưa xác nhận.
```
