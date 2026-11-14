# Parrot Rewards 0.2.1 (3) — 14 November 2026

Temporary network, timeout and server failures now preserve saved credentials. Startup offers retry instead of silently signing the customer out. Definitively rejected credentials still clear the session. Concurrent requests share credential renewal and a failed retry reports its actual error.

Scanning a second shop link now clears the previous shop immediately and loads the new branch. Late responses from the first shop cannot replace the current result or open an old item.

Operator: Parrot. Public contact: kmolabi@gmail.com. The app links to a readable public privacy notice and offers a manual deletion-request draft/copy option. Opening the draft does not send it or erase an account. Actual erasure operations, processing targets, retention periods, hosting-provider details and backup expiry remain operator decisions; see PRIVACY_OPERATIONS.md. No production account data was deleted.

## Verified deployment

- Source: `a7e6d5bf40f1efa74acbca1e9bef7982d10f7d08`.
- 48 Flutter tests passed; Flutter analysis clean.
- Website build, customer tests, portal tests and deployment succeeded: https://github.com/khumoetsile/parrotrewards/actions/runs/43585586164
- Live customer and partner revision files match the source. API health remains healthy on its existing revision.
- https://parrotrewards.org/privacy-policy and https://parrotrewards.org/account-deletion return standalone HTTP 200 pages without authentication. Live welcome UI exposes the privacy link.
- Signed Android bundle: `build/reliability-release/parrot-rewards-0.2.1-3.aab`. Package `bw.co.parrotrewards.app`, minimum API 24, target API 36. Bundletool validation and signature verification succeeded with the existing upload certificate.
- Bundle SHA-256: `a06655821ff97eab2ed1bf204459a10d6941a49adb08d8ab1f8d60a6805ea6da`.
- Google accepted code 3. Release `Parrot Rewards 0.2.1 (3) - reliability fixes` saved with 100% rollout to the existing Closed Test audience and submitted for review. Observed status: **Changes in review**, quick checks running. Managed publishing remains off; approval and tester availability are not yet confirmed.
- Code 2 was already published to selected testers when checked. No production track rollout was enabled.

Screenshots and verification logs are in the ignored local `build/reliability-release/` folder. Signing secrets remain outside these deliverables.

## Remaining physical/operational checks

Retest startup, registration and scanning on physical phones using both mobile data and Wi-Fi. The reported carrier-specific connection problem has no established root cause and is not claimed fixed. Real branch details must be entered in the owner portal before downloading a working branch QR. No fictional production branches were created.
