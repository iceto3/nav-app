#!/usr/bin/env bash
# Deploy to GitHub Pages (iceto3/nav-app, branch main) — refuses to deploy unless lint and the full local test suite pass.
# Then runs the suite against the live site. Never prints credentials (git uses the gh credential helper).
# usage: scripts/deploy.sh ["commit message"]   env: DEPLOY_DIR (git clone, default /tmp/ghnav), SKIP_LIVE=1
set -euo pipefail
cd "$(dirname "$0")/.."
APP_DIR=$PWD
DEPLOY_DIR="${DEPLOY_DIR:-/tmp/ghnav}"
LIVE_URL="https://iceto3.github.io/nav-app/"
VER=$(sed -nE "s/^export const APP_VERSION = '(v[0-9]+)'.*/\1/p" src/config.js)
MSG="${1:-$VER}"

echo "== lint"; npx eslint . || { echo "LINT FAILED – not deploying" >&2; exit 1; }
echo "== tests (local)"; npx playwright test || { echo "TESTS FAILED – not deploying" >&2; exit 1; }

echo "== sync to $DEPLOY_DIR"
[ -d "$DEPLOY_DIR/.git" ] || { echo "no git clone at $DEPLOY_DIR" >&2; exit 1; }
EXCL=(--exclude=.git --exclude=node_modules --exclude=tests/__output__ --exclude=test-results --exclude=playwright-report)
if command -v rsync >/dev/null; then
  rsync -a --delete "${EXCL[@]}" "$APP_DIR"/ "$DEPLOY_DIR"/
else  # portable fallback: mirror via tar (everything except .git is replaced)
  find "$DEPLOY_DIR" -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
  tar -C "$APP_DIR" "${EXCL[@]}" -cf - . | tar -C "$DEPLOY_DIR" -xf -
fi
cd "$DEPLOY_DIR"
[ -f .nojekyll ] || { echo ".nojekyll missing" >&2; exit 1; }
git add -A
if git diff --cached --quiet; then echo "nothing to commit"; else git commit -q -m "$MSG"; fi
echo "== push"; git push -q origin HEAD:main 2>&1 | sed -E 's#//[^@/ ]*@#//***@#g'
COMMIT=$(git rev-parse --short HEAD); echo "pushed $COMMIT"

[ "${SKIP_LIVE:-}" = 1 ] && exit 0
echo "== waiting for GitHub Pages to serve $VER"
for i in $(seq 1 60); do
  if curl -fsS "${LIVE_URL}app.js?cb=$(date +%s%N)" | grep -q "APP_VERSION='$VER'"; then echo "live after ~$((i*10)) s"; break; fi
  sleep 10; [ "$i" = 60 ] && { echo "live site did not update in 10 min" >&2; exit 1; }
done
cd "$APP_DIR"; echo "== tests (live)"; BASE_URL="$LIVE_URL" npx playwright test --grep-invert @local-only
