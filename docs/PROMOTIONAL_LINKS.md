# Parrot Rewards promotional links

## Working local mechanisms

API landing pages: `/p/bnr-demo`, `/p/gobo-demo`, `/p/discover-demo`. Example `http://localhost:3000/p/bnr-demo?ref=bnr-ticket-demo-share`. Pages identify their offers as DEMO, show available demo pricing, provide an installed-app link and a truthful distribution fallback. They do not pretend an app-store listing exists.

Installed-app custom URI: `parrotrewards://promo/bnr-demo?ref=bnr-ticket-demo-share`. Android manifest and iOS URL types register the custom scheme. Flutter normalizes the URI to `/promo/bnr-demo`, resolves its campaign with the backend, saves pending context in app-local storage, restores an existing session or opens registration, then navigates to the associated offer. Generic campaigns go to Discover. Unknown/disabled campaign/referral identifiers fail validation.

After authentication, `/api/attribution` records a campaign/referral touch against the customer. Claim creation separately validates the campaign's relationship to the offer and persists campaign/referral foreign keys in the saved claim. Entering another offer does not silently assign an unrelated offer campaign.

`ANDROID_DOWNLOAD_URL` and `IOS_DOWNLOAD_URL` are optional HTTPS configuration values. Until confirmed, the page states that distribution is unconfigured. The debug APK can be installed manually for local review. `PROMO_BASE_URL` documents the eventual externally reachable landing origin; the development default is localhost.

## HTTPS App Links / Universal Links — prepared, not verified

Client-controlled domain, production application ID, Android signing fingerprints, Apple team ID/bundle identifier and distribution URLs are not available. No verified-domain or store-install claim is made. Custom URI testing does not prove HTTPS association.

1. Host the landing route on the approved HTTPS domain when deployment is authorized.
2. Android: replace values in `docs/linking/android-app-links.xml.example`, merge the filter into the main activity, and host `assetlinks.json` at the domain's `/.well-known/assetlinks.json`. Use the actual public signing certificate's SHA256 fingerprint and app package ID.
3. iOS: enable Associated Domains using the example entitlements file, then host `apple-app-site-association` at `/.well-known/apple-app-site-association` with the real team ID and bundle ID.
4. Validate JSON content types, HTTPS certificates, domain verification on installed devices, cold/warm starts, existing/new users and store fallbacks. iOS tests require macOS/device access.

Keep links under `/p/*` so Flutter can route both HTTPS paths and custom-scheme promotions. No paid dynamic-link service is introduced.
