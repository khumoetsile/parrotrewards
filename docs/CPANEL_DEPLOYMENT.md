# Backend deployment on cPanel

## Inspection and scope

The initial checkout had no Git metadata or CI configuration. It is now connected to `https://github.com/khumoetsile/parrotrewards` on production branch `main`. The workflow covers the backend only, not publishing Flutter or the merchant portal.

## Configured hosting

The production API is `https://api.parrotrewards.org` on cPanel account `parrotrewards`, application root `/home/parrotrewards/apps/parrot`, with CloudLinux Node 22.23.3 and LiteSpeed. Startup is `app.cjs`. Dependencies install successfully in individual release directories using `/opt/alt/alt-nodejs22/root/usr/bin` on PATH. The shared environment, MySQL database/user `parrotrewards_api`, notification mailbox `notifications@parrotrewards.org`, and minute-by-minute locked OCR cron are configured. Production credentials are stored only in `shared/runtime.env` with mode 600; recover/manage them through the hosting account, never Git.

The GitHub `production` environment contains the five encrypted SSH secrets and two application variables listed below, and permits deployments from `main` only. GitHub authenticates using the dedicated deployment key whose public half is authorized in cPanel.

End-to-end GitHub verification and deployment succeeded on 22 October 2026: [workflow run 39771106508](https://github.com/khumoetsile/parrotrewards/actions/runs/39771106508), deploying backend revision `40005a50ef904d8ac0865df573bd829a2a1c89c5`. Subsequent documentation-only commits do not trigger deployment.

The bootstrap pins Prisma to the native engine generated on the host because Passenger and SSH detect OpenSSL differently. Both web and cron set small thread pools: without limits, the 32-core host caused the account to exhaust its process quota during concurrent migration/API/worker activity. Tokio and Rayon use two workers, as does libuv. `restart.sh` handles both Passenger's marker and this application's exact detached LiteSpeed process, without touching other applications. The API subdomain redirects HTTP to HTTPS; the main website is outside this backend deployment.

The backend is `parrot-rewards-api`: Express 5.1, TypeScript 5.9 with NodeNext/ES modules, Prisma/client 6.12, and MySQL. `src/server.ts` builds to `dist/server.js`; `src/worker.ts` builds to `dist/worker.js`. Local commands remain `npm run dev` and `npm run worker`. Production uses Node 22 (22.12 or later), `npm run build`, `npm start`, and `npm run worker:once`. Three committed migrations cover the initial schema, offer claims, and category archival. Local Docker MySQL remains on port 3307; production uses the cPanel database port, normally 3306.

## One-time host setup

1. Ask the host to enable Passenger/Application Manager, Node 22.12+, SSH, cron, `flock`, `timeout`, `tar`, `curl`, and npm. Confirm symlinked releases, per-release `npm ci`, outbound npm/Prisma downloads and Tesseract English model download, and sufficient OCR memory/CPU are permitted. This workflow targets standard Passenger/Application Manager. CloudLinux Node.js Selector may require virtualenv-specific installation rules; have the host confirm per-release node_modules support before using this workflow. A plan with no SSH or unsupported OCR limits cannot run this deployment unchanged.
2. Create `api.example.com`, point DNS to the host and enable a valid HTTPS certificate. Use a dedicated API subdomain at `/`, not a path prefix. Keep application files and shared private receipts outside `public_html` and outside the domain document root. Do not expose the application root as a static directory.
3. Create a MySQL database and user in cPanel and grant that user privileges on that database only (including schema migration privileges). Use the full cPanel-prefixed names. Use a new empty database for first deployment. If importing existing data, preserve `_prisma_migrations` too; an existing schema without migration history needs a reviewed Prisma baseline, not automatic migration resolution. Back up before migrating.
4. Create a directory such as `/home/USERNAME/apps/parrot` with mode 700, plus `shared`, `shared/private-receipts`, `shared/offer-images`, `shared/ocr-cache`, `tmp`, and `releases`. Copy `backend/deploy/app.cjs` to this root. Standard Application Manager defaults to `app.js`: copy it as `app.js` when that is the required default; this outer application root must not have a `type: module` package.json. Releases retain their own ESM package.json. Where configurable, choose `app.cjs` explicitly.
5. Copy `backend/.env.production.example` to `shared/runtime.env`, replace every placeholder, and set mode 600. This host-owned file supplies both Passenger and SSH/cron environments; you do not need to duplicate secrets in GitHub. cPanel's environment UI can set `NODE_ENV=production`; if you use it for other values, remember those override dotenv values and must match the shared file. No `.env` is uploaded by CI.
6. Create `shared/node-env.sh`, mode 600, containing the host's exact activation command, for example `export PATH=/opt/cpanel/ea-nodejs22/bin:$PATH`. For Selector use its provided virtual environment activation command only if the host confirms compatibility. Verify both `node --version` and `npm --version` over SSH. Never store credentials in this script.
7. Copy `backend/deploy/worker.sh` to the application root and make it executable. Configure cron: `* * * * * /bin/bash /home/USERNAME/apps/parrot/worker.sh >> /home/USERNAME/apps/parrot/shared/worker.log 2>&1`. Configure log rotation. One worker only: the file lock spans releases; each run processes jobs for about 45 seconds between jobs, with a five minute hard limit. A terminated job is reclaimed after its existing ten minute lease expires. First OCR use may download English training data; test it on the actual host. Keep receipts and OCR cache accessible to the same account as the API.

### Node.js Application settings

| Setting | Value |
| --- | --- |
| Node version | 22.12+ within Node 22 |
| Mode/environment | Production / `NODE_ENV=production` |
| Application root/path | `/home/USERNAME/apps/parrot` (UI may ask for home-relative `apps/parrot`) |
| Domain / URL | `https://api.example.com`, base URI `/` |
| Startup file | `app.cjs`, or bootstrap copied as default `app.js` |
| Start command if requested | `node app.cjs` (Passenger normally starts it itself) |
| Restart | touch `tmp/restart.txt` under application root |

The first release must exist before Passenger can start successfully. Register the app and run the initial workflow, then verify the URL. Do not click root-level npm installation: dependencies live in release directories and CI installs them there. Deployment updates the bootstrap, worker launcher, and restart helper from the verified release.

## Production environment

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | `mysql://USER:ENCODED_PASSWORD@localhost:3306/DATABASE?connection_limit=5&connect_timeout=10`; URL-encode special credential characters. Tune pool size to the host's limits across Passenger processes and worker. |
| `JWT_SECRET` | Unique random value of at least 32 characters; generate with `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`. |
| `CORS_ORIGINS` | Comma-separated explicit HTTPS merchant portal origins, no trailing slashes or wildcard. Native apps do not require a browser origin. |
| `TRUST_PROXY` | Actual trusted reverse proxy addresses/subnets from your provider, comma separated. Empty disables proxy trust. Do not use unconditional trust; verify client IP rate limiting through Apache. |
| `UPLOAD_DIR`, `OCR_CACHE_DIR`, `OFFER_IMAGE_DIR` | Absolute persistent paths under `shared`; mandatory in production. Receipt files must remain private. |
| `PORT` | Defaults to 3000; preserve the provider's injected value. Passenger controls public routing, not this port. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | Real authenticated mail sender. Current implementation uses implicit TLS; use port 465. Required for usable password recovery. |
| `PROMO_BASE_URL` | Existing example variable; currently not read by the backend. Configure public API/link URLs in the consuming clients as needed. |
| `ANDROID_DOWNLOAD_URL`, `IOS_DOWNLOAD_URL` | Optional approved HTTPS distribution URLs. |

Leave `RUN_DB_TESTS` and `DEMO_PASSWORD` unset in production. No demo seed is run during deployment. Provision your first real administrator through a separately reviewed secure process; customer registration does not grant admin rights.

## GitHub setup

The repository is connected and the initial source files were checked before pushing. Private receipts, environment credentials, native dependencies, OCR cache, and test artifacts are excluded. Ignore rules also cover secret key files, release directories and deployment archives while allowing the sanitized production example. Never upload this entire local folder as an archive. All production credentials were newly generated on the host.

Create a GitHub Environment named `production`. Restrict it to `main`; add required reviewers if desired. Add these environment secrets:

| Secret | Value |
| --- | --- |
| `CPANEL_SSH_HOST` | SSH DNS name, without scheme |
| `CPANEL_SSH_PORT` | Usually `22`, confirm with host |
| `CPANEL_SSH_USER` | Account owning the application |
| `CPANEL_SSH_PRIVATE_KEY` | Dedicated unencrypted deployment key; install its public half in that account's authorized_keys |
| `CPANEL_SSH_KNOWN_HOSTS` | OpenSSH known_hosts entry verified against the provider's fingerprint through a trusted channel; include `[host]:port` for nonstandard ports |

Add environment variables `CPANEL_APP_ROOT=/home/USERNAME/apps/parrot` and `CPANEL_HEALTH_URL=https://api.example.com` (no trailing slash). The workflow validates a conventional `/home/...` path and a hostname-only HTTPS URL. Adapt validation deliberately for hosts with other home paths. Production DB/SMTP/JWT secrets remain on the host only. The deploy account needs write access to application files and DB migration rights via its environment; use a dedicated account/key and avoid unrelated hosting access where your provider permits it.

## Pipeline and commands

PRs run MySQL 8 migration validation, Prisma generation, the fictional offer catalogue seed required by the existing claims tests, TypeScript build and all tests, including opt-in MySQL/OCR integration tests against disposable `pula_mvp_test`. The seed runs only in this disposable CI database. Pushes to `main` and manual runs on `main` additionally deploy after verification. Other manual branches only verify. GitHub never needs production database access.

The artifact contains only `package.json`, the lockfile, `tsconfig.json`, `src`, `prisma`, and `deploy`. Over pinned SSH, the workflow sends the artifact and executes `deploy/deploy.sh`. On the host it runs:

```sh
npm ci --include=dev
npm run db:validate
npm run db:generate
npm run build
npm run db:migrate
```

Dev dependencies are intentionally retained per release for the pinned Prisma CLI. Prisma engines and Sharp install on the target Linux host, not Windows or the GitHub runner. `migrate deploy` applies committed migrations; generation is separate. Never run `migrate dev`, `db push`, reset, or demo seeds on production. New migrations must support the previous application version because it can still run until Passenger restarts and while workers finish. Review the existing offer migration and backups carefully before applying it to a populated database.

The release switches via `current` only after build and migrations pass. A restart is requested, then `/health` must return the deployed commit revision and `/ready` must confirm MySQL. Failed post-switch checks restore the previous code symlink and request another restart; database changes are never automatically reversed. First-deploy failure leaves no active release. Validate recovery manually; automatic rollback health is not verified. Failed pre-switch releases remain for inspection. Retrying the same commit requires inspecting/removing or renaming its failed release directory first. Re-running a successful commit is intentionally refused.

For a manual first deployment, create the same source-only archive in `backend`, upload it to the root, and run `bash deploy.sh ROOT FULL_40_CHARACTER_COMMIT_SHA ARCHIVE HTTPS_BASE_URL`. Use a real committed revision after connecting Git. The deploy lock prevents simultaneous activation. Do not automatically delete releases; retain a known working one and remove old releases/archives only after checking they are neither `current` nor in use by a worker.

## Local validation completed

Validated Prisma schema and generated client, compiled TypeScript, and applied all three migrations to a new disposable Docker MySQL 8 database. All 34 tests passed with database integration enabled, including real Tesseract OCR and the added health/readiness regression test. The existing claims suite requires the fictional offer catalogue seed; CI prepares that fixture. The disposable database container was removed afterward. Shell syntax, bootstrap JavaScript syntax, workflow YAML and package JSON were checked. Local execution used Node 24.18; GitHub verification also passed on Node 22.

On the production host, npm installation, Prisma generation, all three migrations, and compilation succeeded. HTTPS health and database readiness pass; HTTP redirects to HTTPS, environment paths are inaccessible publicly, and unauthenticated admin access is rejected. Authenticated SMTP/TLS verification and actual OCR model loading/recognition passed without sending email or adding fictional production records. The locked cron worker ran successfully after fixing the host's OpenSSL detection and thread limits. A compressed baseline database backup is stored privately in `shared/backups`; scheduled off-site backups and restore testing remain the owner's responsibility.

## Verification and recovery

Check `GET /health` (200, service/status/revision), `GET /ready` (200 or sanitized 503), password recovery mail, authenticated upload access, public offer artwork, and a complete receipt OCR flow. Check Apache's proxy/client-IP behavior and host resource quotas. Monitor queued/failed ReceiptJobs separately: API readiness does not prove cron or OCR is working. Take scheduled backups of MySQL and shared receipts/artwork, test restore, and rotate worker logs.

For manual code rollback under the deployment lock, point `current` to a retained compatible release and run `bash /home/parrotrewards/apps/parrot/restart.sh /home/parrotrewards/apps/parrot`. Database rollback requires a reviewed forward repair or restoring a backup, with downtime/data-loss planning. Local development remains `docker compose up -d`, then the existing backend environment and npm development commands; production paths are only mandatory when `NODE_ENV=production`.

## Connecting the clients

Flutter now defaults to `https://api.parrotrewards.org/api`; publication also passes that URL explicitly. Local mobile development requires an explicit `--dart-define=API_URL=http://10.0.2.2:3000/api` override. The customer website and Angular portal are published at `https://parrotrewards.org/` and `/partners/`; the portal defaults to the hosted API while its explicit Angular development configuration retains the local proxy. See [website deployment](WEBSITE_DEPLOYMENT.md). Creating the first real administrator and distributing native Flutter builds remain follow-up steps; no demo accounts or offers were seeded on the production database.

References: [cPanel Application Manager](https://docs.cpanel.net/cpanel/software/application-manager/), [Node application installation](https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/), [Passenger restart](https://support.cpanel.net/hc/en-us/articles/1500002443862-How-to-restart-an-application-that-s-using-cPanel-s-Application-Manager), [Prisma CLI](https://docs.prisma.io/docs/orm/reference/prisma-cli-reference).
