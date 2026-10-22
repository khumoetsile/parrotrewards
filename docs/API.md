# REST API — local MVP

Base: http://localhost:3000/api. Android emulator: http://10.0.2.2:3000/api. JSON success `{ "data": ... }`; errors `{ "error": { "code": "...", "message": "..." } }`. Access token via Authorization: Bearer. Lists use page (1-based), 20 records per page. Amounts are decimal **strings**, never floating-point values. All timestamps/status changes controlled by server.

| Endpoint | Method | Access / body |
|---|---|---|
| /auth/register | POST | Public: email, password (12+ characters, at most 72 UTF-8 bytes), name. Customer only |
| /auth/login | POST | Public: email, password; user and access/refresh tokens |
| /auth/refresh | POST | refreshToken; rotates once |
| /auth/logout | POST | refreshToken; revokes refresh |
| /auth/forgot-password | POST | email; neutral response, delivery unconfigured |
| /auth/reset-password | POST | token, password; single-use reset token |
| /me | GET/PATCH | Auth; patch name, notificationEnabled |
| /shops | GET | Public; search, category, page; approved active shops only |
| /shops/:id | GET | Public shop and offers |
| /qr/resolve | POST | Public: token (pula://shop/ prefixed or raw) |
| /receipts | POST | Customer; multipart receipt JPEG/PNG/WebP <=8MB |
| /receipts/:id/image | GET | Owner, assigned merchant or admin; no-store |
| /transactions | POST | Customer: shopId, receiptId, amount, idempotencyKey >=16 chars |
| /transactions | GET | Own/assigned/all by role; status, page |
| /transactions/:id | GET | Same role scope; OCR, flags, history, ledger |
| /transactions/:id/cancel | POST | Owner; only SUBMITTED |
| /transactions/:id/disputes | POST | Visible transaction; reason >=10 chars |
| /notifications | GET | Own in-app notifications |
| /notifications/:id/read | PATCH | Own only |
| /merchant/profile | GET | Assigned merchants/shops/QR/offers |
| /merchants/:id | PATCH | Assigned merchant/admin: category, description |
| /merchants/:id/shops | POST | Assigned merchant/admin: name, address |
| /manage/shops/:id | PATCH | Assigned merchant/admin: name, address, active |
| /manage/shops/:id/qr | GET | Assigned merchant/admin: printable SVG |
| /manage/shops/:id/qr/rotate | POST | Admin; invalidates previous token |
| /manage/shops/:id/offers | POST | Assigned merchant/admin: title, description, expiresAt |
| /reports | GET | Assigned merchant/admin: verified sales, provisional totals, statuses |
| /admin/users | GET | Admin: non-secret customer/staff records |
| /admin/users/:id | PATCH | Admin: active; cannot deactivate self |
| /admin/merchant-users | POST | Admin: name, email, password; merchant role |
| /admin/merchants | GET/POST | Admin; create name, category, description, optional staffEmail |
| /admin/merchants/:id/approval | PATCH | Admin: approved boolean |
| /admin/transactions/:id/review | POST | Admin: VERIFIED/REJECTED, reason; only NEEDS_REVIEW |
| /admin/disputes | GET | Admin |
| /admin/disputes/:id | PATCH | Admin: resolution >=10 chars |
| /admin/audit | GET | Admin: immutable activity records |
| /admin/rules | GET | Admin: commissions, disabled discounts, settings |
| /admin/rules/commission | POST | Admin: rateBps 0–10000, optional merchantId |
| /admin/settings | PATCH | Admin: maxReceiptAgeDays 1–365 |

`/health` confirms the server process; `/ready` queries MySQL. Worker runs separately (`npm run worker`). Customer may never write verification status. All OCR receipts are reviewed independently; no settled/received funds endpoints exist.
