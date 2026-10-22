# Pula MVP review handoff — 13 October 2026

Implemented in the existing project:
`C:\Users\KHUMO\Desktop\Projects\App\flutter_application_1`

The starter counter application has been replaced. Original Android/iOS/Windows platform folders were retained. Backend, portal, documentation and scripts live inside the same project. There was no Git repository on arrival; no repository was pushed or published.

## What works and what was checked

- **Flutter customer app:** onboarding/authentication, shop discovery/search/categories/details, QR camera implementation and text alternative, BWP entry, camera/gallery implementation, authenticated receipt upload and idempotent retry, history/details/status polling, in-app notifications, profile/preferences/logout.
- **API/MySQL:** Express/TypeScript, Zod, bcrypt/JWT/refresh rotation, RBAC/ownership, rate limits/logging/errors, private normalized images, 21 Prisma models, initial non-destructive MySQL migration and guarded fictional seed.
- **Receipt review:** actual Tesseract OCR running locally, durable async queue/retries, extracted receipt metadata, exact/similar image and reused-number checks, amount/name/currency/date/confidence/frequency flags, admin-only verification/rejection and audit history.
- **Angular partners:** merchant/admin routes, verified sales/provisional totals, filtered/paged transactions, authenticated images/OCR/flags/history, review/disputes, merchant creation/approval/staff, business/branch editing, printable QR downloads/rotation, offer information, customer activation, dispute resolution, audit/rules/preferences.
- **Financial boundaries:** default 10% commission is configurable. A verified purchase creates a decimal-safe ledger snapshot marked provisional/POLICY_PENDING. No payments, wallet, payable cashback, collection or settlement is enabled.

| Verification | Actual result |
|---|---|
| Backend TypeScript | Build passed |
| Real MySQL/OCR API + domain tests | 14 passed; no failed/skipped |
| Prisma | Schema validated; client generated; initial migration applied; fictional seed successful |
| Angular production | Build passed; 330.65 kB initial bundle |
| Portal role-access test | 1 passed |
| Dependency audits | Backend and portal report zero vulnerabilities |
| Flutter analyzer | No issues found |
| Flutter widget tests | 8 passed, including five async-screen regressions |
| Android connected workflow | 1 passed on emulator-5554 using real API/MySQL/worker |
| Android debug package | Built successfully |
| iOS | Source/permissions configured; plist parses; build unverified on Windows |

The Android integration test registers a fictional customer, resolves QR **text**, enters BWP 123.45, supplies a fictional photo through a controlled picker, uploads through the real mobile UI/API, records a purchase and observes NEEDS_REVIEW after real OCR. It does **not** verify physical camera capture or QR camera decoding. The separate backend suite verifies administrator review and commission reporting.

## Local review

The API, worker, MySQL and Angular development server were started locally. Portal: http://127.0.0.1:4200. API readiness: http://localhost:3000/ready. Local process IDs/logs are recorded in ignored `docs/local-logs`. Use the project README for full setup and launch commands.

Fictional seeded accounts: `admin@example.test`, `merchant@example.test`, `customer@example.test`. Their initial local password is the randomly generated **DEMO_PASSWORD in ignored backend/.env**. It is not printed here or committed. Seed reruns preserve existing passwords. Additional fictional QA accounts/receipts remain for inspection; tests do not reset or delete data.

Typical restart, in separate terminals from the project:

```powershell
docker compose -p pula-mvp-local up -d
cd backend
npm start
# second terminal, backend folder:
npm run worker
# third terminal, portals/merchant-admin folder:
npm start
# customer app, project root:
flutter run -d emulator-5554 --dart-define=API_URL=http://10.0.2.2:3000/api
```

If Flutter is absent from PATH, use `C:\FlutterSDK\flutter\bin\flutter.bat`. Existing local services need not be started again. `scripts/verify.ps1` runs standard builds/analyzer/unit tests. Real DB/OCR integration uses RUN_DB_TESTS=1 with the continuous worker stopped; the Android connected test instead requires the API and worker running. Exact commands are in README.md.

## Limitations and client decisions

Email recovery delivery and FCM lack configuration. Recovery token handling itself is implemented/tested; UI explains delivery is unavailable. In-app notifications work. iOS requires macOS. Browser interaction testing was blocked by declined permission to open the local portal; Angular build/access tests succeeded, but browser flows/visual QA remain unverified.

Before a public pilot: camera/permission/interruption QA, iOS, browser and accessibility testing, additional real receipt formats/languages, stronger worker lease heartbeats/scaling, wider perceptual search (currently newest 1000 receipts), receipt retention/orphan cleanup, production hardening and agreed verification evidence.

Client decisions: discount timing/redemption, rewards/cashback, merchant-specific rates, commission collection/settlement, refunds/reversals, dispute escalation, onboarding/branch permissions and privacy/retention. No unconfirmed financial benefit or settlement is represented as live.

No production deployment, remote push, paid service, database reset or destructive database operation was performed.
