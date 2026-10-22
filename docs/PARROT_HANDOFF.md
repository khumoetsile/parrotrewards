# Parrot Rewards — revised demonstration handoff

13 October 2026. Continued in the original `C:\Users\KHUMO\Desktop\Projects\App\flutter_application_1` project. No regeneration, discarded functionality, database reset, remote push, production publishing or paid service.

## Client demo now available

- Parrot Rewards name in the Flutter app, Android/iOS display settings, Angular portal and current documentation.
- Offer-first onboarding: existing name/email/password authentication with privacy notice; register → Discover, or campaign register → associated offer.
- Prominent Music Festivals, Hardware and Auto Spares categories, search, featured offers, placeholder illustrations, visible original/discounted prices, savings, terms, sticky claim button and loading/empty/error states.
- DEMO BNR Ticket **BWP 140**; DEMO Gobo Motho Ticket **BWP 140**; DEMO Spade / Shovel **BWP 200 →100**, saving **100 /50%**; clearly fictional brake-pad example **240 →180**. Unknown festival original prices/dates/venues/organizers remain null.
- Actual MySQL claims with unpredictable references, immutable price/terms/DEMO snapshots, ownership, optional expiry, limits, idempotent retries, statuses and **My Claims**. No claim is silently marked redeemed.
- Simple merchant/admin reference lookup and explicit single-use validation, central admin offer/category management and audit records. Merchant users do not approve registrations or claim creation.
- Campaign/referral resolver, local HTML landing fallback, installed-app custom-scheme routing and attribution persisted through authentication/claims. Domain/distribution association templates are configurable; unknown production URLs/identities are not invented.
- Original QR/receipt/OCR/admin-review/provisional commission stack remains accessible through the profile preview and portal Purchase records. It is not a dependency of the claim demo.

**Claims are not payments, purchases, admission tickets, live inventory or recognized revenue.** No checkout, actual ticket issuance, commission deduction or settlement. DEMO provider validation is labelled accordingly.

## Verified outcomes

| Check | Result |
|---|---|
| Backend TypeScript | Passed |
| MySQL/OCR/auth + offer/claim API tests | **23 passed**, zero failed/skipped |
| Prisma | Validated/generated; two migrations recorded; schema up to date |
| Flutter analyzer | **No issues found** |
| Flutter widget tests | **12 passed**, including categories/prices/claims and small-screen large-text onboarding |
| Revised Android connected test | **Passed**: BNR campaign → registration → P140 offer → saved claim → My Claims reopening → example prices → authenticated Gobo promotion |
| Preserved Android receipt connected test | **Passed again** after the changes; real API/MySQL/OCR, controlled picker/QR-text fixture |
| Normal Android app | Debug APK built, installed and launched as Parrot Rewards on emulator-5554 |
| Angular production build | Passed, **347.14 kB** initial bundle |
| Portal tests | **2 passed**: role access and timezone-safe offer date editing |
| iOS configuration | Plist parsed; display name, permissions and custom URL types present; device/build unverified |

Backend tests cover exact demo examples and savings, admin CRUD/validation, campaign/referral persistence, concurrent claim retry, user/provider isolation, simultaneous redemption (one 200, one 409), expiry/cancellation, eligibility/caps and no claim-created commission entries. The original real OCR/auth/receipt tests still pass.

The additive migration initially hit MySQL's TEXT-default restriction. It was corrected to a nullable legacy-compatible terms column; remaining additive SQL completed and migration recorded without reverting/removing data. Existing counts were preserved during repair: **16 users, 6 transactions, 6 receipts**. Later tests only appended clearly fictional records.

## Run and review

Local MySQL, API, worker and portal remain running. Portal http://127.0.0.1:4200; API readiness http://localhost:3000/ready. Seed accounts are admin@example.test / merchant@example.test / customer@example.test; their initial random local password is in ignored backend/.env (not printed here). Existing passwords were preserved. Full commands are in README.md / accompanying Setup document.

From project root, Flutter executable is `C:\FlutterSDK\flutter\bin\flutter.bat` if not on PATH:

```powershell
flutter run -d emulator-5554 --dart-define=API_URL=http://10.0.2.2:3000/api
```

Admin sign-in defaults to offer management; merchant sign-in defaults to claim validation. Create a customer claim, copy its reference, look it up in the seeded merchant/admin portal and confirm a DEMO redemption once. The normal app is already installed on the emulator.

Promotional landing example: `http://localhost:3000/p/bnr-demo?ref=bnr-ticket-demo-share`. Installed-app route: `parrotrewards://promo/bnr-demo?ref=bnr-ticket-demo-share`. The device's in-app routing/registration/authenticated campaign journeys are verified. **Automatic approval review blocked the separate OS-level URI launch command by policy**, so OS intent launching is not claimed verified. Previous local browser permission was declined; portal browser interaction/visual testing remains unverified. No alternate browser or device-level workaround was attempted.

## Remaining external configuration and policy

Approved distribution URLs/domain, Android signing associations, Apple team/bundle associations, iOS/macOS testing, real festival assets/provider admission process, signed privacy/retention terms, limits/eligibility/cancellation policy, any payment/commission qualifying/collection mechanism and POS/ticketing integration. Email recovery delivery/FCM remain unconfigured. HTTPS App Links/Universal Links and absent app-store fallbacks are explicitly unverified. Physical camera/provider integration is not represented as complete.

The offer/claim prototype is reviewable locally. Production hardening and commercial launch remain separate work requiring confirmed policy and configuration.
