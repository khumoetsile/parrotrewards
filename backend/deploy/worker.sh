#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
root=$(realpath -e "$(dirname "$0")")
source "$root/shared/node-env.sh"
exec 9>"$root/shared/worker.lock"
flock -n 9 || exit 0
cd "$root/current"
export NODE_ENV=production DOTENV_CONFIG_PATH="$root/shared/runtime.env"
export TOKIO_WORKER_THREADS="${TOKIO_WORKER_THREADS:-2}"
export RAYON_NUM_THREADS="${RAYON_NUM_THREADS:-2}"
export UV_THREADPOOL_SIZE="${UV_THREADPOOL_SIZE:-2}"
export PRISMA_QUERY_ENGINE_LIBRARY
PRISMA_QUERY_ENGINE_LIBRARY=$(find "$PWD/node_modules/.prisma/client" -maxdepth 1 -name 'libquery_engine-*.so.node' -print -quit)
[[ -n "$PRISMA_QUERY_ENGINE_LIBRARY" ]] || { echo 'Missing host-generated Prisma engine'; exit 1; }
# Single worker only; timeout prevents cron overlap after a hung OCR call.
exec timeout --signal=TERM --kill-after=20s 5m node dist/worker.js --once
