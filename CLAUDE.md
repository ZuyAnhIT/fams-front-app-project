# FAMS Frontend

## Phạm vi (cập nhật)

- Được ĐỌC backend/ để xác định chính xác API shape (request/response, field name, enum).
- KHÔNG được sửa bất kỳ file nào trong backend/.
- Khi đọc xong, PHẢI liệt kê rõ field/type lấy được từ backend trước khi code frontend,
  để tôi xác nhận lại trước khi bạn tiếp tục.

## Stack & convention

- React Native + TypeScript, Zustand cho state, Zod cho validate
- API pattern: xem .cursor/rules/FAMS_Frontend_Mobile_Architecture_Guide.mdc
- Chưa có test suite thật (không có script `test` trong package.json). Trước khi báo done: chạy `npm run lint` và `npx tsc --noEmit`

## Rule chi tiết hơn → xem file riêng trong .claude
