#!/usr/bin/env bash
set -Eeuo pipefail
umask 022
revision=$1
archive=$(realpath -e "$2")
[[ "$revision" =~ ^[a-f0-9]{40}$ ]] || exit 1
root="$HOME/apps/parrot-web"
public="$HOME/public_html"
mkdir -p "$root/releases" "$root/shared"
chmod 700 "$root/shared"
exec 9>"$root/shared/deploy.lock"
flock -n 9 || { echo 'Website deployment already running'; exit 1; }
release="$root/releases/$revision"
[[ ! -e "$release" ]] || { echo 'Release exists; inspect before retrying this commit'; exit 1; }
mkdir "$release"
tar -xzf "$archive" -C "$release"
[[ -f "$release/customer/index.html" && -f "$release/partners/index.html" ]]
python3 - "$release" "$revision" <<'PY'
import json, pathlib, sys
for app in ['customer','partners']:
    (pathlib.Path(sys.argv[1])/app/'version.json').write_text(json.dumps({'revision':sys.argv[2],'app':app}))
PY
if [[ -e "$public/_web" || -L "$public/_web" ]]; then
  [[ -L "$public/_web" && "$(readlink "$public/_web")" == "$root/current" ]] || { echo 'Unexpected _web path; preserving it'; exit 1; }
else
  ln -s "$root/current" "$public/_web"
fi
previous=$(readlink "$root/current" || true)
cp "$public/.htaccess" "$root/shared/htaccess-$revision.before"
python3 - "$public/.htaccess" "$release/htaccess" <<'PY'
import pathlib, re, sys
p=pathlib.Path(sys.argv[1]); original=p.read_text()
original=re.sub(r'# BEGIN PARROT WEB\n.*?# END PARROT WEB\n?', '', original, flags=re.S)
p.write_text(pathlib.Path(sys.argv[2]).read_text()+'\n'+original)
PY
switched=0
rollback() {
  result=$?
  cp "$root/shared/htaccess-$revision.before" "$public/.htaccess"
  if [[ "$switched" == 1 ]]; then
    if [[ -n "$previous" ]]; then
      ln -s "$previous" "$root/current.rollback"
      mv -Tf "$root/current.rollback" "$root/current"
    else
      rm -f "$root/current"
    fi
  fi
  echo 'Website activation failed; previous configuration restored'
  exit "$result"
}
trap rollback ERR
ln -s "$release" "$root/current.next"
mv -Tf "$root/current.next" "$root/current"
switched=1
for app in customer partners; do
  prefix=''
  [[ "$app" != partners ]] || prefix='/partners'
  curl --fail --silent --show-error --retry 3 --retry-delay 2 --max-time 20 "https://parrotrewards.org$prefix/version.json" | \
    python3 -c 'import json,sys; assert json.load(sys.stdin)["revision"] == sys.argv[1]' "$revision"
done
curl --fail --silent --show-error --max-time 20 https://parrotrewards.org/ >/dev/null
curl --fail --silent --show-error --max-time 20 https://parrotrewards.org/partners/login >/dev/null
trap - ERR
echo "Website deployed: $revision"
