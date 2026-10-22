# Parrot Rewards design system

## Purpose and hierarchy
Customer screens lead with discovery, truthful pricing and a saved discount reference. Receipts and purchase history remain in Account. Admin screens lead with searchable records and contextual actions. A discount claim is separate from payment, admission and commission settlement.

## Foundations
Flutter: lib/core/theme.dart. Portal: portals/merchant-admin/src/styles.css. Shared visual family uses forest green text (#173d2d / #183c36), emerald action (#16755d), warm neutral canvas (#f4f6f1 / #f5f7f4), white surfaces, and muted secondary text (#526c59 / #526963). Do not place pale secondary labels on coloured photographs. Recent updates strengthen secondary navigation and input hint colours.

Use a 4/8-pixel spacing rhythm. Mobile content margins 20–24; fields 48+ high; primary buttons 50+. Body copy 14–16; mobile titles 22–34. Administrative tables use compact 12–14 text with clear headers, numeric alignment, short status labels and full-size accessible action targets. Compactness must not remove keyboard focus or actionable labels.

## Navigation
Four labelled persistent customer destinations: Discover, My Claims, Updates, Account. Use a navigation rail at 850+ logical pixels. Tab stacks preserve local search and scroll. Detail Back pops to the previous context; direct entry has a safe section fallback. Avoid browser-style forward/back bars. Account edits and administrative offer/provider/category drafts have discard protection. Untouched forms close immediately.

## Offer cards and imagery
Uploaded artwork must be exactly 1200 × 750, JPEG/PNG/WebP, maximum 3 MB, single nonanimated image. Server validation/re-encoding remains authoritative. Preserve aspect ratio; do not stretch or silently crop. Offer title/pricing live below photographs. The sample metadata badge uses opaque white with dark text; generic slogans appear on placeholder artwork only. White/dark badges are independent of image luminance. No invented original prices: show Not supplied and omit savings when unknown. Known originals use strike-through with a prominent current BWP price and exact monetary savings.

## Forms and selectors
Use labelled fields, sensible input types, autofill and password visibility. Validate locally and on the server. Errors must be actionable and announced. Disable duplicate submissions; retain values after failure. Related category/provider creation stays in the offer context and selects the new record. Search starts while typing; cancel obsolete responses. Provider options load paged remote results, retaining the selected option. Keyboard selectors support focus, arrows, Enter, Escape and visible selected state.

## Tables and lifecycle
Admin offers/providers use server pagination, search, status filters and safe sorting with stable tie-breaks. Category deletion is reversible archiving with explicit reassignment when referenced. Provider deactivation preserves claims/history. Offer archive restores to draft; publication revalidates category/provider/artwork/expiry. Confirm destructive business consequences, not routine navigation. Refresh affected metrics after mutations and scope per-record drafts by record ID.

## Feedback and accessibility
Show loading, recoverable error, empty, filtered-empty, saved and disabled states. Use text with status colour. Keep readable focus indicators, natural focus order, focus trapping/restoration for dialogs and Escape handling. Standard material localisation formats claim dates. Cancellation explains its lasting claim-limit consequence. Screen-reader/live errors and large-text layouts require ongoing device review.

## Supported appearance and verification limits
The current supported theme is light. A dark theme is not advertised: hardcoded content colours need semantic conversion before enabling it. Windows Android emulator screens were captured from the actual app. Portal code/build/tests do not substitute for rendered desktop/mobile portal inspection, which remains blocked by the saved browser-origin permission. iOS requires macOS, Xcode and signing; camera permissions, safe areas and deep links must be checked on real iOS hardware before release.

Provider management also supports direct creation and nested category creation without losing the business draft. Description summaries are limited to two table lines with the full text available in editing.
