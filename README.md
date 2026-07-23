# FAMS Mobile - Field Attendance Management System 📱⚡

FAMS Mobile là ứng dụng di động nằm trong hệ sinh thái **Field Attendance Management System (FAMS)**, được xây dựng bằng **React Native** kết hợp nền tảng **Expo**. Ứng dụng hỗ trợ nhân viên thực hiện điểm danh, chụp ảnh khuôn mặt, ghi nhận vị trí GPS tại hiện trường và nhận các thông báo phân công công việc từ hệ thống quản trị.

> **Tiếp tục công việc ở chat mới:** đọc [Current Status & Chat Handoff](docs/PROJECT_HANDOFF.md) trước. Tài liệu này ghi trạng thái thật, blocker EAS và bước tiếp theo.
>
> Tài liệu chuyên sâu: [Kiến trúc, luồng tính năng, API và đánh giá kỹ thuật](docs/PROJECT_TECHNICAL_GUIDE.md) · [Quy chuẩn UI/UX](docs/UI_UX_GUIDE.md) · [Chi tiết feature auth](src/features/auth/README.md)

---

## 🛠 Công nghệ sử dụng

Dự án được xây dựng và tối ưu trên nền tảng **Expo SDK 54** cùng các thư viện công nghệ hiện đại:

- **Core Framework:** [React Native](https://reactnative.dev/) (v0.81.x) & [Expo](https://expo.dev/) (v54)
- **Routing & Navigation:** [Expo Router v6](https://docs.expo.dev/router/introduction/) (File-based Routing, tương tự Next.js)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) (Quản lý trạng thái toàn cục gọn nhẹ, hiệu năng cao)
- **Data Fetching & Caching:** [TanStack Query v5](https://tanstack.com/query/latest) (React Query)
- **API Client:** [Axios](https://axios-http.com/)
- **Form & Validation:** [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Hardware & Device APIs:**
  - `expo-camera`: Chụp ảnh và kiểm tra chất lượng khuôn mặt để đăng ký Face ID.
  - `expo-location`: Xác thực vị trí GPS hiện trường của thiết bị khi điểm danh.
  - `expo-notifications`: Dependency đã cài cho push notification; luồng đăng ký token/listener chưa được nối trong mã nguồn hiện tại.
  - `expo-secure-store`: Lưu trữ an toàn Token Authentication (`access_token`, `refresh_token`).
  - `@react-native-async-storage/async-storage`: Lưu trữ cấu hình cục bộ.

---

## 🚀 Hướng dẫn cài đặt & chạy dự án

Hãy làm theo các bước chi tiết sau để thiết lập môi trường phát triển cục bộ:

### Bước 1: Clone Repository

```bash
git clone <repository-url-cua-ban>
cd fams-front-app-project
```

### Bước 2: Cài đặt Dependencies

Khuyến nghị sử dụng `npm` theo cấu hình `package-lock.json` sẵn có trong dự án:

```bash
npm install
```

### Bước 3: Cấu hình biến môi trường (`.env`)

1. Copy file cấu hình mẫu `.env.example` thành `.env`:
   ```bash
   cp .env.example .env
   ```
2. Mở file `.env` vừa tạo và cấu hình các thông số:
   - `EXPO_PUBLIC_API_URL`: URL API trỏ tới backend Spring Boot của bạn.
   - `EXPO_PUBLIC_AVATAR_UPLOAD_URL`: Endpoint backend/object-storage gateway dùng để upload avatar; để trống sẽ vô hiệu hóa upload ảnh một cách an toàn.

> [!IMPORTANT]
> **Lưu ý đặc biệt về API URL khi chạy trên thiết bị thật (Expo Go):**
>
> - **KHÔNG** sử dụng `localhost` hoặc `127.0.0.1` vì thiết bị di động thật không thể hiểu địa chỉ này (nó trỏ vào chính điện thoại của bạn).
> - Bạn phải sử dụng địa chỉ **IP mạng nội bộ (LAN)** của máy tính đang chạy backend Spring Boot.
> - **Ví dụ định dạng đúng:** `EXPO_PUBLIC_API_URL=http://190.111.1.100:8080/api/v1`

#### 🔍 Cách lấy địa chỉ IP của máy tính:

- **Trên Windows:** Mở Command Prompt (cmd) và gõ lệnh:
  ```cmd
  ipconfig
  ```
  Tìm dòng **IPv4 Address** của card mạng bạn đang kết nối (ví dụ: Wi-Fi hoặc Ethernet). Thường sẽ có dạng `190.111.x.x` hoặc `10.0.x.x`.
- **Trên macOS/Linux:** Mở Terminal và gõ lệnh:
  ```bash
  ifconfig
  ```
  hoặc
  ```bash
  ip a
  ```
  Tìm địa chỉ IP thuộc card mạng đang active (thường là `en0` đối với Wi-Fi trên Mac).

---

### Bước 4: Khởi chạy ứng dụng

Chạy lệnh sau để khởi động Expo Development Server:

```bash
npm start
```

_Hoặc:_

```bash
npx expo start
```

Sau khi server khởi chạy thành công, một mã QR Code sẽ hiển thị trên Terminal:

- **Chạy trên thiết bị di động thật với các luồng thuần Expo:**
  1. Tải ứng dụng **Expo Go** từ App Store (iOS) hoặc Google Play Store (Android).
  2. Đảm bảo điện thoại và máy tính của bạn đang kết nối **cùng một mạng Wi-Fi**.
  3. Dùng camera (iOS) hoặc tính năng quét mã QR trong app Expo Go (Android) để quét mã QR trên Terminal.
- **Firebase Phone Auth và Google Sign-In native:** cần EAS development build/dev client vì Expo Go không chứa các native module tương ứng. Chạy `npm run start:dev-client` sau khi cài development build lên thiết bị.
- **Chạy trên Emulator/Simulator:**
  - Nhấn `a` để chạy trên thiết bị Android ảo (đã mở sẵn Android Studio Emulator).
  - Nhấn `i` để chạy trên thiết bị iOS Simulator (yêu cầu Xcode trên macOS).
- **Chạy Dev Client (nếu có build riêng):**
  ```bash
  npm run start:dev-client
  ```

---

## 📂 Cấu trúc thư mục chính

Dự án áp dụng mô hình thiết kế **Feature-Based Architecture** (Phát triển theo cụm tính năng) giúp mở rộng mã nguồn dễ dàng và tránh phụ thuộc chéo:

```text
fams-front-app-project/
├── app/                      # EXPO ROUTER (File-based Routing)
│   ├── (admin)/              # Nhóm màn hình dành cho vai trò quản trị viên
│   ├── (auth)/               # Quy trình xác thực (Login, Register, OTP, Forgot Password)
│   ├── (tabs)/               # Giao diện chính phân trang dạng Tabs (Home, Attendance, Profile...)
│   ├── face/                 # Quy trình đăng ký Face ID (Camera, Điều khoản consent)
│   ├── modal/                # Modal kết quả check-in/random check
│   ├── _layout.tsx           # Layout gốc cấu hình Providers & Navigation Root
│   └── index.tsx             # Entry point chuyển hướng người dùng dựa vào trạng thái Auth
│
├── src/                      # MÃ NGUỒN CHÍNH (Core Application Source)
│   ├── components/           # UI Components dùng chung (Button, Input, Card, Loading...)
│   ├── config/               # Biến môi trường và Google OAuth
│   ├── constants/            # Thiết kế hệ thống (Theme colors, Spacing, Typography...)
│   ├── features/             # THƯ MỤC TÍNH NĂNG (Feature Modules)
│   │   ├── auth/             # Quản lý Đăng nhập, 2FA, Google Sign-In
│   │   ├── profile/          # Thông tin cá nhân, lời mời tenant & màn hình UI Face ID
│   │   │   └── components/   # FaceEnrollScreen, FaceEnrollCamera, FaceConsentSheet... (chỉ UI, import logic từ face/)
│   │   ├── face/             # Toàn bộ logic Face ID (enroll/consent/status/revoke)
│   │   │   ├── hooks/        # use-face-id, use-face-enroll, use-current-employee-id
│   │   │   ├── services/     # face.service.ts, employee-id.service.ts (REST API thật)
│   │   │   ├── store/        # face-enroll.store.ts (session chụp ảnh)
│   │   │   ├── types/        # FaceId.ts
│   │   │   └── utils/        # face-id.utils.ts, face-quality.ts
│   │   ├── tenant/           # Thiết lập Workspace/Doanh nghiệp của người dùng
│   │   └── notification/     # Quản lý trạng thái và nhận thông báo
│   ├── hooks/                # Custom React Hooks dùng chung hệ thống
│   ├── services/             # Axios API Client
│   ├── stores/               # Scaffold cũ; store đang dùng nằm trong từng feature
│   ├── types/                # Scaffold cũ; type đang dùng nằm trong từng feature
│   └── utils/                # Helper dùng chung (hiện phần lớn là scaffold)
```

---

## ⚠️ Lưu ý quan trọng khi phát triển

### 1. Thay đổi API URL & Biến Môi Trường

- Mỗi lần thay đổi giá trị trong file `.env`, bạn **phải khởi động lại Expo Server** kèm cờ xóa cache để áp dụng cấu hình mới:
  ```bash
  npx expo start -c
  ```

### 2. Face ID gọi API thật (tenant + employeeId scoped)

- Toàn bộ logic Face ID nằm ở feature riêng `src/features/face/` — `profile/` chỉ còn UI (màn hình enroll, status card, nút revoke), không tự gọi API. Face ID không còn dùng mock `AsyncStorage` — các hook trong `src/features/face/hooks/use-face-id.ts` gọi thẳng REST API qua [`face.service.ts`](src/features/face/services/face.service.ts):
  `POST/GET/DELETE /tenants/{tenantId}/employees/{employeeId}/face-id[/consent|/enroll]`.
- `employeeId` được lấy qua hook `useCurrentEmployeeId()` (dựa trên API `attendance/me/monthly`) — không dùng `user.id`. Nếu tài khoản không có employee profile trong tenant, toàn bộ entry point Face ID sẽ bị ẩn/disable.
- Ảnh chụp được resize/nén dưới 1MB và convert sang JPEG (kể cả HEIC) qua `expo-image-manipulator` trước khi upload — xem `src/features/face/utils/face-id.utils.ts`.

### 3. Yêu cầu phiên bản Expo SDK

- Dự án đang khóa cứng phiên bản **Expo SDK 54**. Vui lòng không tự ý nâng cấp các thư viện chính như `expo`, `react-native`, `expo-router` bằng lệnh `npm install` thông thường để tránh xung đột phiên bản. Hãy dùng lệnh sau nếu muốn cài thêm thư viện tương thích:
  ```bash
  npx expo install <ten-thu-vien>
  ```

### 4. Quality gate trước khi commit

```bash
npm run quality
```

Lệnh này chạy ESLint và TypeScript strict check. Cả hai phải pass trước khi mở pull request.

---

## 🔍 Troubleshooting (Khắc phục lỗi thường gặp)

### 📌 Lỗi Camera Permission khi đăng ký Face ID

- **Triệu chứng:** Màn hình chụp ảnh Face ID bị đen hoặc hiển thị cảnh báo yêu cầu quyền truy cập Camera nhưng không thể nhấn nút cấp quyền.
- **Cách khắc phục:**
  1. Vào phần Cài đặt (Settings) trên điện thoại của bạn -> Tìm ứng dụng **Expo Go** (hoặc Dev Client của bạn) -> Cho phép quyền truy cập **Camera**.
  2. Khởi động lại ứng dụng và thử lại.

### 📌 Lỗi kết nối API (`Network Error` hoặc `AxiosError`)

- **Triệu chứng:** Không thể đăng nhập, không thể load dữ liệu, console log xuất hiện lỗi kết nối mạng.
- **Kiểm tra & Khắc phục:**
  1. Đảm bảo điện thoại và máy tính chạy Spring Boot đang **kết nối chung một mạng Wi-Fi**.
  2. Đảm bảo cổng backend (mặc định `8080`) không bị chặn bởi **Firewall** (Tường lửa) của Windows/macOS. Hãy thử cấu hình Firewall cho phép truy cập Public/Private với cổng này.
  3. Đảm bảo rằng bạn đã cập nhật địa chỉ IP LAN mới nhất trong file `.env` (vì IP nội bộ có thể bị thay đổi mỗi khi bạn kết nối lại Wi-Fi).

### 📌 Lỗi không thay đổi cấu hình `.env`

- **Triệu chứng:** Đã sửa `.env` nhưng app không nhận cấu hình mới.
- **Cách khắc phục:** Expo thường lưu cache biến môi trường. Tắt terminal chạy Expo và chạy lại bằng lệnh:
  ```bash
  npx expo start -c
  ```
