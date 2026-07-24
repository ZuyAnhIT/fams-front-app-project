# Auth/Profile live API evidence — 24/07/2026

Target được đọc từ `EXPO_PUBLIC_API_URL`. Tài liệu không lưu credential hoặc token.

## Session happy path

```text
sessions_shape=list
session_fields=createdAt,current,deviceId,expiresAt,id,ipAddress,lastUsedAt,userAgent
login_a=200
login_b=200
profile=200
sessions=200
revoke_other_session=200
revoked_refresh=401
logout_current=200
logged_out_refresh=401
```

Hai device ID kiểm thử là `codex-frontend-test-a` và
`codex-frontend-test-b`. Cả hai phiên đã được thu hồi sau test.

## Validation/security contract

```text
email_change_validation=400
phone_change_validation=400
phone_confirm_validation=400
email_confirm_invalid_token=400
forgot_unknown_privacy=200
google_invalid_token=401
totp_disable_when_off=400
logout_cleanup=200
```

## Build/quality

```text
npm run lint                  PASS (0 errors, 0 warnings)
npx tsc --noEmit             PASS
git diff --check             PASS for tracked diff
expo export --platform all   PASS
static routes                51
android Hermes bundle        PASS
ios Hermes bundle            PASS
web bundle/static render     PASS
Android Firebase config      PRESENT
iOS Google URL scheme        CONFIGURED
iOS Firebase plist           MISSING
```

Bundle được xuất ngoài repository tại
`/tmp/fams-front-all-export-final-20260724`.
