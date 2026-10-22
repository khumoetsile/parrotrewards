# Technical and commercial decisions

- Reuse the original Flutter app and platform folders. Modular monolith API; a single Angular workspace with merchant/admin route guards. Server checks are the security boundary.
- BWP values use Prisma DECIMAL(12,2); arithmetic converts decimal strings to integer thebe with BigInt. Commission rounds half up to one thebe. Rates are immutable snapshots in ledger entries.
- Default provisional rate is 1000 basis points (10%). Ledger entries are created only on VERIFIED. Every entry remains POLICY_PENDING and provisional; there are no received funds, wallet balances, payments or settlement actions.
- Tesseract.js performs real local CPU OCR. English language data is downloaded once into an ignored local cache. OCR never establishes authenticity. All extracted receipts require independent administrator review in this MVP. Merchants do not approve routine purchases.
- Durable MySQL job table, one worker process, conditional claims, retry and crash lease recovery. No Redis or microservices needed. Long jobs exceeding ten minutes and multiple concurrent OCR workers require stronger lease heartbeats before scaling.
- Exact original-image SHA256 and normalized dHash, merchant-scoped receipt number comparison, amount/currency/date/name checks and submission frequency flags. Similarity is a heuristic; duplicate flags do not automatically reject legitimate purchases.
- Uploaded receipts are normalized to JPEG, metadata removed, dimensions bounded; stored outside public routes. Only owner, assigned merchant staff and admin can request images with authentication.
- Tokens: 15-minute signed access tokens, hashed 7-day refresh tokens with atomic rotation and revocation. Browser tokens stay in memory; mobile tokens use platform secure storage. Logout/recovery revoke refresh tokens; existing access tokens expire within 15 minutes.
- Passwords use bcrypt cost 12, require 12+ characters and reject more than 72 UTF-8 bytes to prevent silent bcrypt truncation. Concurrent purchase retries return the already-created purchase only when the request hash matches.
- Recovery endpoints implemented, but outbound email is intentionally unconfigured. Recovery request returns a neutral message; it does not expose or log tokens. Complete recovery delivery remains blocked on a free local delivery adapter or confirmed provider.
- In-app notifications implemented. FCM credentials are absent; push is not enabled.
- Docker MySQL bound to loopback on port 3307, dedicated database pula_mvp_dev. Fictional seed data only, explicit random local password in ignored .env. No reset, drop, remote push or production deploy.
- HTTP access is permitted only in the Android debug manifest. iOS release should use HTTPS; iOS debug network exceptions remain a setup step and iOS cannot be built on Windows.

## Client decisions still needed

Discount timing/redemption, cashback or rewards, merchant-specific commission rules, commission collection and settlement, refunds/reversals, retention and privacy policy, evidence required for independent verification, dispute escalation, merchant onboarding eligibility and who may manage branches. Disabled discount rule configuration represents the pending policy, not a live benefit.

## Revised client focus — Parrot Rewards, 13 October 2026

The unsigned-contract prototype now prioritizes discount discovery and claims in Music Festivals, Hardware and Auto Spares. Receipt/OCR/commission functionality is preserved as a secondary future workspace; no rewrite of authentication or infrastructure. The app name is Parrot Rewards; internal database/container/JWT/receipt-QR identifiers stay compatible.

Four explicit DEMO offers: BNR and Gobo Motho at BWP 140, unknown originals/dates/venues/organizers; Spade/Shovel 200 to 100 (50%); fictional brake pads 240 to 180. Category artwork is a generic placeholder, never official festival branding. Seeds preserve existing edits and do not assert inventory or live availability.

Claims are a saved discount reference, never a purchase, payment, ticket, admission entitlement or revenue. DEMO validation is explicitly labelled in the provider portal. Default prototype limit is one historical claim per customer/offer; optional total limit and expiry are configurable, not inventory. Cancellation/expiry do not restore that lifetime allowance; future commercial policy needs confirmation. Reference uses 128 random bits, access remains authenticated/scoped, redemption is atomic/single-use and audited. Claim prices/terms are snapshots.

Promotional context persists through registration/sign-in and is server validated. Generic campaign goes to Discover; offer campaign goes to its offer. Installed custom URI and local landing route are provided. HTTPS App Links/Universal Links and app-store fallbacks require approved domain/signing/team/distribution configuration and remain unverified. No paid dynamic-link provider.

Registration collects only name/email/password. Privacy notice explains account/claims and optional campaign attribution; signed privacy/retention terms still needed. Claim workflow never waits on OCR or financial settlement. No actual ticketing/POS integration is assumed.

## 2026-10-16 — Shared usability patterns
Use searchable selectors for portal choices; their options are not constrained by the visible table page. Search inputs update results after a short typing pause, retain keyboard focus and apply filters before pagination. Ignore older responses and share authentication refresh across simultaneous requests. Create related categories inside the offer draft rather than navigating away. Preserve existing catalogue edits when testing; isolate fixtures instead of asserting mutable seed values.

## 2026-10-16 — Category lifecycle and design
Category deletion uses reversible archival and explicit replacement of linked records. Restoration restores category availability without silently reversing later relationship edits. A shared active-category row lock protects offer/provider creation against concurrent category removal. Retain historical claim snapshots. Create missing providers/categories within the draft, make participation approval explicit, and duplicate offers into drafts. Use actual widget render checks alongside behaviour tests for design changes; do not claim browser visual verification while local-site permission blocks it.


## 17 October 2026 — product UX audit
- Isolate all database integration fixtures in additive local test schema/storage; never run fixture tests against operational development data.
- Native stateful tab navigation replaces browser history controls; account draft exits require an explicit choice.
- Unknown original prices remain null; no savings are inferred. Offer lifecycle shortcuts remain authenticated/audited and preserve existing claims.
- Provider deactivation replaces deletion; direct edit and linked offers are available in a dedicated admin area.
- Actual Android screenshots and fixture renders are different evidence. Portal saved permission is respected; no alternate-origin/browser workaround.
- Keep light appearance supported; do not advertise unverified dark/iOS or production readiness.
