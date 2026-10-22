# Parrot Rewards offer and claim API

Success `{data:...}` / error `{error:{code,message}}`; BWP values returned as decimal strings. Lists: page >=1, 20 records/page. Auth via Bearer access token. Existing receipt/auth API remains documented in API.md.

| Endpoint | Method | Access / behavior |
|---|---|---|
| /api/categories | GET | Public; ordered normalized categories |
| /api/offers | GET | Public; published, active, approved-provider offers within optional date window; search/category/page |
| /api/offers/:slug | GET | Public; details, savings, DEMO labels, action, terms/instructions |
| /api/campaigns/:slug?ref=code | GET | Public; validated active campaign/referral, relevant offer or generic discovery |
| /p/:slug?ref=code | GET | Public HTML fallback; installed custom-scheme link and optional HTTPS distribution URLs |
| /api/attribution | POST | Customer; campaignSlug/referralCode, idempotent per-customer touch |
| /api/claims | POST | Customer; offerId, idempotencyKey (16+), optional campaignSlug/referralCode |
| /api/claims | GET | Customer owns only; merchant's provider only; admin all; page |
| /api/claims/:id | GET | Same ownership scope; snapshot, status, expiry, redemption record |
| /api/claims/:id/cancel | POST | Owning customer only; CLAIMED only |
| /api/redemptions/lookup | POST | Assigned merchant/admin; reference |
| /api/redemptions | POST | Assigned merchant/admin; reference, verification note (5+); single atomic transition and one redemption record |
| /api/admin/offers | GET/POST | Admin; catalogue and creation |
| /api/admin/offers/:id | PUT | Admin; full validated offer configuration; claims keep original snapshots |
| /api/admin/categories | POST | Admin; name, slug, optional sortOrder |

Offer configuration: title, slug, description, categoryId, merchantId, discountedPrice, nullable originalPrice, discountType=TICKET/PRICE/PERCENT, terms, status=DRAFT/PUBLISHED/PAUSED/ARCHIVED, isDemo, placeholder imageKey, nullable startsAt/expiresAt, perUserClaimLimit (default 1), nullable totalClaimLimit/claimTtlHours. Price must be positive and precision <=2; original >= discounted; expiry > start when both are set. Unknown commercial values stay null.

Claim status transitions: CLAIMED → REDEEMED (provider validation), EXPIRED (server expiry) or CANCELLED (owner). Terminal claims cannot be redeemed/reopened. Per-user limit counts all historical claims for that offer, including cancelled/expired claims; the prototype default is one, explicitly configurable. Total claim count is not ticket/stock inventory. Eligibility/limits are serialized by an offer row lock; idempotency protects retries. Redemption uses a conditional status update plus a unique redemption constraint inside the same database transaction.

Reference is PR- plus 128 random bits encoded as uppercase hex. It is private to authorized claim access; possession alone cannot redeem it. Claim creation stores price/terms/DEMO snapshots and optional validated campaign/referral FKs. No commission, settlement, payment or ticket is created by a claim.

## Artwork and pagination update (2026-10-16)

POST /api/admin/offer-images accepts an admin-authenticated multipart image: exactly 1200 x 750, single-frame JPEG/PNG/WebP, maximum 3 MiB. Returns imageKey/url/width/height; GET /api/offer-images/:key serves normalized public WebP. All new/edited offers require both positive originalPrice and discountedPrice; discountedPrice cannot exceed originalPrice. Legacy unknown original prices remain unchanged until edited. Uploaded image keys must exist on disk.

Admin offers and claims now return pagination meta alongside the existing data array. pageSize defaults to 20 and allows 1-100; admin offers support search/status/category, claims search/status with existing ownership scope. See OFFER_ARTWORK_AND_ADMIN.md for the admin workflow and image storage rules.
