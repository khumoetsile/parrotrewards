# Parrot Rewards usability update — 16 October 2026

## Offer creation

Category and provider selectors now support typing, option filtering and keyboard navigation. Open the category selector and choose Create a category, or type a missing name and choose Create followed by that name. An inline form opens within the unfinished offer. Its link name is generated from the category name. Choose Create & select: the category becomes selected and the title, pricing, artwork, conditions and other entered offer details stay intact. Cancel category returns to the same draft. Duplicate or failed creation shows an inline error and keeps the entries for correction.

The offer link name is also generated from the title, while a manually edited link name is respected. Required fields are marked; invalid prices are explained beside the pricing inputs. Offer images retain the strict dimension/size checks and high-contrast artwork captions.

## Search and selection

- All existing portal select controls use the shared searchable selector: category, provider, offer status, discount type, claim/purchase status and row count. It supports mouse, arrows, Enter, Escape, empty results and selected-state indicators. Popovers use the browser top layer so scrolling tables and offer dialogs cannot clip the option list.
- Offer, claim and category lists search while typing after a short 250 ms pause, with clear-search actions and page reset. Filters apply immediately. Newer requests take priority; late results cannot replace current ones.
- Purchases, shops/branches, merchants, people, disputes and audit lists also search while typing. These searches are applied before server pagination (merchant self-service branch search filters the staff-visible business list).
- Mobile discovery, participating shops, My Claims and purchase history search automatically after a short 300 ms pause. Clear search works immediately, and pending callbacks are cancelled when the search widget is disposed.
- Mobile categories and claim/purchase statuses have searchable sheets. Shop categories come from approved participating businesses rather than a hard-coded sample list.
- Overlapping portal requests share one session refresh, avoiding accidental sign-outs when multiple searches encounter an expired access token.

## Validation

29 backend tests passed, including real MySQL/OCR, admin-only category creation, duplicate-category handling and scoped search results. 26 Flutter widget tests passed, including live queries, selector search, timer cancellation, navigation and artwork contrast. 12 portal tests passed, including draft preservation, failed creation, stale-response protection, searchable options and shared session refresh. API/Angular builds and Flutter analyzer passed.

The saved browser permission blocks access to the local portal for browser automation. No browser screenshot or visual sign-off is claimed. Browser layout/focus behavior still needs a hands-on review by someone with access. No production deployment, database reset, remote push or paid service was used. Current catalogue edits and images were retained; regression tests no longer assume the original seed prices are unchanged.
