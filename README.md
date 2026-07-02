# FAMS Mobile - Field Attendance Management System 📱⚡

FAMS Mobile là ứng dụng di động nằm trong hệ sinh thái **Field Attendance Management System (FAMS)**, được xây dựng bằng **React Native** kết hợp nền tảng **Expo**. Ứng dụng hỗ trợ nhân viên thực hiện điểm danh, chụp ảnh khuôn mặt, ghi nhận vị trí GPS tại hiện trường và nhận các thông báo phân công công việc từ hệ thống quản trị.

---

## 🛠 Công nghệ sử dụng

Dự án được xây dựng và tối ưu trên nền tảng **Expo SDK 54** cùng các thư viện công nghệ hiện đại:

- **Core Framework:** [React Native](https://reactnative.dev/) (v0.81.x) & [Expo](https://expo.dev/) (v54)
- **Routing & Navigation:** [Expo Router v6](https://docs.expo.dev/router/introduction/) (File-based Routing, tương tự Next.js)
- **State Management:** [Zustand](https://github.com/pmndrs/zustand) (Quản lý trạng thái toàn cục gọn nhẹ, hiệu năng cao)
- **Data Fetching & Caching:** [TanStack Query v5](https://tanstack.com/query/latest) (React Query)
- **API Client:** [Axios](https://axios-http.com/) tích hợp hệ thống **Mock API Adapter** linh hoạt
- **Form & Validation:** [React Hook Form](https://react-hook-form.com/) & [Zod](https://zod.dev/)
- **Hardware & Device APIs:**
  - `expo-camera`: Chụp ảnh và kiểm tra chất lượng khuôn mặt để đăng ký Face ID.
  - `expo-location`: Xác thực vị trí GPS hiện trường của thiết bị khi điểm danh.
  - `expo-notifications`: Đăng ký token và nhận thông báo đẩy (push notifications).
  - `expo-secure-store`: Lưu trữ an toàn Token Authentication (`access_token`, `refresh_token`).
  - `@react-native-async-storage/async-storage`: Lưu trữ cấu hình cục bộ và dữ liệu mock.

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
   - `EXPO_PUBLIC_USE_MOCK_API`: Đặt thành `true` nếu bạn muốn chạy thử ứng dụng bằng dữ liệu giả lập (Mock API) không cần chạy Backend Spring Boot. Đặt thành `false` để kết nối hệ thống thật.
   - `EXPO_PUBLIC_API_URL`: URL API trỏ tới backend Spring Boot của bạn.

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

- **Chạy trên thiết bị di động thật:**
  1. Tái ứng dụng **Expo Go** từ App Store (iOS) hoặc Google Play Store (Android).
  2. Đảm bảo điện thoại và máy tính của bạn đang kết nối **cùng một mạng Wi-Fi**.
  3. Dùng camera (iOS) hoặc tính năng quét mã QR trong app Expo Go (Android) để quét mã QR trên Terminal.
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
│   ├── notification/         # Danh sách và chi tiết thông báo
│   ├── _layout.tsx           # Layout gốc cấu hình Providers & Navigation Root
│   └── index.tsx             # Entry point chuyển hướng người dùng dựa vào trạng thái Auth
│
├── src/                      # MÃ NGUỒN CHÍNH (Core Application Source)
│   ├── components/           # UI Components dùng chung (Button, Input, Card, Loading...)
│   ├── config/               # Cấu hình hệ thống (env.ts, axios client...)
│   ├── constants/            # Thiết kế hệ thống (Theme colors, Spacing, Typography...)
│   ├── features/             # THƯ MỤC TÍNH NĂNG (Feature Modules)
│   │   ├── auth/             # Quản lý Đăng nhập, 2FA, Google Sign-In
│   │   ├── profile/          # Thông tin cá nhân & Quản lý Face ID
│   │   │   ├── components/   # FaceEnrollCamera, FaceConsentSheet, PhotoPreview...
│   │   │   ├── hooks/        # use-face-enroll, useFaceRegistration...
│   │   │   ├── services/     # faceService.ts (Mock AsyncStorage), face.service.ts
│   │   │   └── types/        # Định nghĩa kiểu dữ liệu Face ID
│   │   ├── tenant/           # Thiết lập Workspace/Doanh nghiệp của người dùng
│   │   └── notification/     # Quản lý trạng thái và nhận thông báo
│   ├── hooks/                # Custom React Hooks dùng chung hệ thống
│   ├── services/             # Axios API Client & setup Axios Adapter Mock API
│   ├── stores/               # Quản lý Global State bằng Zustand
│   ├── types/                # Các kiểu dữ liệu TypeScript dùng chung
│   └── utils/                # Các helper functions xử lý định dạng, tính toán logic
```

---

## ⚠️ Lưu ý quan trọng khi phát triển

### 1. Thay đổi API URL & Biến Môi Trường

- Mỗi lần thay đổi giá trị trong file `.env`, bạn **phải khởi động lại Expo Server** kèm cờ xóa cache để áp dụng cấu hình mới:
  ```bash
  npx expo start -c
  ```

### 2. Cơ chế Mock Face ID trong giai đoạn phát triển

- Do backend AI nhận diện khuôn mặt đang trong quá trình hoàn thiện, chức năng **Face ID** hiện tại đang sử dụng dịch vụ giả lập **Mock Face Service** qua `AsyncStorage` cục bộ.
- Logic mock nằm tại: [faceService.ts](file:///d:/BaiTap/FAMS/fams-front-app-project/src/features/profile/services/faceService.ts) với key lưu trữ `@fams_mock_face_registration`.
- Quy trình mock sẽ giả lập:
  - Ký văn bản đồng ý điều khoản Face ID (Consent).
  - Chụp và kiểm tra chất lượng từ **3 đến 5 ảnh** (độ sáng, góc nghiêng, khoảng cách mắt).
  - Lưu thông tin đăng ký cùng thông tin thiết bị (`expo-device`) và chất lượng ảnh giả lập.
  - Khi backend chính thức hoàn thiện, chỉ cần đổi import trong các hook từ `faceService` (Mock) sang `face.service` (gọi REST API thật) mà không cần viết lại giao diện.

### 3. Cách Reset Dữ Liệu Mock Face ID

- Khi muốn test lại luồng đăng ký Face ID từ đầu (Chưa đăng ký -> Đã đăng ký):
  - Hàm `clearMockFaceData()` đã được cấu hình tự động dọn dẹp dữ liệu mock khi app reload/khởi chạy lại lần đầu.
  - Hoặc bạn có thể xóa bộ nhớ cache & dữ liệu lưu trữ của ứng dụng **Expo Go** trên thiết bị của mình.

### 4. Yêu cầu phiên bản Expo SDK

- Dự án đang khóa cứng phiên bản **Expo SDK 54**. Vui lòng không tự ý nâng cấp các thư viện chính như `expo`, `react-native`, `expo-router` bằng lệnh `npm install` thông thường để tránh xung đột phiên bản. Hãy dùng lệnh sau nếu muốn cài thêm thư viện tương thích:
  ```bash
  npx expo install <ten-thu-vien>
  ```

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

- **Triệu chứng:** Đã sửa `.env` từ `EXPO_PUBLIC_USE_MOCK_API=true` thành `false` nhưng app vẫn chạy mock.
- **Cách khắc phục:** Expo thường lưu cache biến môi trường. Tắt terminal chạy Expo và chạy lại bằng lệnh:
  ```bash
  npx expo start -c
  ```
