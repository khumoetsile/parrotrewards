# Shop QR discounts

Implemented locally on 14 November 2026 for the next Android release, 0.2.0 (version code 2). Production has not been deployed by this change.

## Owner workflow

1. In the admin portal, open **Manage offers → Add discounted item**. Choose/create the provider and category; enter the item name, description, original price and lower price after discount.
2. Under **Where is this item discounted?**, keep **One shop branch** and choose the branch. Use **Add a shop branch** if needed; creating a branch generates its QR automatically. An owner can explicitly choose **All branches of this provider** instead. Existing offers with no branch retain that provider-wide behavior.
3. Set conditions, optional dates and claim limits. Save as **Draft** while preparing it. Publish once provider participation is approved and the branch is active. Merchants and customers cannot create or publish the central discounted-item records.
4. Use **Download this shop's QR to print** in the item editor. One QR serves that branch: changing its published items does not require printing another QR. For multiple discounted items, create or duplicate an item and choose the appropriate branch. Existing item records can be published, paused or archived from the list.
5. Print and display the SVG at the matching branch. Test it on a customer phone before displaying it publicly. Existing legacy `pula://shop/…` codes continue to work in the in-app scanner. Newly downloaded codes use `parrotrewards://shop/…` and the Android app registers that link. These custom links require the app for an external camera scan; they are not app-install or verified HTTPS links.

## Customer workflow

Open **Scan a shop QR** from the welcome screen or **Scan shop QR** from Discover. Scan the code, or paste its QR text if camera access is unavailable. The app displays the branch name/address and its published discounted items, including any explicitly provider-wide items.

Read an item's prices and conditions, sign in/create an account if needed, and save a discount claim. The selected item is retained during sign-in/registration within the running app. Returning signed-in customers can restore their saved session before opening the item. The provider applies the discount and verifies the reference through the existing claim-redemption flow. Scanning alone does not apply a till discount, record payment or validate a receipt. This is a shop QR catalogue, not a POS/inventory integration.

Branch information appears on offer and claim details and on the portal verification screen. Once an offer has claims, its provider and branch cannot be changed: duplicate the offer for a different location. Existing claim prices and conditions remain snapshots. Shop staff permissions remain provider-level, so authorized staff for that provider can verify claims; this change does not introduce separate branch-level staff roles.

## Eligibility and compatibility

Draft/paused/archived, expired, not-yet-started and unapproved-provider offers are hidden. Disabled shops and revoked/rotated codes cannot resolve new scans. A branch cannot be assigned to an unrelated provider. Branch items require a genuine price reduction. No schema migration is needed: the existing Offer.shopId relation is used.

API additions:
- `POST /api/shop-discounts/resolve?page=1` with `{ "token": "<shop code or complete QR text>" }` returns public shop identity, eligible offers, total and pagination (20 per page).
- `GET /api/shop-discounts/:id?page=1&search=…` returns the same published catalogue for an active approved branch.
- `GET /api/admin/providers/:id/shops` is admin-only and returns branch choices without raw QR tokens.
- Admin offer POST/PUT accept nullable `shopId`. Null explicitly means all branches of the selected provider. Existing draft and publication status controls remain.
- Receipt QR resolution also accepts both link formats and excludes unpublished offers; the receipt workflow remains separate.

## Checks and rollout

Flutter tests cover scan-result rendering, an empty catalogue, revoked QR errors and returning to the chosen item after login. Admin tests cover required branch selection, pricing, stale branch lookup responses, existing offer editing and provider creation. Isolated MySQL tests cover owner-only writes, wrong-provider branches, both QR formats, draft/expired/future exclusions, inactive shops/providers, QR rotation, pagination, branch retention on claims and existing claim/redemption regressions. Test data lives in a disposable, separately named MySQL container, never in the production database.

Roll out the backend and admin portal first using the existing deployment process. Then upload the new signed AAB to the existing Play closed-test track and install it from Play. Confirm code 2 is unused in Console; use a higher code if it has already been uploaded. Camera/QR scanning, custom-link launching and customer sign-in should then be tested on physical phones at a shop, including mobile data and Wi-Fi. The previously reported mobile-data connectivity issue is not established as fixed by this feature.

No production offers, providers, accounts, prices or QR tokens have been changed during this implementation. No message or email has been sent for this change.
