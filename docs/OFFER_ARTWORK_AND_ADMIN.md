# Offer artwork and administration

Open http://127.0.0.1:4200/admin/offers and sign in with the admin account already supplied in chat.

## Add or edit an offer

1. Choose Offers, then Add offer (or Edit on an existing row).
2. Enter the title, category and provider.
3. Enter Original price (BWP), then Price after discount (BWP). Both must be positive, use up to two decimals, and the discounted price must not exceed the original. The editor previews the amount and percentage saved.
4. Choose an image: exactly **1200 x 750 pixels** (8:5 landscape), JPEG, PNG or WebP, maximum **3 MiB**. Animated files and other formats are rejected. Resize the source yourself before upload; the app does not stretch or crop it. Check the image preview.
5. Enter description and redemption conditions, choose publication status and save. Availability/claim limits are in the expandable settings section. Leave Sample offer selected for unconfirmed examples.

Offers and claims have separate searchable tables. Use category/status filters, rows per page and first/previous/next/last controls. Categories has its own list and Add category action. Verify a claim provides reference lookup and single-use redemption. Purchase records opens merchant, people, branch, audit and receipt tools.

Historical offers whose original price was never supplied show Not supplied. Enter the genuine original price when editing them; do not guess it. Existing claim snapshots are not rewritten.

## Storage and API

Admin upload: POST /api/admin/offer-images, multipart field image, returns imageKey, URL and dimensions. Saving an offer accepts only built-in artwork keys or a valid uploaded key present on the server. Public artwork: GET /api/offer-images/:key, normalized WebP with immutable caching. Uploads use randomized names, strict decoding limits and stripped metadata; receipt storage/access is separate.

Local artwork directory defaults to backend/offer-images (ignored by source control); override with OFFER_IMAGE_DIR. Preserve this directory alongside database backups so saved image keys remain valid. Replacing/removing an image from an offer does not delete old files or rewrite historical records. Abandoned uploads remain in local storage; no automatic destructive cleanup is performed.

Admin offer/claim list responses retain the data array and add meta: total, page, pageSize and totalPages. Offer queries accept search, status, category, page and pageSize (1-100). Claims accept search, status, page and pageSize with existing role scoping. Purchases, merchants, users, disputes and audit lists also include pagination metadata.

Verified: 28 API tests, 20 Flutter tests, 6 portal tests; Flutter analyzer and both web/API builds pass. Browser visual review remains blocked by the saved browser permission for the local portal.
