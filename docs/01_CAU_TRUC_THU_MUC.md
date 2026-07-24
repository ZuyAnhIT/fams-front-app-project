# 01. Cấu trúc thư mục dự án FAMS Mobile

> Snapshot: branch `develop`, ngày 2026-07-23. Cây dưới đây mô tả mã nguồn hiện tại, không chép nội dung của `.git/`, `node_modules/`, `.expo/` và thư mục native sinh tự động vì chúng không phải nguồn cần bảo trì. File `app-structure.txt` ở root là snapshot cũ, không còn phản ánh đúng dự án; dùng tài liệu này làm nguồn tham chiếu mới.

## 1. Cây thư mục đầy đủ

```text
fams-front-app-project/
├── app/                                      # Route và layout của Expo Router
│   ├── _layout.tsx                           # Root providers, Axios interceptor, root Stack
│   ├── index.tsx                             # Entry: hydrate auth rồi redirect login/home
│   ├── (admin)/                              # Nhóm route dành cho admin
│   │   ├── _layout.tsx                       # Auth + role guard (`profile.role === admin`)
│   │   └── tenant-setup.tsx                  # Page nối TenantSetupWizard
│   ├── (auth)/                               # Nhóm route trước/trong quá trình đăng nhập
│   │   ├── _layout.tsx                       # Auth Stack, ẩn header
│   │   ├── login.tsx                         # Đăng nhập email/Google, render LoginForm
│   │   ├── phone-login.tsx                   # Firebase Phone OTP
│   │   ├── register.tsx                      # Đăng ký, render RegisterForm
│   │   ├── 2fa-verify.tsx                    # Xác minh TOTP khi đăng nhập
│   │   ├── forgot-password.tsx               # Yêu cầu quên mật khẩu
│   │   ├── reset-password.tsx                # Đặt lại mật khẩu
│   │   └── select-tenant.tsx                 # Chọn/chuyển tenant đang thao tác
│   ├── (tabs)/                               # Khu vực sau đăng nhập
│   │   ├── _layout.tsx                       # Auth guard + Bottom Tabs + unread badge
│   │   ├── home.tsx                          # Dashboard, ca hôm nay, truy cập nhanh
│   │   ├── checkin.tsx                       # Page mỏng render CheckinHome
│   │   ├── checkin-history.tsx               # Page mỏng render CheckinHistory
│   │   ├── notifications.tsx                 # Danh sách thông báo
│   │   ├── profile.tsx                       # Page mỏng render ProfileScreen
│   │   ├── attendance.tsx                    # Chưa làm: redirect về Home
│   │   ├── random-check.tsx                  # Chưa làm: redirect về Home
│   │   ├── site/                             # Nested Stack xem công trình
│   │   │   ├── _layout.tsx
│   │   │   ├── index.tsx                     # Danh sách site
│   │   │   └── [id].tsx                      # Chi tiết site động theo id
│   │   └── assignment/                       # Nested Stack xem phân công
│   │       ├── _layout.tsx
│   │       ├── index.tsx                     # Danh sách phân công theo site
│   │       └── [id].tsx                      # Chưa làm detail: redirect về list
│   ├── face/
│   │   ├── _layout.tsx                       # AuthGate cho route Face ID
│   │   ├── enroll.tsx                        # Đăng ký Face ID
│   │   └── verify.tsx                        # Chưa làm route thật: redirect Profile
│   └── modal/
│       ├── checkin-result.tsx                 # Modal kết quả check-in/check-out có AuthGate
│       └── random-check-result.tsx            # Chưa làm: redirect Home
│
├── src/                                      # Mã nguồn ứng dụng không trực tiếp định nghĩa URL route
│   ├── global.css                            # CSS web hiện chưa được import trong app
│   ├── assets/                               # Chỗ dành cho tài nguyên thuộc source module
│   │   ├── animations/README.md              # Hướng dẫn đặt animation
│   │   └── fonts/README.md                   # Hướng dẫn đặt font
│   ├── components/                           # Shared/template components; xem lưu ý sử dụng bên dưới
│   │   ├── external-link.tsx
│   │   ├── hint-row.tsx
│   │   ├── themed-text.tsx
│   │   ├── themed-view.tsx
│   │   ├── web-badge.tsx
│   │   ├── animated-icon.module.css
│   │   └── ui/
│   │       ├── app-button.tsx                 # Button chuẩn của app
│   │       ├── app-header.tsx                 # Header dùng chung
│   │       ├── confirm-dialog.tsx             # Dialog xác nhận
│   │       ├── feedback-state.tsx             # Loading/error/empty/forbidden state
│   │       ├── keyboard-aware-sheet.tsx       # Sheet/modal tránh bàn phím
│   │       ├── responsive-container.tsx       # Giới hạn chiều rộng responsive
│   │       └── toast.tsx                      # ToastProvider + useToast
│   ├── config/
│   │   ├── env.ts                             # API_BASE_URL, AVATAR_UPLOAD_URL
│   │   └── google.ts                          # GOOGLE_WEB_CLIENT_ID
│   ├── constants/
│   │   └── theme.ts                           # Theme cũ; hiện không có consumer ngoài chuỗi hook cũ
│   ├── hooks/                                # Hook theme/color scheme cũ, chưa được screen hiện tại dùng
│   │   ├── use-color-scheme.ts                # Native color scheme
│   │   ├── use-color-scheme.web.ts            # Bản override cho web
│   │   └── use-theme.ts                       # Hook theme dùng chung
│   ├── services/                              # Hạ tầng dùng xuyên feature
│   │   ├── api-client.ts                      # Axios instance, baseURL, timeout
│   │   ├── api-response.ts                    # Bóc ApiEnvelope `{ success,message,data }`
│   │   └── avatar-upload.ts                   # Chọn/nén/upload avatar + device id
│   ├── theme/
│   │   └── tokens.ts                          # Palette, spacing, radius, shadow, layout token
│   └── features/                              # Module theo nghiệp vụ
│       ├── auth/
│       │   ├── README.md                      # Tài liệu riêng của auth
│       │   ├── api.ts                         # REST auth/profile/password/TOTP
│       │   ├── api-interceptors.ts            # Bearer token + refresh 401 queue/replay
│       │   ├── api-mappers.ts                 # Map DTO backend sang model frontend
│       │   ├── google-sign-in-service.ts      # Native Google Sign-In/AuthSession helpers
│       │   ├── secure-storage.ts              # SecureStore native
│       │   ├── secure-storage.web.ts          # localStorage fallback web
│       │   ├── session.ts                     # Resolve profile/tenant + điều hướng sau auth
│       │   ├── store.ts                       # Zustand auth/session/active tenant
│       │   ├── theme.ts                       # Theme riêng cho form auth
│       │   ├── types.ts                       # Auth request/response/store types
│       │   ├── utils.ts                       # Parse error, phone/lock/countdown helpers
│       │   ├── components/
│       │   │   ├── AccountLockedBanner.tsx
│       │   │   ├── AuthGate.tsx
│       │   │   ├── GoogleSignInButton.tsx
│       │   │   ├── LoginForm.tsx
│       │   │   ├── OTPInput.tsx
│       │   │   ├── PasswordChangeForm.tsx
│       │   │   ├── ProfileForm.tsx
│       │   │   ├── RegisterForm.tsx
│       │   │   └── TwoFASetupModal.tsx
│       │   └── hooks/
│       │       ├── use-login.ts
│       │       ├── use-register.ts
│       │       ├── use-google-login.ts
│       │       ├── use-firebase-phone-auth.ts
│       │       ├── use-firebase-phone-auth.web.ts
│       │       ├── use-phone-otp.ts
│       │       ├── use-2fa.ts
│       │       ├── use-forgot-password.ts
│       │       ├── use-reset-password.ts
│       │       ├── use-change-password.ts
│       │       ├── use-profile.ts
│       │       ├── use-avatar-upload.ts
│       │       ├── use-select-tenant.ts
│       │       ├── use-refresh-token.ts
│       │       └── use-logout.ts
│       ├── rbac/
│       │   └── api.ts                         # GET roles/me, suy ra tenant được phép dùng
│       ├── tenant/
│       │   ├── api.ts                         # Tenant/settings/subscription/plan REST API
│       │   ├── types.ts
│       │   ├── utils.ts
│       │   ├── components/
│       │   │   └── TenantSetupWizard.tsx      # Wizard 3 bước, RHF + Zod
│       │   └── hooks/
│       │       ├── use-tenant.ts
│       │       ├── use-tenant-list.ts
│       │       ├── use-create-tenant.ts
│       │       └── use-tenant-settings.ts
│       ├── site/
│       │   ├── components/
│       │   │   ├── SiteList.tsx
│       │   │   ├── SiteListItem.tsx
│       │   │   ├── SiteDetail.tsx
│       │   │   ├── SiteLocationMap.tsx        # Map native
│       │   │   └── SiteLocationMap.web.tsx    # Web fallback
│       │   ├── hooks/
│       │   │   ├── use-site-list.ts
│       │   │   ├── use-site-detail.ts
│       │   │   └── use-site-supervisors.ts
│       │   ├── services/site.service.ts
│       │   ├── types/Site.ts
│       │   └── utils/site.utils.ts
│       ├── assignment/
│       │   ├── components/assignment.component.tsx
│       │   ├── hooks/use-assignment.ts
│       │   ├── services/assignment.service.ts
│       │   ├── store/assignment.store.ts      # Marker: không có store; file chỉ `export {}`
│       │   ├── types/assignment.type.ts
│       │   └── utils/assignment.mapper.ts
│       ├── gps/
│       │   ├── hooks/use-gps.ts               # Trạng thái locating/error cho UI
│       │   ├── services/gps.service.ts         # Permission, GPS enabled, current position
│       │   └── types/gps.type.ts
│       ├── checkin/
│       │   ├── components/
│       │   │   ├── checkin.component.tsx      # Màn hình check-in/out chính
│       │   │   ├── CheckinHistory.tsx
│       │   │   └── CheckinResult.tsx
│       │   ├── hooks/
│       │   │   ├── use-checkin.ts             # Query-key factory dùng chung
│       │   │   ├── use-available-sites.ts
│       │   │   ├── use-checkin-submit.ts
│       │   │   ├── use-checkout-submit.ts
│       │   │   ├── use-checkin-result.ts
│       │   │   ├── use-checkin-history.ts
│       │   │   └── use-checkin-explain.ts
│       │   ├── services/checkin.service.ts
│       │   ├── store/checkin.store.ts          # Persist openCheckinId theo user + tenant
│       │   ├── types/checkin.type.ts
│       │   └── utils/checkin.mapper.ts
│       ├── face/
│       │   ├── hooks/
│       │   │   ├── use-current-employee-id.ts
│       │   │   ├── use-face-id.ts              # Status/consent/enroll/revoke
│       │   │   ├── use-face-enroll.ts          # Orchestrate wizard enroll
│       │   │   └── use-face-verify.ts          # Submit + polling verify
│       │   ├── services/
│       │   │   ├── employee-id.service.ts
│       │   │   └── face.service.ts
│       │   ├── store/face-enroll.store.ts      # Ảnh/session tạm trong RAM
│       │   ├── types/FaceId.ts
│       │   └── utils/
│       │       ├── face-id.utils.ts             # Chuẩn hóa/nén/base64/parse error
│       │       └── face-quality.ts              # Ngưỡng/số lượng/gợi ý chụp
│       ├── notification/
│       │   ├── components/
│       │   │   ├── NotificationBadge.tsx
│       │   │   ├── NotificationItem.tsx
│       │   │   └── NotificationList.tsx
│       │   ├── hooks/
│       │   │   ├── useNotifications.ts         # Infinite Query
│       │   │   ├── useUnreadCount.ts           # Badge polling 60 giây
│       │   │   └── useMarkAsRead.ts             # Mutation + patch/invalidate cache
│       │   ├── services/notification.service.ts
│       │   ├── types/Notification.ts
│       │   └── utils/notification.utils.ts
│       └── profile/
│           ├── components/
│           │   ├── ProfileScreen.tsx
│           │   ├── ProfileSettingsRow.tsx
│           │   ├── ProfileFaceSection.tsx
│           │   ├── FaceStatusCard.tsx
│           │   ├── FaceConsentSheet.tsx
│           │   ├── FaceEnrollScreen.tsx
│           │   ├── FaceEnrollCamera.tsx
│           │   ├── FaceEnrollProgress.tsx
│           │   └── FacePhotoPreview.tsx
│           ├── hooks/
│           │   ├── use-profile.ts              # Re-export invitation hooks
│           │   └── use-invitation.ts
│           ├── services/invitation.service.ts
│           ├── types/Profile.ts
│           └── utils/profile.utils.ts
│
├── assets/                                  # Asset đóng gói bởi Expo
│   ├── expo.icon/
│   │   ├── icon.json
│   │   └── Assets/
│   │       ├── expo-symbol 2.svg
│   │       └── grid.png
│   └── images/
│       ├── icon.png
│       ├── favicon.png
│       ├── splash-icon.png
│       ├── android-icon-background.png
│       ├── android-icon-foreground.png
│       ├── android-icon-monochrome.png
│       ├── expo-badge.png / expo-badge-white.png
│       ├── expo-logo.png / logo-glow.png
│       ├── react-logo.png / react-logo@2x.png / react-logo@3x.png
│       ├── tutorial-web.png
│       └── tabIcons/                         # Bộ icon template còn trong repo, tab thật dùng Ionicons
│           ├── home.png / home@2x.png / home@3x.png
│           └── explore.png / explore@2x.png / explore@3x.png
│
├── docs/
│   ├── 01_CAU_TRUC_THU_MUC.md               # Tài liệu này
│   ├── 02_KIEN_TRUC_DU_AN.md
│   ├── 03_LUONG_LOGIC_TINH_NANG_LOI.md
│   ├── 04_QUY_TRINH_PHAT_TRIEN_TINH_NANG.md
│   ├── 05_MOI_TRUONG_VA_THU_VIEN.md
│   ├── ARCHITECTURE.md                       # Baseline/lịch sử, có phần đã lỗi thời
│   ├── PROJECT_TECHNICAL_GUIDE.md            # Rà soát kỹ thuật tổng hợp trước đó
│   ├── PROJECT_HANDOFF.md                    # Trạng thái EAS/backend bàn giao
│   └── UI_UX_GUIDE.md                        # Quy chuẩn UI/UX
├── scripts/
│   └── reset-project.js                      # Script reset mẫu Expo; không dùng thường xuyên
├── .env.example                              # Mẫu biến môi trường, được commit
├── .gitignore                                # Ignore dependency/build/secret/native generated
├── .claude/settings.json                     # Thiết lập công cụ cục bộ được commit
├── app.config.ts                             # Expo config động, chỉ nạp Firebase file tồn tại
├── app.json                                  # Expo metadata/plugin/permission/static config
├── eas.json                                  # EAS build profiles
├── eslint.config.js                          # ESLint flat config
├── tsconfig.json                             # TypeScript strict + alias `@/*`
├── package.json                              # Script và dependency khai báo
├── package-lock.json                         # Dependency tree khóa thực tế
├── README.md                                 # Hướng dẫn tổng quan/cài đặt
├── CLAUDE.md                                 # Hướng dẫn làm việc cũ cho agent
├── app-structure.txt                         # Cây Windows cũ; không dùng làm nguồn hiện tại
└── LICENSE
```

## 2. Thư mục/file sinh tự động hoặc chỉ tồn tại local

Các mục sau có thể có trên một máy dev nhưng không được coi là mã nguồn:

| Mục | Nguồn | Có commit? | Cách xử lý |
|---|---|---:|---|
| `node_modules/` | `npm install` | Không | Không chỉnh tay, xóa/cài lại được |
| `.expo/` | `expo start` | Không | Cache, device và typed route sinh tự động |
| `dist/`, `web-build/`, `.expo-tmp-export/` | Expo export | Không | Build artifact |
| `android/`, `ios/` | Expo prebuild/EAS | Không | Hiện là managed workflow, có thể sinh lại |
| `.env` | Developer/EAS environment | Không | Chứa URL/client ID; không ghi giá trị vào tài liệu |
| `google-services.json` | Firebase Android | Không | Secret/config native local hoặc EAS file variable |
| `GoogleService-Info.plist` | Firebase iOS | Không | Hiện chưa có trong workspace khảo sát |
| `expo-env.d.ts` | Expo CLI | Không | Type declaration sinh tự động |

## 3. Quy ước đọc cấu trúc

Một file tồn tại không có nghĩa đang nằm trên runtime path. Rà import hiện tại cho thấy `src/components/ui/*` và `src/theme/tokens.ts` được dùng rộng; nhóm starter `external-link`, `hint-row`, `themed-*`, `web-badge`, các hook/theme cũ, `global.css` và ảnh `tabIcons` chưa được page/feature hiện tại dùng. Không xây feature mới dựa trên chúng chỉ vì tên trông “shared”; xác minh bằng `rg` trước, rồi tái sử dụng có chủ đích hoặc dọn trong một thay đổi riêng.

### `app/` là route, không phải toàn bộ nghiệp vụ

Tên file quyết định URL. Dấu ngoặc như `(tabs)` và `(auth)` là route group, không xuất hiện trong URL người dùng. File `[id].tsx` là route động. `_layout.tsx` tạo navigator/provider/guard cho các page con.

Page mới nên mỏng: lấy route params, render screen component và xử lý navigation wiring. Không đặt REST call trực tiếp trong `app/**/*.tsx`.

### `src/features/<feature>/` là đơn vị nghiệp vụ

Convention mục tiêu:

```text
feature/
├── components/        # UI/screen của riêng feature
├── hooks/             # Query, mutation và orchestration
├── services/ hoặc api.ts
├── store/             # Chỉ khi có client state chia sẻ/persist
├── types/             # DTO/domain/UI types
└── utils/             # Mapper, format, validation thuần
```

Không phải feature nào hiện cũng tuân thủ trọn vẹn convention: `auth` dùng `api.ts` ở root; `tenant` dùng `types.ts`; `rbac` chỉ có `api.ts`; tên file Notification dùng PascalCase trong khi nhiều feature khác dùng kebab-case.

### Shared code chỉ đặt trong `src/components`, `src/services`, `src/hooks`

- Chỉ chuyển code ra shared khi có từ hai feature sử dụng hoặc đó là hạ tầng xuyên ứng dụng.
- `api-client.ts` và `api-response.ts` là hạ tầng HTTP chung.
- `toast`, `AppButton`, `FeedbackState` là UI chung.
- Logic Face ID không phải shared UI: API/hook ở `features/face`, còn UI hiện nằm trong `features/profile`; đây là một quan hệ cần biết khi sửa.

## 4. Bản đồ route → feature

| Route/page | Feature chính | Trạng thái |
|---|---|---|
| `/` | auth store | Hoạt động |
| `/(auth)/login`, register, phone-login, 2FA, password | auth | Hoạt động nhưng cần test contract/backend |
| `/(auth)/select-tenant` | auth + rbac + checkin store | Hoạt động |
| `/(admin)/tenant-setup` | tenant | Có wizard; một số API tenant khác chưa có page |
| `/(tabs)/home` | auth + checkin + notification | Hoạt động |
| `/(tabs)/checkin`, history, result modal | checkin + gps | Luồng lõi đã nối |
| `/(tabs)/site/*` | site | Read-only, đã nối |
| `/(tabs)/assignment` | assignment + site | List đã nối, detail chưa có |
| `/(tabs)/notifications` | notification | In-app REST đã nối, chưa có push |
| `/(tabs)/profile`, `/face/enroll` | auth + profile + face | Profile/enroll đã nối |
| `/face/verify` | face | Hook/service có nhưng route nghiệp vụ chưa nối |
| attendance, random-check | — | Chưa triển khai, redirect Home |

## 5. Điểm cần lưu ý cho người mới

1. `app-structure.txt` là cây từ phiên bản cũ: có route/thư mục không còn tồn tại và thiếu nhiều route hiện tại.
2. `docs/ARCHITECTURE.md` chứa baseline lịch sử; đoạn nói có 79 file TypeScript rỗng không còn đúng. `PROJECT_TECHNICAL_GUIDE.md` mới hơn.
3. Repo chỉ là frontend. Mọi nhận định về DTO/rule backend trong code hoặc docs phải được đối chiếu OpenAPI và repo backend trước khi coi là yêu cầu nghiệp vụ.
4. Không tạo `src/stores`, `src/types`, `src/lib` chung chỉ để “đủ mẫu”. Những scaffold rỗng trước đây đã bị xóa.
5. Không commit `.env`, Firebase service file, signing key hoặc build artifact.
