# 05. Môi trường, cấu hình và thư viện

> Snapshot dependency thực tế từ `package-lock.json`/`npm ls --depth=0`, branch `develop`, ngày 2026-07-23. Không ghi giá trị trong `.env` hoặc Firebase credential vào tài liệu.

## 1. Tổng quan môi trường

| Thành phần | Giá trị quan sát | Nguồn |
|---|---:|---|
| Project | `fams-front-app-project@1.0.0` | `package.json` |
| Expo SDK | `54.0.36` | package lock |
| React | `19.1.0` | package lock |
| React Native | `0.81.5` | package lock |
| Expo Router | `6.0.24` | package lock |
| TypeScript | `5.9.3` resolved; khai báo `~5.9.2` | lock/package.json |
| Node trên máy khảo sát | `v24.18.0` | `node --version` |
| npm trên máy khảo sát | `11.16.0` | `npm --version` |
| Expo CLI local | `54.0.26` | `npx expo --version` |
| Package manager chuẩn | npm | Có `package-lock.json` |
| App entry | `expo-router/entry` | `package.json` |

Project chưa có `engines`, `.nvmrc`, `.node-version` hoặc Volta config. Node 24 là môi trường đã quan sát chứ chưa phải version được dự án cam kết. Team nên chọn/pin một Node version duy nhất và dùng cùng version trong CI trước khi xem đó là chuẩn chính thức.

## 2. Cài đặt và chạy local

### 2.1 Yêu cầu cơ bản

- Node.js và npm thống nhất theo version team/CI sẽ pin.
- Backend FAMS reachable từ máy/thiết bị.
- Android Studio/SDK/ADB nếu chạy emulator/local Android build.
- Xcode trên macOS nếu chạy iOS Simulator/local iOS build.
- EAS account/project permission nếu tạo development/production build.
- Thiết bị và máy backend cùng mạng nếu dùng LAN HTTP trong development.

### 2.2 Cài dependency

Với repo có lock file, dùng:

```bash
npm ci
```

`npm install` phù hợp khi chủ đích thay dependency/lock file. Không chạy `npm audit fix --force` vì có thể nâng major Expo/React Native và phá compatibility SDK.

Thêm Expo module nên dùng:

```bash
npx expo install <package>
```

Expo CLI sẽ chọn version tương thích SDK hiện tại.

### 2.3 Chuẩn bị env

```bash
cp .env.example .env
```

Điền cấu hình local cần thiết, rồi restart Metro với clear cache nếu đổi env:

```bash
npx expo start -c
```

Không commit `.env`.

## 3. Scripts trong package.json

| Lệnh | Thực thi | Mục đích |
|---|---|---|
| `npm start` | `expo start` | Metro/Expo dev server |
| `npm run start:dev-client` | `expo start --dev-client` | Metro cho EAS development build |
| `npm run android` | `expo start --android` | Mở Android target |
| `npm run ios` | `expo start --ios` | Mở iOS target |
| `npm run web` | `expo start --web` | Chạy web |
| `npm run lint` | `expo lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` | TypeScript strict check |
| `npm run quality` | lint rồi typecheck | Static quality gate |
| `npm run reset-project` | reset script | Script template Expo; không dùng trên worktree có code thật nếu chưa đọc kỹ |

Không có `test` script, test runner hoặc test suite trong repo. Không có workflow CI được commit.

## 4. Biến môi trường

Expo chỉ expose biến có prefix `EXPO_PUBLIC_` vào bundle client. Chúng không phải secret.

| Biến | Bắt buộc theo flow | Nơi đọc | Ý nghĩa |
|---|---:|---|---|
| `EXPO_PUBLIC_API_URL` | Có cho API thật | `src/config/env.ts` | Base REST URL, thường kết thúc `/api/v1` |
| `EXPO_PUBLIC_AVATAR_UPLOAD_URL` | Có nếu upload avatar | `src/config/env.ts` | Relative backend path hoặc absolute HTTPS cùng policy tin cậy |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Có cho Google login | `src/config/google.ts` | OAuth Web Client ID dùng trao đổi ID token |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | Alias cũ | `src/config/google.ts` | Fallback compatibility, không nên dùng cho config mới |
| `EXPO_ANDROID_GOOGLE_SERVICES_FILE` | EAS/native Android | `app.config.ts` | EAS file variable hoặc local path Firebase Android |
| `EXPO_IOS_GOOGLE_SERVICES_FILE` | EAS/native iOS | `app.config.ts` | EAS file variable hoặc local path Firebase plist |

Fallback hiện tại:

```text
API_BASE_URL = http://localhost:8080/api/v1
AVATAR_UPLOAD_URL = chuỗi rỗng (upload fail-safe bị vô hiệu hóa)
GOOGLE_WEB_CLIENT_ID = chuỗi rỗng (Google login báo chưa cấu hình)
```

### Thiết bị thật và `localhost`

Trên điện thoại, `localhost` trỏ tới chính điện thoại, không phải máy chạy Spring Boot. Development trên thiết bị thật phải dùng IP LAN reachable, ví dụ:

```text
http://<ip-may-backend>:8080/api/v1
```

Production phải dùng HTTPS; không hard-code IP/credential vào source.

## 5. Expo/native configuration

### 5.1 App identity

| Cấu hình | Giá trị |
|---|---|
| App name | `FAMS` |
| Slug | `fams-front-app-project` |
| Version | `1.0.0` |
| Scheme | `famsfrontappproject` |
| Android package | `com.fams.mobile` |
| iOS bundle identifier | `com.fams.mobile` |
| Orientation | portrait |
| Web output | static |

### 5.2 Expo plugins

`app.json` khai báo:

- `expo-router`;
- `expo-camera` với camera permission tiếng Việt, tắt microphone/audio;
- `expo-splash-screen`;
- `expo-secure-store`;
- `expo-location` với location permission tiếng Việt;
- `@react-native-google-signin/google-signin`;
- `@react-native-firebase/app`;
- `@react-native-firebase/auth`.

Experiments bật:

```json
{
  "typedRoutes": true,
  "reactCompiler": true
}
```

### 5.3 app.json và app.config.ts

`app.json` có static path Firebase cho Android/iOS. `app.config.ts` là config động được Expo ưu tiên và có nhiệm vụ:

1. đọc path từ EAS file env nếu có, nếu không dùng path local mặc định;
2. kiểm tra file thực sự tồn tại;
3. loại `googleServicesFile` khỏi config platform nếu file thiếu;
4. tránh làm mọi lệnh Expo fail chỉ vì một platform chưa có Firebase file.

Tại snapshot khảo sát:

- `google-services.json` tồn tại local và bị Git ignore.
- `GoogleService-Info.plist` không tồn tại.

Điều này nghĩa là iOS Firebase chưa sẵn sàng, không phải toàn bộ iOS app chắc chắn không bundle được.

### 5.4 EAS profiles

| Profile | Mục đích | Đặc điểm |
|---|---|---|
| `development` | Thiết bị/dev client | developmentClient, internal, Android APK |
| `development-simulator` | iOS Simulator | extend development, simulator=true |
| `preview` | QA/internal | internal, Android APK |
| `production` | Store/release | autoIncrement |

EAS project ID đã được liên kết trong config, nhưng quyền account/project và credential phải được xác nhận riêng; xem `docs/PROJECT_HANDOFF.md` cho blocker lịch sử gần nhất.

## 6. Thư viện runtime theo nhóm

### 6.1 Core, routing và UI runtime

| Package | Version resolved | Vai trò | Dùng ở đâu |
|---|---:|---|---|
| `expo` | 54.0.36 | Runtime/tooling Expo | Toàn app |
| `react` | 19.1.0 | UI model | Toàn app |
| `react-native` | 0.81.5 | Native UI | Toàn app |
| `react-dom` | 19.1.0 | Render web | Web |
| `react-native-web` | 0.21.2 | RN adapter web | Web |
| `expo-router` | 6.0.24 | File-based route/Stack/Tabs | `app/` |
| `react-native-screens` | 4.16.0 | Native screen optimization | Navigation dependency |
| `react-native-safe-area-context` | 5.6.2 | Safe area | Hầu hết screen |
| `react-native-gesture-handler` | 2.28.0 | Gesture infrastructure | UI/native |
| `react-native-reanimated` | 4.1.7 | Animation runtime | UI/runtime |
| `react-native-worklets` | 0.5.1 | Worklet runtime | Reanimated |
| `expo-image` | 3.0.11 | Hiển thị ảnh tối ưu | Home/Profile |
| `expo-symbols` | 1.0.8 | Symbol UI | Dependency/template |

### 6.2 Data, state, HTTP và form

| Package | Version | Vai trò | Quy ước dự án |
|---|---:|---|---|
| `@tanstack/react-query` | 5.101.0 | Server state/query/mutation/cache | Hook theo feature; query key tenant-scoped |
| `zustand` | 5.0.14 | Client/session state | Auth, open check-in, face session, filter |
| `axios` | 1.18.0 | HTTP client | Chỉ gọi qua `apiClient`/service |
| `react-hook-form` | 7.80.0 | Form state | Auth và tenant wizard |
| `zod` | 4.4.3 | Schema validation | Form input |
| `@hookform/resolvers` | 5.4.0 | Nối Zod với RHF | Form |

### 6.3 Auth và storage

| Package | Version | Vai trò | Lưu ý |
|---|---:|---|---|
| `expo-secure-store` | 15.0.8 | Token/tenant native | Keychain/Keystore; không hỗ trợ web trực tiếp |
| `@react-native-async-storage/async-storage` | 2.2.0 | Open check-in ID | Không dùng cho secret |
| `@react-native-firebase/app` | 25.1.0 | Firebase core native | Cần service config/dev build |
| `@react-native-firebase/auth` | 25.1.0 | Phone OTP | Firebase client gửi/confirm SMS |
| `@react-native-google-signin/google-signin` | 16.1.2 | Google native sign-in | Cần OAuth client + native build |
| `expo-auth-session` | 7.0.11 | OAuth/AuthSession fallback | Web/flow được hỗ trợ |
| `expo-web-browser` | 15.0.11 | Hoàn tất browser auth session | Root/Google login |

Secure storage adapter:

- Native: `expo-secure-store`.
- Web: `window.localStorage` trong `secure-storage.web.ts`; thuận tiện nhưng token có thể bị đọc khi XSS. Không gọi đây là tương đương bảo mật với Keychain/Keystore.

### 6.4 Camera, ảnh, GPS, device và map

| Package | Version | Vai trò | Feature |
|---|---:|---|---|
| `expo-camera` | 17.0.10 | Chụp ảnh Face ID | Face enroll/verify |
| `expo-image-manipulator` | 14.0.8 | Resize/nén/JPEG/base64 | Face, avatar |
| `expo-image-picker` | 17.0.11 | Chọn avatar | Profile |
| `expo-location` | 19.0.8 | Permission/GPS hiện tại | Check-in/out |
| `expo-device` | 8.0.10 | Device/model ID | Auth/check-in/avatar helper |
| `react-native-maps` | 1.20.1 | Site map/geofence | Site native; web có fallback |

Camera/GPS behavior không nên chỉ kiểm bằng Web. Permission, hardware, background và accuracy phải test trên target thật.

### 6.5 Notification và Expo runtime phụ trợ

| Package | Version | Vai trò/hiện trạng |
|---|---:|---|
| `expo-notifications` | 0.32.17 | Đã cài nhưng chưa có code push token/listener |
| `expo-constants` | 18.0.13 | Runtime/app ownership detection/config |
| `expo-dev-client` | 6.0.21 | Development build chứa native modules |
| `expo-font` | 14.0.12 | Font loading capability; source mới chỉ có README asset |
| `expo-linking` | 8.0.12 | Linking/router dependency |
| `expo-splash-screen` | 31.0.13 | Splash |
| `expo-status-bar` | 3.0.9 | Status bar |
| `expo-system-ui` | 6.0.9 | System UI |

## 7. Development dependencies

| Package | Version resolved | Vai trò |
|---|---:|---|
| `typescript` | 5.9.3 | Strict static type check |
| `eslint` | 9.39.4 | Lint engine, flat config |
| `eslint-config-expo` | 10.0.0 | Expo lint rules/config |
| `@types/react` | 19.1.17 | React type definitions |

`tsconfig.json`:

- extends `expo/tsconfig.base`;
- `strict: true`;
- alias `@/* → ./src/*`;
- alias `@/assets/* → ./assets/*`;
- include toàn bộ TS/TSX và Expo generated types.

## 8. Expo Go, development build và Web

| Môi trường | Dùng tốt cho | Không đại diện đầy đủ |
|---|---|---|
| Web | UI responsive, REST API cơ bản, routing | Phone OTP native, SecureStore native, native map/camera/GPS behavior |
| Expo Go | Luồng Expo thuần giới hạn | Firebase Auth và native Google module không có trong Expo Go |
| EAS Development Build | Native integration gần app thật | Cần EAS credential/config và dev client cài trên thiết bị |
| Preview APK | QA internal không cần Metro | Cần env/backend reachable |
| Production build | Release | Cần HTTPS, signing, secrets, monitoring, policy |

Lệnh Metro cho dev client:

```bash
npm run start:dev-client -- --lan --clear
```

## 9. File nhạy cảm và quy tắc bảo mật

Đã Git ignore:

- `.env*` trừ `.env.example`;
- `google-services.json`, `GoogleService-Info.plist`;
- keystore/certificate/private key/mobile provision;
- credential/secrets JSON;
- build/log/cache.

Không:

- dán token/API secret/Firebase service content vào issue, docs hoặc log;
- commit ảnh mặt, ảnh avatar thật hoặc GPS test của nhân viên;
- dùng public third-party upload mặc định cho dữ liệu cá nhân;
- log `photoBase64`, Authorization header hoặc refresh token;
- coi biến `EXPO_PUBLIC_*` là secret.

Production avatar endpoint chỉ nên là backend cùng trust boundary hoặc pre-signed storage URL có policy phù hợp.

## 10. Kiểm tra môi trường

### Static checks

```bash
npm ls --depth=0
npm run quality
npx expo config --type public
```

### Bundle smoke test

```bash
npx expo export --platform web --output-dir /tmp/fams-web-export --clear
npx expo export --platform android --output-dir /tmp/fams-android-export --clear
```

### Runtime integration cần kiểm riêng

1. Backend health/API URL từ chính thiết bị.
2. Email login + access-token refresh.
3. Google OAuth redirect/native client/SHA fingerprint.
4. Firebase Phone Auth và backend Firebase Admin exchange.
5. Camera permission, Face enroll/verify service.
6. GPS permission/service/accuracy/geofence backend.
7. SecureStore persistence, logout/switch tenant cleanup.
8. Avatar multipart upload.
9. Notification REST polling/mark-read.

Bundle hoặc typecheck pass không chứng minh các integration này hoạt động.

## 11. Nợ môi trường cần xử lý

| Ưu tiên | Việc | Lý do |
|---|---|---|
| P0 | Pin Node/npm cho team và CI | Tránh “máy tôi chạy” do runtime khác |
| P0 | Thêm test stack + CI chạy quality/test | Hiện không có regression gate |
| P0 | Chốt EAS ownership/credentials/env | Development build native đang phụ thuộc external state |
| P0 nếu làm iOS | Cung cấp Firebase plist qua EAS secret/file | iOS Phone Auth chưa sẵn sàng |
| P0 production | Fail-fast khi thiếu API/env thay vì fallback localhost | Tránh release gọi sai endpoint |
| P1 | Quyết định triển khai push hoặc gỡ `expo-notifications` | Dependency hiện không được dùng |
| P1 | Chuẩn hóa OAuth/Firebase setup guide và test account | Giảm setup phụ thuộc cá nhân |
| P1 | Xác định browser security/CSP/BFF strategy | Token web đang ở localStorage |
| P2 | Theo dõi upgrade Expo theo một nhánh riêng | Tránh trộn SDK upgrade với feature |

## 12. Khi nâng/thêm thư viện

1. Xác nhận package có tương thích Expo SDK hiện tại.
2. Dùng `npx expo install` với Expo/native module.
3. Đọc yêu cầu config plugin, permission, prebuild và platform file.
4. Kiểm tra license, maintenance, security và bundle impact.
5. Không nâng đồng thời Expo/React Native/Router trừ một initiative riêng.
6. Chạy `npm run quality`, Expo config, bundle cho platform liên quan.
7. Với native dependency, tạo/cài development build mới; Metro restart không thêm native binary vào app đã cài.
8. Cập nhật tài liệu này và `.env.example` nếu có config mới.
