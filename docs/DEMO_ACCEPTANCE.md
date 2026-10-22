# Parrot Rewards revised prototype acceptance

The original receipt MVP is preserved. This document covers the client's revised discount-discovery demo.

| Requirement | Evidence / boundary |
|---|---|
| Name Parrot Rewards | Flutter title/screens, Android label, iOS display name, portal title/header and current docs updated. Internal database/JWT/receipt QR identifiers retained for compatibility. |
| Three prominent categories | Music Festivals, Hardware, Auto Spares seeded in normalized MySQL categories and displayed in customer filters. Extensible category admin endpoint/form. |
| Client example offers | BNR/Gobo BWP 140, original unknown; Spade/Shovel BWP 200 →100, save 100/50%; clearly fictional brake-pad example 240 →180. All DEMO; no invented official dates/venues/partners. API test checks exact examples. |
| Registration → discovery | Existing authentication reused, minimum name/email/password and privacy notice. Generic registration reaches Discover; promo registration reaches its resolved offer. |
| Polished discovery/details | Featured banner, custom placeholder art, search/category chips, price/savings badges, details/conditions, persistent claim action, empty/error/loading states and responsive onboarding. Flutter tests include small display/large text. |
| Real claims/My Claims | Unpredictable reference, snapshot pricing/terms, ownership, timestamps and optional expiry persisted in MySQL. API tests check concurrency/idempotency, limits and private history. |
| Provider validation | Minimal portal lookup/confirm. Customer/unassigned staff cannot redeem; atomic single-use validation, unique record and audit. Repeated/simultaneous requests tested. |
| Claim status | CLAIMED/REDEEMED/EXPIRED/CANCELLED; cancellation and expiry tested, terminal references rejected. |
| Central admin offer management | Validated prices/status/conditions/categories/providers/claim limits; Angular management/verification component. Build and API CRUD tests verify code; browser interactions remain unverified due to prior declined permission. |
| Promotion entry/attribution | Public campaign resolver and landing HTML, custom scheme routes, pending context persisted across auth; customer touches and claim campaign/referral FKs tested. Emulator results tracked in PROGRESS.md. |
| App/Universal Links | Domain-association and entitlements templates provided. Actual HTTPS verification needs approved domain/signing/Apple IDs; unverified. Distribution URLs configurable and absent by default. |
| Financial boundaries | Claim creation/redemption does not issue tickets, process payment, accrue revenue or enter commission ledger. Receipt commission functionality stays provisional/secondary. |
| Preservation | Additive Prisma migration; original users/receipts/transactions counts checked during repair. Authentication, navigation foundation, OCR/queue, receipt review, reports and history preserved; original tests retained. |

Exact final analyzer, test/build and emulator results are recorded in PROGRESS.md. Client commercial policies, real organizer assets/processes, iOS, physical provider/POS integration, recovery delivery and FCM remain unconfirmed/unavailable. No production deploy, remote push, paid service or destructive database operation.
