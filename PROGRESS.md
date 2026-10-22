# Parrot Rewards development progress — 13 October 2026

## Workspace inspection

Existing Flutter starter reused at C:\Users\KHUMO\Desktop\Projects\App\flutter_application_1. Original platform folders retained. No Git repository was present. Flutter 3.47.7 / Dart 3.13.5, Node 24.18.0 / npm 11.16.0 verified. Android emulator-5554 online. Docker installed but initially stopped; engine started for a dedicated MySQL 8 container. No existing database was connected to or reset.

## Milestone 1 — foundation and server

Created backend/package.json, tsconfig, config, Prisma schema (21 domain/support models), .env.example, local compose.yaml, auth/domain/transaction modules, Express API, OCR interface, durable worker, fictional seed and domain tests. Local JWT/seed secrets generated in ignored backend/.env. Added Flutter and Angular foundations and platform camera permissions.

Verified: Prisma client generation, TypeScript build, four domain tests. Initial audit found eight high vulnerabilities; upgraded upload/rate-limit/image dependencies and pinned compatible Prisma 6.12.0; subsequent backend install audit reports zero vulnerabilities. Initial migration generated from MySQL schema and deployment initiated to dedicated pula_mvp_dev. No reset command used.

## Milestone 2 — connected interfaces

Flutter screens: splash, welcome, registration/login, recovery limitation notice, search/categories/shop details, QR camera or text resolution, amount entry, photo capture/gallery/upload, idempotent retry, transaction history/details/status polling, notifications/profile/settings/logout. Secure token storage, Riverpod state, GoRouter, Dio refresh, loading/empty/error states.

Angular portal: guarded admin/merchant routes, login/logout, verified sales and provisional commission totals, transaction filtering/pagination, authenticated receipt viewing, OCR/flags/history, admin verification/rejection, merchant disputes, merchant creation/approval, merchant staff creation, branch creation, printable QR SVG download/rotation, people activation, dispute resolution, audit, commission and receipt-age rules, account preferences.

Verified so far: first Flutter widget run passed three tests. Initial Angular dependency resolution failed due to an unpinned compiler-cli peer; all Angular framework packages now aligned to 20.3.33, CLI/build to 20.3.39. A Flutter theme syntax error and analyzer lint were repaired. Full builds/integration tests still in progress.

## Verification commands

flutter --version; adb devices; docker info; node --version; npm --version; npm install; prisma generate; prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script; prisma migrate deploy; npm run db:seed; npm run build; npm test; npm audit; flutter pub get; dart format lib test; flutter analyze; flutter test; flutter build apk --debug.

## Milestone 3 — live MySQL and real OCR validation

MySQL initial migration applied successfully, Prisma schema validated, fictional seed completed. Backend TypeScript build passed. Expanded API/domain suite: **14 tests passed, zero failed/skipped**, including real Tesseract OCR on a synthetic fictional receipt, indexed exact-image/receipt-number duplicates, perceptual similarity flags, ownership isolation, role escalation denial, concurrency/idempotency, administrator verification, provisional ledger/sales totals, audit history, token rotation/revocation, one-use reset and account deactivation. No mocked OCR results.

Angular framework aligned to 20.3.33, CLI/build 20.3.39. Final production build passed (330.65 kB initial bundle); portal access test passed. Merchant profile/branch editing and offer creation added. Both backend and portal npm install/audit checks reported zero vulnerabilities. Flutter analyzer passed with **No issues found**, and three widget tests passed. Android initial build failure was missing NDK; NDK 28.2.13676358 installed from Google's SDK repository, plus SDK Platforms 34/35/36 and CMake 3.22.1 requested by plugins. Debug build retry and Android connected test are in progress.

Local API, OCR worker and Angular development portal started as hidden local processes. IDs and logs are in ignored docs/local-logs. Browser UI smoke check was rejected because local portal permission was declined; browser testing remains unverified and no alternate browser approach was attempted.

## Milestone 4 — Android connected flow and regression fixes

Android debug APK built successfully after installing the required development packages. The connected emulator workflow passed: fictional customer registration -> shop QR text resolution -> amount entry -> controlled photo-picker fixture -> real authenticated upload -> atomic purchase creation -> real background OCR -> NEEDS_REVIEW displayed on the device. The test ran on emulator-5554 with the actual local API and MySQL, and the separately running worker. Camera hardware was not substituted for a verified claim: the test explicitly uses a fixture picker and QR text.

The device test exposed a real runtime error in five screens: expression-bodied setState callbacks returned Future objects. Replaced them with synchronous block callbacks. Added five loading-screen regression tests; **eight Flutter widget tests now pass**. Analyzer rerun after corrections reports **No issues found**. Test harness failures were also corrected: Windows command-length limit from an oversized binary fixture (receipt now drawn inside the test), and scrolling to lazily built controls (test now identifies the purchase form's scrollable). Final connected test: **one passed, zero failed**, completion in 21 seconds after build/install.

Final aggregate verified checks: 14 backend tests including real MySQL/OCR; 8 Flutter widget tests; 1 Android integration test; 1 portal access test; TypeScript build; Angular production build; Prisma schema/client/migration/seed; Android debug build. Backend and portal dependency audits report zero vulnerabilities. iOS plist parses and contains camera/photo usage keys at the root.

## Remaining priorities

Physical camera/QR, permission denial and interrupted-upload QA; browser interaction tests (blocked by declined permission); iOS build/device testing on macOS; recovery delivery and optional FCM; real-world receipt corpus/languages and broader fraud matching; production worker heartbeats, storage retention and accessibility coverage; finalized commercial/privacy/refund/settlement policies. See docs/ACCEPTANCE.md for evidence and limits. No production readiness is claimed.

## Final launch and deliverables

Final Flutter analyzer: No issues found (5.6 seconds). Normal lib/main.dart rebuilt, installed and launched successfully on the Android emulator with the local API_URL, using flutter run --no-resident (not the test runner). Debug build completed in 25.4 seconds. API readiness returned database=ready. MySQL/API/worker/portal remain running locally; original Flutter emulator app is now Pula. User-facing copies of the handoff/setup/progress/acceptance/decisions documents and normal debug APK are saved in the calling chat's outputs directory. Source, migration, configuration examples, locks and scripts remain in the existing Desktop project.

## External dependencies and limits

No FCM credentials or email delivery provider; no push/recovery delivery claimed. iOS requires macOS for build/device verification. OCR English model needs a free first-time download; it is cached locally. Commission settlement, discounts, refunds and privacy policy pending client decisions. Single-worker queue, bounded 1000-receipt perceptual-similarity scan and limited date/layout parsing require further work before production use. Exact SHA and receipt-number checks query full indexed history. No deployment, remote push, paid services or destructive database operations.


## Revised client update — Parrot Rewards discount/claim demonstration

Read the urgent client update and existing README/DECISIONS/PROGRESS before changes. Continued the original application; authentication, navigation foundation, receipt/OCR/commission and platform folders preserved. Renamed visible app/portal branding and package metadata. Main journey is now offers and My Claims; receipt workflow is a secondary preview.

Added eight Prisma models (29 total): normalized merchant categories, events, products, campaigns, referral links, campaign touches, claims and redemption records. Extended the existing Offer model and nullable provider/shop relationships without deleting records. Initial additive migration failed on MySQL TEXT literal default; corrected nullable terms, completed remaining SQL and marked applied. Counts of existing users/transactions/receipts preserved (16/6/6). Prisma validation, generation and migration status pass; two migrations recorded and database up to date. No reset/drop-table/drop-column used.

Seeded the exact BNR/Gobo P140 and Spade/Shovel P200 to P100 examples plus fictional auto spares. All DEMO. Unknown original festival prices/dates/venues/providers not invented. Claims use 128-bit unpredictable references, immutable price/terms snapshots, scoped access, transaction-serialized eligibility/limits, idempotency and atomic single-use redemption. No payment, admission ticket, commission entry or revenue created by claims.

Flutter: new offers/models/widgets/discovery/detail/promotion and claims/screens feature files, personalized discovery, category/search/filter cards, price/savings/DEMO labels, sticky claim action, terms/instructions, private My Claims/details/statuses, secure pending campaign context, privacy notice and promo-aware auth navigation. Added responsive scrollable welcome after an initial small-screen overflow. Test fixture initially used an unavailable TestFlutterView method; corrected to the SDK-supported physicalSize property. Initial device test tapped during a route transition; scoped scrolling and settling corrected; sticky action improves the actual interface.

Angular: new OffersWorkspace component, central offer/category forms and guarded admin route, minimal merchant reference lookup/DEMO redemption, old purchase workspace retained, account routing updated, timezone-safe date helpers/test. Build 347.14 kB; 2 portal tests pass. Backend TypeScript build and 23 MySQL/OCR/API/domain tests pass (zero failed/skipped). Flutter analyzer clean and 12 widget tests pass; final targeted offer widgets rerun (4 pass) after final text/branding changes. BNR promo registration/claim/history/other example prices/authenticated Gobo journey passes on Android (13 seconds). Original receipt/OCR device test passes again (20 seconds).

Normal main.dart debug APK rebuilt (20.7 seconds), installed and launched on emulator-5554. API readiness database=ready; local API/worker/portal/MySQL remain running. Promotional landing resolver/HTML and attribution verified in API tests; scheme and routing configured on Android/iOS. OS-level promotional URI launch command rejected by automatic approval review (blocked by policy), so it remains unverified. Prior declined local browser permission still applies; no browser workaround attempted. HTTPS app/universal links/distribution need approved domain/signing/Apple/store values and remain unverified.

Commands: prisma validate/generate/migrate diff/migrate deploy, guarded partial additive migration completion and prisma migrate resolve --applied, prisma migrate status, tsx seed-offers.ts, npm run build/test (RUN_DB_TESTS=1 for real DB/OCR), dart format/fix, flutter analyze/test, both Android integration tests, flutter run --no-resident. One analyzer invocation accidentally targeted the scratch chat directory; rerun in the actual project and final analyzer reports No issues found.

Docs: revised README/DECISIONS, OFFERS_API, PROMOTIONAL_LINKS, DEMO_ACCEPTANCE, PARROT_HANDOFF, domain-association templates. Deliverable: outputs/Parrot-Rewards-debug.apk and revised review/setup/progress/decision/acceptance/linking documents. Older Pula-labelled APK belongs to the earlier receipt prototype and is superseded by this Parrot Rewards build.

Next: approved assets/domains/distribution and actual provider redemption rules; iOS/OS-level links/browser/camera accessibility/device QA; signed commercial/privacy/retention policy; production hardening. No publishing, remote push, paid service or destructive database operation.

## Local demonstration launch — 16 October 2026

Opened the Flutter project in Android Studio and started Docker/MySQL, API, OCR worker and portal. Emulator saved startup stayed offline; restarted only the spawned development emulator with -no-snapshot-load, preserving user data. Boot completed and emulator-5554 became online. A fresh Gradle build was slow, so stopped only that Flutter launch request and launched the previously verified Parrot-Rewards-debug.apk through flutter run --use-application-binary. APK installed and normal Flutter engine launched successfully. Android Studio window title confirms flutter_application_1 is open. Windows window capture repeatedly timed out; no visual screenshot verification claimed. No application code or database contents changed for this launch.

## 2026-10-16 — Customer wording and provider verification
Removed broad demo/prototype wording from onboarding, discovery, profile, claim screens, promotional pages and partner portal. Sample badges now depend on the offer flag (previously artwork showed DEMO even for confirmed offers). Unconfirmed seed offers remain clearly labelled; stored claim terms are preserved. Provider verification uses the merchant portal: look up the customer's reference, check offer/status/expiry, and confirm redemption with a note. Provider scope, expiry and atomic single-use enforcement remain in place.
Verified: Flutter analyzer clean; all 15 Flutter tests passed; API TypeScript and Angular production builds passed; 2 Angular tests passed. Fresh debug APK installed and launched on emulator-5554. Local API and OCR worker restarted with updated wording. No production deployment or database changes.

## 2026-10-16 — Outbound email
Configured authenticated SMTP over TLS at mail.khumo.co.bw:465, using the Parrot Rewards mailbox as the sender. Password stored only in ignored backend/.env; example contains no password. Shared email service added and password recovery now sends a single-use token valid for 30 minutes. Failed delivery invalidates that token; account existence and mail errors are not disclosed in the response. SMTP connection/authentication verified without sending a message. TypeScript build passed; 5 unit tests passed including mocked outbound-mail configuration (2 database integration suites skipped). API/worker restarted. No email campaigns or production deployment performed.

## 2026-10-16 — Navigation and admin access
Moved customer navigation into a shared authenticated route shell: Discover, My Claims, Updates and Account stay visible on offer/claim detail and receipt pages. Removed duplicate page navigation. Added explicit Back/Forward controls and a purchase-history shortcut under Account. Refined menu spacing and selected indicators. Partner portal header stays visible while scrolling with active destination styling and explicit Manage offers wording. Verified local admin authentication and protected offer-management API access; admin page HTTP 200 and requested opening in Codex browser panel. Flutter analyzer clean, 16 widget tests passed including persistent menu/back/forward regression; Angular build and 2 tests passed. Local deployment only.

## 2026-10-16 — Offer pricing, artwork and compact administration

- Offer editor requires original BWP price first and price after discount second, validates positive decimal amounts and prevents a price increase being presented as a discount. Savings preview uses integer cents. The API enforces both prices on create/update. Existing historical offers without known original prices are preserved and displayed as Not supplied rather than inventing values.
- Flutter offer cards and details explicitly label both prices in the same order; artwork uses a fixed 8:5 aspect ratio. Uploaded images are fetched from the API with an accessible image-failure fallback. Confirmed offer details no longer inherit the sample-only warning.
- Admin image upload accepts only single-frame JPEG/PNG/WebP, exactly 1200 x 750 pixels and at most 3 MiB. Browser preflight plus authoritative server decoding/dimension checks; re-encoded WebP strips metadata. Only admins upload. Random file names are stored outside receipt storage. Public offer artwork is intentionally public; receipts remain private. No schema migration required; existing imageKey holds the generated file key.
- Offer workspace rebuilt with separate Offers, Claims, Categories and Verify a claim areas; search/status/category filters, compact thumbnail tables, exact totals, first/previous/next/last paging and 10/20/50 row sizes. Offer/category forms open as focused dialogs with keyboard focus trapping and return focus on close. Advanced offer settings collapse.
- Merchant, people, disputes, audit and branch areas now use compact tables and collapsed creation/edit forms. Server counts and stable ordering support pagination for offers, claims, purchases, merchants, users, disputes and audit. Category pagination is local over the public category list. Admin branch management now lists the providers accessible to admins rather than requiring merchant staff assignment.
- Verified: API TypeScript build; 28 backend tests including real MySQL/OCR, multipart upload and filtered pagination; Flutter analyzer clean and 20 widget tests including small phone/large text and fixed aspect ratio; Angular production build and 6 tests including workspace pagination and saved price/image payload. Fresh Android debug APK built, installed and launched on emulator-5554. API/worker restarted; portal watcher rebuilt successfully.
- Visual browser inspection is blocked by the saved browser permission for http://127.0.0.1:4200. No alternate browser or screenshot workaround attempted. Automated builds, API integration and widget tests are verified; final browser visual review remains outstanding.
- No production deployment, remote push, database reset or paid services. Integration tests add isolated fictional QA records and image fixtures to the local development database/storage.

## 2026-10-16 — Readable text over uploaded artwork
Corrected offer artwork layering so uploaded photos cannot cover the caption. Artwork captions now use white text on an opaque dark-green panel, independent of photo brightness/complexity; sample badge retains opaque white backing and dark-green text. Shared artwork applies to cards and offer details. Added regression coverage for layer order and opaque caption contrast above 7:1. Flutter analyzer clean; all 22 widget tests passed. Android debug rebuild/relaunch requested; no backend or database changes.
Fresh contrast-update APK built, installed and launched on emulator-5554; downloadable debug APK and checksum updated.

## 2026-10-16 — Search, selectors and in-context creation
Replaced every existing native portal select with a shared searchable ControlValueAccessor (required validation, numeric values, selected state, keyboard support, empty states and native top-layer popovers to avoid clipping). Category creation is available directly from the offer category picker and as an inline action, with generated link names, auto-selection, duplicate handling and draft preservation. Offer link names auto-generate until manually edited. Required fields and price errors are clearer.

Added debounced live search/clear actions across offer, claim, category, merchant, people, branch, purchase, dispute and audit lists; status/category filters apply immediately and reset pagination. API searches filter before counts/pagination and preserve access scopes. Category lists are local; merchant staff branch search operates over their own visible businesses. Stale responses are ignored, timers/listeners cleaned up, and concurrent token refresh is shared to prevent sign-outs from parallel search requests.

Flutter now uses reusable live search for offers, shops, My Claims and purchase history, plus searchable category/status sheets. Shop categories load from approved participating businesses. Search controls on personal lists remain outside asynchronous result sections, preserving focus. Existing navigation and image contrast are retained.

Verified: 29 backend tests with real MySQL/OCR; 26 Flutter widget tests; 12 portal tests; API and Angular builds passed; Flutter analyzer clean. Updated API/worker restarted. Android build/install in progress. Existing user pricing edits were preserved; integration tests use isolated claim fixtures and no longer assume seed original prices remain null. No destructive database operations, production deployment, remote pushes or paid services.

Visual browser inspection remains blocked by the saved local-portal browser permission; no alternate browser or UI automation workaround attempted. Native popover placement/focus needs hands-on browser review; automated logic, template compilation and mobile widget checks are verified.
Final Android debug APK built, installed and launched successfully; APK/checksum updated. Integration fixtures are archived after each run without deleting records.

## 2026-10-16 — Proactive design and management review
Implemented provider creation from the offer picker, including nested category creation without losing provider/offer entries, explicit participation approval and duplicate-name feedback. Added category edit/delete/restore with usage counts and a searchable replacement selector for linked offers/providers. Deletion is reversible archival; relationships move atomically and claim price/terms/reference snapshots remain intact. Active-category row locks serialize related writes; category rename updates linked provider labels. New additive category_archival migration applied to the local development database, with no resets or dropped records.

Added unsaved draft duplication and a live customer-card preview. Refined the portal visual system (forest header, warm paper surfaces, typography, selected tabs, table actions and modal hierarchy). Revised the mobile theme and home layout, removed hard-coded promotional pricing, added My Claims/How it works entry points and provider names on cards, and corrected card action copy to View offer. Removed the inactive Explore affordance. Header and pagination adapt to narrow screens/large text.

Verified: 30 backend tests with real MySQL/OCR; 26 Flutter tests; 17 portal tests; API/Angular builds passed; Flutter analyzer clean. Additional manual real-widget render check passes at 390x844 and 320x720 with 1.5x text; reviewed rendered home/card artifacts with fictional data. API/worker restarted. Android rebuild/install in progress. Portal browser visual inspection remains blocked by saved local-site browser permission, and no workaround was attempted. No production deploy, remote push, paid service or destructive database operation.
Final design/workflow APK built, installed and launched on emulator-5554. Updated debug artifact and checksum saved. API/worker and portal watcher are running with the changes.


## 2026-10-17 — Product-wide UX audit and implemented redesign milestone
Evidence-based audit is in docs/UX_AUDIT.md; design rules and supported appearance are in docs/DESIGN_SYSTEM.md. Existing project, uploaded artwork, user-edited prices, data, SMTP configuration, purchase verification/OCR, claims and provisional commission boundaries are preserved.

Customer: stateful native tabs retain search/scroll/context; Back uses the prior route; tall home promotion reduced to compact help; only discoverable categories enter customer shortcuts (maximum five). Uploaded photos keep readable badges and do not receive a generic opaque slogan. Account recovery now completes email/code/new-password/success, with local validation, password visibility and busy guards. Claims use friendly statuses/dates and explain cancellation's lasting claim-limit effect before proceeding. Updates have pagination and private mark-all-read. Account preferences validate and protect changes across navigation/sign-out; confirmed discard restores saved values.

Portal/API: dedicated provider area supports add/edit/participation, linked offers and contextual category creation. Offer provider choices use debounced remote paging with selected-value retention. Offers/providers have safe stable sorts and server pagination. Offer publish/pause/archive/restore actions revalidate publication and preserve claims. Offer/provider/category edits have dirty guards. Unknown original prices remain null with no fabricated savings. Dashboard metrics refresh after mutations; branch drafts are keyed to each business.

Integration tests now run in additive local pula_mvp_test and separate receipt/image storage using scripts/test-backend-isolated.mjs. No development data reset, destructive cleanup, production deploy, paid service or remote push.

Verification: backend 33 passed (real local MySQL/Tesseract), portal 21 passed and Angular build passed; Flutter 29 passed, analyzer clean, plus manual fixture render checks at 390x844 and 320x720 with 1.5x text. Focused real-router tests cover reachable primary menu on offer details, account discard restoration and cancelled sign-out. Actual Android screenshot journey uses current API/customer and views existing claims without creating purchases/claims; screenshots cover home/details/claims/claim/account/updates/login/recovery. The screenshot helper can reauthenticate the existing local QA account when reinstall loses its session; an invocation without that credential failed its explicit precondition, then the credentialed run was used. Capture builds are temporary test applications and must be replaced by the normal debug build before handing over an APK.

Remaining verification: portal visual review is blocked by saved Browser Use permission for http://127.0.0.1:4200 (change Block to Allow to enable it; no workaround attempted). iOS build/device/signing/deep links need macOS and release configuration. Dark theme, notification destination links and legacy management/settings dirty-state coverage remain listed in the audit; full release readiness is not claimed.

Final normal lib/main.dart debug APK built, installed and launched successfully on emulator-5554, replacing the temporary screenshot test build. Flutter analyzer is clean. API, portal and local MySQL are listening. The normal build APK/checksum and Android-normal-build-running.png are saved in chat outputs. No capture-only QA credential is included in this normal build. SHA-256: c51ebb1f0d95fb062c8effaab341f605d6957262bdae7d3f3eed6fce7d000f7d


## 2026-10-19 — Run app and presentation mockups
Started the existing Android emulator and launched the installed normal app. Started Docker Desktop and the existing MySQL service without resets; API health is up and public discovery returns four offers. Existing portal listener remains running; its saved browser-origin restriction is respected. Opened the Flutter project in Android Studio. Customer and admin presentation images are design concepts, separate from actual device screenshots; no UI source or operational data was changed for these mockups.
