# Product-wide UX audit — 16 October 2026

## Scope and evidence

Reviewed Flutter routes/auth/discovery/details/claims/account/notifications/receipt capture/history, Angular login/offers/categories/provider/merchant/branch/people/dispute/audit/settings workspaces, Express routes/auth/recovery/publication/claims/OCR and Prisma relations/migrations, plus PROGRESS and DECISIONS. Existing features and user-edited records/images/configuration must remain.

Actual Android baseline: outputs/Android-before-audit.png captured from emulator-5554 via the Android SDK screenshot command, and visually inspected. It shows primary navigation plus an unnecessary browser-like history toolbar; a tall hero; and generated QA categories occupying the discovery area before offers. This is running-app evidence, not a widget mockup.

Portal automation is blocked by a saved permission for http://127.0.0.1:4200. Previous rejection expressly forbids alternate-browser/indirect workarounds. No portal screenshot/visual claim is made. To enable review, change the saved Browser Use permission for this local origin from Block to Allow in Codex's browser/site permission controls, then ask to resume visual review. User-provided portal screenshots support only the screens and states they depict. Browser builds and unit tests are not visual evidence.

Severity: P0 blocks completing a core task; P1 materially harms a main journey; P2 recurring friction/accessibility/scale issue; P3 deferred platform/policy dependency.

| ID | Severity | Evidence / user impact | Decision | Status |
|---|---|---|---|---|
| UX01 | P1 | Actual Android image: QA categories dominate home; API tests use operational development schema | Move integration tests to a separate local test schema/storage; public categories only where discoverable offers exist; limit shortcut chips | Implemented; verification below |
| UX02 | P1 | detail Back uses go('/home'); primary tabs use push; forward toolbar duplicates native patterns | Stateful native tab branches; native Back; retain discovery/search/filter/scroll; remove arbitrary history toolbar per latest brief | Implemented; verification below |
| UX03 | P0 | Recovery screen says mail unconfigured although SMTP works; no token/new-password completion UI | Validated two-step reset flow with visible success/recovery errors and password visibility | Implemented; verification below |
| UX04 | P1 | Provider records lack direct name/category editing and linked-offer navigation | Dedicated provider area, edit/approve/deactivate and links to offers; server-scoped filters | Implemented; verification below |
| UX05 | P1 | Offer Cancel/Close discards edits; navigation/logout can abandon form | Explicit dirty-state guard, discard choice only when changed; retain inline creation data | Implemented; verification below |
| UX06 | P1 | Provider selector preloads every merchant page before usable | Debounced remote option search with paging, selected-option retention; avoid loading entire catalogue | Implemented; remote paging tested |
| UX07 | P2 | Management lists have no user-controlled sort | Server-side safe sorting with stable ID tie-breaks; meaningful status filters | Implemented for offers/providers; other workspaces retain existing order |
| UX08 | P2 | Offers can be status-edited only through full form; archive lacks direct recovery action | Compact publish/pause/archive/restore actions with contextual feedback; reuse audited status transitions | Implemented; API lifecycle tested |
| UX09 | P2 | Original-price validation requires invented originals for unknown ticket prices | Allow unknown original prices as brief permits; never compute savings without original; preserve existing known prices | Implemented; null-original API test passed |
| UX10 | P2 | Generic opaque slogan covers uploaded artwork, despite separate offer body | Keep badges readable but reserve slogans for placeholders; preserve 1200x750 art ratio | Implemented; artwork test and Android photo inspected |
| UX11 | P2 | Claim dates show raw ISO and enum codes; cancellation has lasting claim-limit effect | Friendly localized date/status summaries, explicit cancellation consequences, copy/reference feedback | Implemented; dates/status/cancellation copy; device claim viewed |
| UX12 | P2 | Notifications show only first page, no bulk read or navigation target | Paginated notifications with clear read states and mark-all-read; preserve user scope | Implemented pagination/read-all; private-scope API test; destination links deferred (no target in schema) |
| UX13 | P2 | Login/password fields lack reveal controls and busy guards; some errors non-live | Accessible show/hide, autofill, prevent duplicate submits, inline live errors; portal login purpose-first copy | Implemented; recovery widget flow tested; Android login viewed |
| UX14 | P2 | Profile name has no local validation or unsaved guard; receipt retry can lose context | Validate before save; dirty guard in meaningful edit flows; retain existing receipt idempotency | Implemented account validation/discard guard; receipt retry unchanged |
| UX15 | P2 | Actual home shows offers below tall introductory content and long category list | Compact first-use help, horizontally constrained category shortcuts, useful first offer above fold | Implemented; verification below |
| UX16 | P2 | Some small secondary labels/coloured category text are too pale | Document tokens, stronger secondary contrast, touch targets/focus states and responsive checks | Improved secondary tokens; Android reviewed; portal responsive contrast review blocked |
| UX17 | P2 | Dashboard metrics cached after mutations; shared merchant form fields can leak between records | Refresh affected data after mutations; keyed editing state and clear success/error ownership | Metrics refresh and keyed branch drafts implemented; other legacy edit forms need deeper dirty-state coverage |
| UX18 | P3 | Windows cannot build iOS; signed app/universal links and release domains missing | Preserve iOS routes/assets; document unverified platform work and required configuration | Blocked: macOS/signing/domain |
| UX19 | P1 verification | Portal rendered review blocked by explicit saved-origin policy | User must allow the local origin; no workaround; track screenshot gaps explicitly | Blocked: permission |
| UX20 | P2 verification | Prior artifacts used fictional widget fixtures rather than actual running screens | Capture actual Android home/list/detail/claim/account/auth as permitted; label widget renders separately | Actual Android screenshots captured; final screen evidence below |

## Journeys

A — Add festival offer: contextual category/provider creation exists; remaining risks are slow provider preload, missing dirty guard, original-price ambiguity and status editing. Preview must reflect availability, provider and truthful pricing.

B — Correct category/provider mistake: reversible category replacement exists and is audited. Provider name/category editing and linked-offer access are missing. Deactivation must preserve claims and history.

C — Promotional registration → BNR discount → claim: backend idempotency/scoping work; recovery, friendly claim status and avoiding ticket/payment confusion need review. Do not alter BNR/Gobo BWP140 or shovel BWP200→100 user records.

D — Search → detail → native Back → tab changes: current go-based Back loses prior journey, and repeated pushes accumulate tab pages. Implement native stateful branches and test retained search.

E — Large catalogues: public category chip growth is visibly broken; providers are preloaded; management search/pagination already exists but sorting/option paging are missing. Do not optimize only around four offers.

F — Forgotten password: currently cannot finish from the app despite backend reset endpoint/SMTP. End-to-end completion is a priority.

G — Accidental cancellation/abandoned editing: irreversible business consequences need clear copy; unsaved draft changes need an explicit recovery path without confirmations on untouched forms.

## Verification ledger

Baseline Android screenshot: captured and reviewed. Portal: not visually inspected (saved permission). Before/after Android evidence and functional results will be appended as work completes. No production deploy, paid service, remote push, destructive reset or hard record deletion is authorized.


## Implementation and verified evidence — 17 October 2026

This is a broad implemented milestone, not a claim of complete release readiness. Changed native stateful navigation, recovery completion, customer catalogue hygiene, compact home help, photo overlay treatment, readable claim status/dates, cancellation consequence, account validation/discard protection, paginated updates and user-scoped mark-all-read. Portal additions include provider administration, remote selector paging, stable sorting, offer lifecycle shortcuts and dirty guards. Dashboard metrics now invalidate after mutations and branch drafts are keyed per business. Existing images, edited prices, user identities, claims, SMTP and receipt/OCR data were preserved.

Database integration tests now run against additive local pula_mvp_test and separate test-artifacts receipt/image paths. Operational development data is never reset. Existing historical QA records remain in admin history; public categories require discoverable offers, so empty QA categories no longer flood the app.

Functional evidence: backend 33 checks passed including real OCR, permissions/idempotency, provider editing, reversible lifecycle, unknown originals and private read-all. Portal 21 checks passed including late responses, contextual creation, dirty-discard choice and remote paged options; Angular build passed. Flutter static analysis and final test totals are recorded in PROGRESS after final checks. Native Back/tab retention and account discard restoration have focused tests. Recovery UI completes request/code/password/success against a controlled API fixture; real backend reset-token one-use behaviour is integration tested. No test recovery emails were sent to external recipients.

Running Android evidence is in the chat outputs folder: Android-before-audit.png and Android-*-after-audit.png (home, offer, claims, claim detail, updates, account, login, recovery). These use the existing local customer and current operational API; they are not fictional widget renders. No claims or purchases were created for screenshots. A later compact-home refinement replaces the first capture; final evidence ledger records the latest run. Widget fixture images from earlier turns remain separately labelled design renders.

Remaining: portal desktop/mobile visual review (saved origin Block); real iOS hardware/signing and domain association; dark theme conversion; notification deep targets require schema/event design; legacy merchant/settings row-edit dirty guards and broad responsive/accessibility device matrix need further work. These are not silently represented as completed.

Final refinements: direct Add provider with contextual category creation, provider description truncation/accessibility labels, explicit account sign-out guard, recovery Back fallback, and full localized claim dates including the year. Focused account tests confirm cancelled sign-out leaves the session intact.

Android SDK full-screen capture Android-offer-native.png was visually inspected and confirms the persistent menu beneath the claim action. Integration surface screenshots sometimes omit that lower painted layer; the SDK screenshot and real-router hit testing provide the corresponding evidence. Final screenshot journey passed with the existing local account; 29 Flutter tests and 21 portal tests pass.
