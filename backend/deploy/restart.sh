#!/usr/bin/env bash
set -Eeuo pipefail
root=$(realpath -e "$1")
touch "$root/tmp/restart.txt"
# LiteSpeed can retain a detached lsnode process despite Passenger's restart
# marker. Signal only the current user's process for this exact application.
if command -v python3 >/dev/null; then
  python3 - "$root" <<'PY'
import os, signal, subprocess, sys
expected = 'lsnode:' + sys.argv[1].rstrip('/') + '/'
output = subprocess.check_output(['ps', '-u', str(os.getuid()), '-o', 'pid=,args=']).decode()
for line in output.splitlines():
    fields = line.strip().split(None, 1)
    if len(fields) == 2 and fields[1] == expected:
        try:
            os.kill(int(fields[0]), signal.SIGTERM)
        except ProcessLookupError:
            pass
PY
fi
