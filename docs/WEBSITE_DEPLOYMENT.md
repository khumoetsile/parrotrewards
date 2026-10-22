# Main website and partner portal

- Customer website: `https://parrotrewards.org/`
- Merchant and administrator portal: `https://parrotrewards.org/partners/`
- API: `https://api.parrotrewards.org/api`

Published successfully on 22 October 2026 through [GitHub workflow 39772325297](https://github.com/khumoetsile/parrotrewards/actions/runs/39772325297), revision `40d3f7c700ac8b30f9842bc455a4b5ec4e4b25a7`. All 29 Flutter tests and 21 portal tests passed. The live customer welcome/registration screens and partner sign-in screen were checked in the browser. Both version endpoints, portal deep links, renderer assets, HTTPS, and API readiness were verified; internal release paths and environment files are blocked.

The customer website uses the existing Flutter application compiled to JavaScript. Receipt preview and upload use image bytes, so the same implementation works on browsers and mobile. It is a JavaScript web build, not a Dart WebAssembly build; the current secure-storage plugin does not support Dart Wasm. Flutter renderer resources are self-hosted.

The Angular portal builds with base path `/partners/` and a production-only API URL replacement. Development keeps `/api` and the existing local proxy. API calls, receipt images, QR downloads, offer artwork, and artwork uploads all use that production URL. The API's CORS configuration permits `https://parrotrewards.org`.

## Automatic publishing

`.github/workflows/website.yml` runs Flutter tests, builds the customer application using Flutter 3.47.7, runs portal tests, and builds the production portal. Only the resulting public files and deployment helpers enter the artifact; no backend environment or private receipt data is included. Pushes to `main` publish after the build succeeds. Pull requests only verify. The workflow reuses the already-configured GitHub `production` environment and encrypted cPanel SSH secrets.

Static releases are kept in `/home/parrotrewards/apps/parrot-web/releases/COMMIT`. The `current` symlink selects a release. The existing `/home/parrotrewards/public_html` directory, cPanel configuration, and `.well-known` directory are preserved; an internal `_web` symlink maps public requests into the selected static release. Managed rewrite rules redirect HTTP/www to the canonical HTTPS domain and provide separate Flutter and Angular route fallbacks. Direct access to internal release URLs is blocked. HTML and assets revalidate to avoid stale application shells, and Wasm files have the correct media type.

The deployment checks both applications' `version.json`, the main page, and a portal deep link. A failed activation restores the prior release pointer and web-server configuration. Releases and incoming archives are retained for inspection; manage disk retention after confirming that releases are no longer needed.

## Local builds

```powershell
flutter test
flutter build web --release --no-web-resources-cdn --dart-define=API_URL=https://api.parrotrewards.org/api
cd portals/merchant-admin
npm ci
npm test
npm run build -- --configuration production --base-href /partners/
```

Outputs are `build/web` and `portals/merchant-admin/dist/portal/browser`. The deployment script and rewrite configuration are in `deploy/web`.

No demo users or offers are added to the production database. Real administrator access must be provisioned separately before staff can create and publish offers. Customer registration remains available in the customer website.
