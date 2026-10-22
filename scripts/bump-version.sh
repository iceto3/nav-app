#!/usr/bin/env bash
# Bump the app version everywhere: src/config.js APP_VERSION, the app.js marker, and every ?v= cache-buster
# (module imports, index.html, editor/index.html). All importers must use the identical ?v= or a module loads twice.
# usage: scripts/bump-version.sh 35
set -euo pipefail
cd "$(dirname "$0")/.."
N="${1:?usage: bump-version.sh <number>}"; [[ "$N" =~ ^[0-9]+$ ]] || { echo "version must be a number" >&2; exit 1; }
sed -i -E "s/APP_VERSION = 'v[0-9]+'/APP_VERSION = 'v$N'/" src/config.js
sed -i -E "s/APP_VERSION='v[0-9]+'/APP_VERSION='v$N'/" app.js
files=$(find src -name '*.js'; echo app.js index.html editor/index.html editor/editor.js)
# shellcheck disable=SC2086
sed -i -E "s/((\.js|\.css)\?v=)[0-9]+/\1$N/g" $files
grep -c "?v=$N" $files | awk -F: '{s+=$2} END {print "cache-busters now v'"$N"':", s}'
node scripts/gen-preload.mjs
