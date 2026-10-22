# Parrot Rewards — discount discovery and claims prototype

Backend production hosting: see [cPanel deployment and GitHub Actions setup](docs/CPANEL_DEPLOYMENT.md) for application settings, secrets, migrations, OCR cron, and recovery.

Continue the existing Flutter project at `C:\Users\KHUMO\Desktop\Projects\App\flutter_application_1`. Flutter/Dart customer app, Node/Express/TypeScript REST API, MySQL 8/Prisma and one Angular merchant/admin portal. Completed authentication, receipt/OCR/review and provisional commission code is preserved; **Discover Offers and My Claims** are now the primary journey.

## Demonstration catalogue

All four offers are explicit **DEMO records**, not live availability, official branding, partnerships, ticket inventory or admission entitlements:

| Category | Offer | Original price | Discounted price | Savings |
|---|---|---:|---:|---:|
| Music Festivals | BNR Ticket | Unknown | BWP 140 | Not invented |
| Music Festivals | Gobo Motho Ticket | Unknown | BWP 140 | Not invented |
| Hardware | Spade / Shovel | BWP 200 | BWP 100 | BWP 100 / 50% |
| Auto Spares | Demo Brake Pad Set (fictional) | BWP 240 (fictional) | BWP 180 (fictional) | BWP 60 / 25% (fictional) |

Festival dates, venues, official organizers and commercial availability remain unknown/null. Placeholder illustrations are code-generated category art. Claim creation is automatic after eligibility/limits checks; only actual presentation uses provider validation. **A claim is not payment, a purchase, an admission ticket or platform revenue.** There is no checkout or payment gateway.

## Local Windows setup

```powershell
docker compose -p pula-mvp-local up -d
cd backend
npm ci
# Existing ignored .env is preserved. New setup: copy .env.example,
# set a random 32+ character JWT_SECRET and your own DEMO_PASSWORD (12+ chars).
npm run db:generate
npm run db:migrate
npm run db:seed
npm run db:seed:offers
npm run build
npm start
```

The existing dedicated database remains `pula_mvp_dev` on **127.0.0.1:3307**. The Docker project/volume/account names remain unchanged to preserve existing data. Compose uses MySQL 8 and loopback networking. Never run a reset/drop or point migrations/seeds at an unknown database. Seeds add clearly fictional demo records and preserve edits/existing passwords. If Docker is unavailable, use a fresh MySQL 8 `pula_mvp_dev` database and update the ignored URL.

Second terminal, `backend`:

```powershell
npm run worker
```

OCR worker is optional for the offer/claim demonstration. It serves the preserved receipt workflow, so claim creation never waits for OCR, a commission calculation or settlement.

Third terminal, `portals/merchant-admin`:

```powershell
npm ci
npm start
```

Portal: http://127.0.0.1:4200. API: http://localhost:3000/ready. Seeded local logins: `admin@example.test`, `merchant@example.test`, `customer@example.test`. Use the random **DEMO_PASSWORD in ignored backend/.env**, not a default public password. Existing seed accounts keep their old passwords. Browser session tokens remain in memory; refreshing requires signing in again. Mobile uses secure token storage.

Customer, project root:

```powershell
flutter pub get
flutter run -d emulator-5554 --dart-define=API_URL=http://10.0.2.2:3000/api
```

Flutter executable on this machine: `C:\FlutterSDK\flutter\bin\flutter.bat`. Emulator access to the Windows host uses 10.0.2.2. Physical devices need a reachable API_URL. Android debug permits local HTTP; production HTTPS/distribution is unconfigured. iOS source supports the same UI and has camera/photo/custom URL scheme settings; iOS build/Universal Links remain unverified on Windows.

## Client demonstration

1. Open the customer app and register with name, email and password. The privacy notice explains account/claim use and optional campaign attribution; no payment details are collected.
2. Browse Music Festivals, Hardware and Auto Spares. View the exact demo pricing and conditions.
3. Open BNR Ticket or another offer and tap **Claim Ticket Discount / Claim Discount**. MySQL saves an unpredictable unique reference with a price/terms snapshot.
4. Open **My Claims**, copy/present its reference. Status stays CLAIMED until provider validation, expiry or cancellation.
5. In the portal, sign in as the seeded merchant (assigned to the fictional demo provider) or admin. Look up the reference and record **DEMO redemption** once. A repeated or simultaneous redemption is rejected. Unassigned merchants/customer accounts cannot redeem it.
6. Admin manages the central offer catalogue, publication status, category, provider, prices, terms and configurable claim limits/expiry. Merchant administration stays minimal.

Promotional landing example: `http://localhost:3000/p/bnr-demo?ref=bnr-ticket-demo-share`. Installed-app URI: `parrotrewards://promo/bnr-demo?ref=bnr-ticket-demo-share`. New customers register, then reach BNR; existing sessions go directly to the offer. Generic `/p/discover-demo` routes to Discover. Campaign/referral touches and claim attribution are validated and persisted.

`ANDROID_DOWNLOAD_URL` / `IOS_DOWNLOAD_URL` stay empty until approved distribution URLs exist. The landing page states this limitation; use the debug APK for local installation. See docs/PROMOTIONAL_LINKS.md and docs/linking examples for configurable Android App Links/iOS Universal Links. HTTPS domain associations are **not claimed working** without an approved domain/signing/team configuration and device tests.

## Preserved receipt development

Profile → **Receipt verification · future feature** opens the original shop/QR/amount/photo/history flow. The portal header links to the preserved receipt workspace. Real Tesseract OCR, private images, durable queue, duplicate flags, admin review, audit and provisional 10% commission ledger remain available. Only verified receipt purchases enter that ledger; discount claim creation/redemption does not.

Original JWT audience/issuer and receipt QR scheme identifiers stay compatible to preserve existing sessions/printed QR data. They are internal legacy identifiers; the visible app is Parrot Rewards.

## Checks

```powershell
cd backend
npm run db:validate
npm run build
npm test
# With the continuous OCR worker stopped, append fictional QA records only:
$env:RUN_DB_TESTS='1'
npm test
Remove-Item Env:\RUN_DB_TESTS
cd ../portals/merchant-admin
npm run build
npm test
cd ../..
flutter analyze
flutter test
# API must be running for the connected offer test:
flutter test integration_test/offer_flow_test.dart -d emulator-5554 --dart-define=API_URL=http://10.0.2.2:3000/api
flutter build apk --debug
```

The connected offer test exercises promo entry, registration, BNR price, claim creation/history, the other example prices and an authenticated Gobo promotion. The original receipt integration test remains at integration_test/customer_flow_test.dart; generate its local QR config with `npx tsx prisma/qa-config.ts` in backend and run it with `--dart-define-from-file=docs/local-logs/qa-defines.json`, with API/worker running. Both append fictional records and never reset data. Real OCR language data downloads free once into an ignored cache.

Actual verified outcomes and errors are recorded in PROGRESS.md. Assumptions and unconfirmed commercial policy: DECISIONS.md. Contracts: docs/API.md and docs/OFFERS_API.md. Current acceptance evidence: docs/DEMO_ACCEPTANCE.md.

## Limits

No production publishing/push, spending, charges, ticket issuance or commission deduction. App store URLs, verified-domain links, iOS device testing, physical camera/POS/ticketing integration, email recovery delivery, FCM, signed commercial terms and production policies remain unavailable. Offers/claims are a functional local prototype, not a live commercial service.
