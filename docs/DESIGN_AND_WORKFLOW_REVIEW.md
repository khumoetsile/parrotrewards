# Parrot Rewards — design and workflow review

## Offer management

- **Create provider from the picker:** type a name in the offer provider selector and choose Create, or use Create provider below it. Enter the business category and description without leaving the offer. Participation confirmation is an explicit checkbox; unapproved provider offers do not appear in customer discovery. Staff accounts remain managed under Purchase records → People.
- A missing business category can also be created while adding a provider. The provider name/description and offer draft remain in place.
- **Duplicate** opens a copy as an unsaved DRAFT with a fresh link name; it does not alter or publish the original.
- **Preview customer offer card** in the editor shows the selected artwork, provider, title, both prices and savings as fields change.

## Category management

Open the Categories tab for Edit and Delete actions, usage counts and the Show removed switch.

Deletion is reversible removal: records remain stored with an archived date. Categories with linked offers/providers require a replacement. Links move within one transaction; prices and historical claim reference/price/terms snapshots are not rewritten. Restoring the category makes it selectable again but does not automatically move those records back. Renaming a category updates the category label for providers linked to its normalized ID. Removed categories cannot receive new offer/provider writes. Removal, restoration and editing are audited.

The implementation uses one additive migration, 202610160003_category_archival, adding MerchantCategory.archivedAt. No tables/records were dropped or reset.

## Visual and interaction decisions

The portal uses forest-green navigation, warm neutral surfaces, consistent type hierarchy, compact table actions and focused edit panels. It retains live search, searchable selectors, keyboard handling, pagination and draft-preserving related-record creation.

The mobile home screen removes the hard-coded festival price promotion and prioritizes finding offers. It adds a compact introduction with My Claims and How it works. Offer cards display their provider; View offer accurately describes opening the detail page. Colours, inputs, typography, cards, filter chips and navigation share a consistent theme. Headers/pagination adapt to smaller screens and larger type. Opaque image-caption backing remains in place.

## Verification and limits

30 API tests (real MySQL and OCR), 26 Flutter widget tests and 17 portal tests pass. API and Angular builds pass; Flutter analyzer is clean. A manual render test uses actual Flutter widgets with fictional data and loaded Material fonts, producing Parrot-home-design.png and Parrot-offer-design.png. It also checks layout at 320 x 720 with 1.5x text. These are rendered review artifacts, not emulator screenshots or genuine provider advertisements.

Browser visual/focus inspection of the portal is still blocked by the saved local-site browser permission. No alternate browser, screenshot or indirect browser automation was used. Template compilation and workflow tests are verified; a hands-on browser design review remains outstanding.

Local only: no production deployment, remote push, destructive database operation or paid service. User catalogue edits were preserved. Tests create isolated fictional fixtures; their offers are archived after each run.
