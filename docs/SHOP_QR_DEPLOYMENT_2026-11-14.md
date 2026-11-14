# Shop QR discounts deployment receipt — 14 November 2026

## Live services

- API: https://api.parrotrewards.org — revision `cda6d11bb616e8fa523bd3edd0d9e6ec403c82ac`. [Backend verification and deployment](https://github.com/khumoetsile/parrotrewards/actions/runs/43574209749) succeeded.
- Customer website: https://parrotrewards.org/ — revision `1a9b3e5a2d54c544d9d55f876d78efe3497e0bff`.
- Admin/partner portal: https://parrotrewards.org/partners/ — same website revision. [Website verification and deployment](https://github.com/khumoetsile/parrotrewards/actions/runs/43574810203) succeeded.

Direct live checks confirmed the backend revision and database readiness, both website revision files, and HTTP 200 for the partner login page. An administrator sign-in and provider/branch list request succeeded; the verification session was logged out afterward. The current provider has zero branches. No fictional production branch or offer was created.

The live customer UI shows Scan a shop QR. Its QR-text fallback was exercised with a deliberately unknown code and displayed the API's expected unavailable-code message. Physical camera scanning and valid-shop usage still require a real configured shop.

## Android

- App: Parrot Rewards, package `bw.co.parrotrewards.app`.
- Developer account: Parrot Reward.
- Existing track: Closed Test. Existing countries and testers were preserved; production distribution was not enabled.
- Bundle: `parrot-rewards-0.2.0-2.aab`, version 0.2.0, code 2, min API 24, target API 36.
- SHA-256: `c9235be7ed7d175ea7906cbbe6332d3dc9a2f85812501d8e55bae8dbf51acdae`.
- Release: Parrot Rewards 0.2.0 (2) - shop QR discounts.
- Google accepted the upload. The release was saved and sent for review with 100% rollout to the existing closed-test audience.
- Observed status: **Changes in review**, running quick checks. Managed publishing is off. Approval and tester availability remain Google's next steps; they have not been claimed complete.
- [Publishing overview](https://play.google.com/console/u/0/developers/6394870612991798442/app/4974476014370187212/publishing).

The signed bundle and submission screenshot are saved under the ignored local `build/shop-discounts-release/` directory. No signing secrets or administrator credentials were committed or uploaded with source/artifacts.

## Owner's next setup step

Sign in to the live portal. Open Manage offers, add/edit a discounted item, select its provider and create/select a real branch. Enter the original and reduced prices and conditions, publish, and use Download this shop's QR to print. The branch QR stays the same when its published discounts change.
