#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
root=$(realpath -e "$(dirname "$0")")
source "$root/shared/node-env.sh"
exec 9>"$root/shared/worker.lock"
flock -n 9 || exit 0
cd "$root/current"
export NODE_ENV=production DOTENV_CONFIG_PATH="$root/shared/runtime.env"
# Single worker only; timeout prevents cron overlap after a hung OCR call.
exec timeout --signal=TERM --kill-after=20s 5m node dist/worker.js --once
