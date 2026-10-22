# MVP acceptance evidence

| Requirement | Implementation and evidence |
|---|---|
| Customer registration/login | API integration validates registration/login, password hashing, role escalation prevention. Flutter auth widgets validate inputs. Android connected workflow test tracked in PROGRESS.md. |
| Admin creates/approves merchant | Angular forms and protected API; verified by real MySQL integration. |
| Merchant shop and unique QR | Merchant-scoped creation, random 256-bit tokens, unique database indexes, authenticated downloadable SVG; API tests check scope and resolution. |
| Flutter QR scan | MobileScanner camera screen and alternative QR text entry implemented. Camera hardware and permission denial require manual device QA; connected test uses QR text. |
| Amount and receipt capture | Validated BWP input, ImagePicker camera/gallery, multipart upload, bounded server image decoding, secure storage. Device test uses a controlled picker fixture; physical capture not claimed verified. |
| Immediate record/history | Atomic SUBMITTED transaction/status/job create, unique UUID, server timestamps, request hash and per-user idempotency constraint. Concurrent retry tests verify one purchase. Customer history/details and merchant-scoped visibility implemented. |
| Async verification/review | Separate durable worker, real Tesseract local OCR, extraction, retry/failure fallback, review flags, admin-only review and immutable history. Real OCR API test passed. |
| Fraud indicators | Indexed exact-image duplicate and merchant-scoped receipt-number comparison, dHash similarity, totals/name/currency/date/confidence checks and rapid-submission flags. Duplicate tests passed; these are signals, not proof. |
| Merchant privacy/admin RBAC | Foreign merchant QR/receipt/transaction reads rejected, customer admin actions rejected, inactive accounts denied even with an existing access token. Integration tests passed. |
| Provisional commissions | VERIFIED triggers one immutable, decimal-safe rate snapshot and ledger entry. Verified sales/provisional totals tested. No received money, settlement or wallet created. |
| Merchant/admin management | Profile and branch editing, offer information, approval, people activation, dispute submission/resolution, rules/settings, audit history and report cards implemented in Angular. Production build and route-access unit test passed; browser interaction testing blocked by permission denial. |
| Notifications/settings | In-app status notifications, preferences, read marking and profile screens implemented. FCM unconfigured. |
| Recovery | Hashed single-use reset tokens, expiry and refresh revocation tested. Email delivery unconfigured; UI states this limitation. |
| Local environment | Dedicated loopback Docker MySQL 8, non-destructive Prisma initial migration, guarded fictional seed, ignored local secrets and OCR cache, local processes/scripts. No existing database reset, production deploy, paid service or remote push. |
| Tests/builds | Exact final results in PROGRESS.md; TypeScript build, real MySQL/OCR tests, Angular build/test, Flutter analyzer/widgets and Android debug build verified. |

## Work remaining before a public pilot

Physical camera/QR and permission/interruption testing; portal browser flows once permission is granted; iOS on macOS; real receipt corpus and additional date/layout languages; robust worker heartbeat/concurrency at scale; perceptual matching beyond its 1000-receipt search window; retention/orphan cleanup; email recovery delivery and optional FCM; client commercial/discount/refund/settlement/privacy policies; expanded accessibility/text-scale/portal component tests. None of these limitations is presented as completed or production-ready.
