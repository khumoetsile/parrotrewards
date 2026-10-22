#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
# Run on the cPanel host: deploy.sh ROOT REVISION ARCHIVE HEALTH_BASE_URL
root=$(realpath -e "$1")
revision=$2
archive=$(realpath -e "$3")
health=$4
[[ "$root" == "$HOME/"* && "$root" != "$HOME" ]] || { echo 'Root must be below your home directory'; exit 1; }
[[ "$revision" =~ ^[a-f0-9]{40}$ && "$health" == https://* ]] || exit 1
[[ -f "$root/shared/runtime.env" && -f "$root/shared/node-env.sh" ]] || { echo 'Missing shared configuration'; exit 1; }
exec 9>"$root/shared/deploy.lock"
flock -n 9 || { echo 'Deployment already running'; exit 1; }
# Trusted, host-owned activation script. Needed for SSH shells as well as cron.
source "$root/shared/node-env.sh"
[[ "$(node -p 'process.versions.node.split(".")[0]')" == 22 ]] || { echo 'Node 22 required'; exit 1; }
mkdir -p "$root/releases" "$root/tmp"
release="$root/releases/$revision"
[[ ! -e "$release" ]] || { echo 'Release already exists; use a new commit or inspect the failed release'; exit 1; }
mkdir "$release"
tar -xzf "$archive" -C "$release"
cd "$release"
export NODE_ENV=production DOTENV_CONFIG_PATH="$root/shared/runtime.env"
# npm needs no database secret; Prisma reads the shared dotenv file for CLI tasks.
ln -s "$root/shared/runtime.env" .env
npm ci --include=dev
npm run db:validate
npm run db:generate
npm run build
# Backup the database before deployment. Migrations must remain backward compatible.
npm run db:migrate
printf '%s\n' "$revision" > REVISION
install -m 644 deploy/app.cjs "$root/app.cjs"
install -m 700 deploy/worker.sh "$root/worker.sh"
install -m 700 deploy/restart.sh "$root/restart.sh"
previous=$(readlink "$root/current" || true)
switched=0
rollback() {
  code=$?
  if [[ "$switched" == 1 ]]; then
    if [[ -n "$previous" ]]; then
      ln -s "$previous" "$root/current.rollback"
      mv -Tf "$root/current.rollback" "$root/current"
    else
      rm -f "$root/current"
    fi
    bash "$root/restart.sh" "$root"
    echo 'Code rolled back. Database migrations were not reversed.'
  fi
  exit "$code"
}
trap rollback ERR
ln -s "$release" "$root/current.next"
mv -Tf "$root/current.next" "$root/current"
switched=1
bash "$root/restart.sh" "$root"
healthy=0
for attempt in {1..30}; do
  if curl --fail --silent --show-error --max-time 10 "$health/health" | \
    EXPECTED_REVISION="$revision" node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{try{process.exit(JSON.parse(s).data.revision===process.env.EXPECTED_REVISION?0:1)}catch{process.exit(1)}})' && \
    curl --fail --silent --show-error --max-time 10 "$health/ready" >/dev/null; then
    healthy=1
    break
  fi
  sleep 2
done
[[ "$healthy" == 1 ]] || { echo 'Release health check failed'; false; }
trap - ERR
echo "Deployed $revision"
