#!/usr/bin/env bash
# The V6 integration gate. One command, run from the repository root.
#
# Every workstream in this gauntlet edits a different part of the tree, so the only thing that
# proves the branch is coherent is running all of it together. This is that run.
#
#   bash gauntlet/v6/verify.sh            # everything
#   bash gauntlet/v6/verify.sh fast       # skip the browser suite
#
# Ports 4173/4180 are used by the browser suite. Nothing else may hold them.
set -uo pipefail
cd "$(dirname "$0")/../.."

OUT="${BOW_VERIFY_OUT:-/tmp/bow-verify}"
mkdir -p "$OUT"
FAST="${1:-}"
FAILED=()

step () {
  local name="$1"; shift
  printf '\n\033[1m== %s\033[0m\n' "$name"
  if "$@" > "$OUT/$name.log" 2>&1; then
    printf '   ok  (%s lines) -> %s\n' "$(wc -l < "$OUT/$name.log")" "$OUT/$name.log"
  else
    printf '   \033[31mFAILED\033[0m -> %s\n' "$OUT/$name.log"
    tail -25 "$OUT/$name.log" | sed 's/^/   | /'
    FAILED+=("$name")
  fi
}

step typecheck npm run typecheck
step lint      npm run lint
step unit      npm test
step build     npm run build
step budget    node scripts/asset-budget.mjs

if [ "$FAST" != "fast" ]; then
  # shellcheck disable=SC1091
  source scripts/browser-env.sh
  step e2e        npx playwright test --project=chromium-1366 --project=chromium-1024
  step reflow     npx playwright test --project=chromium-360
  step zoom       npx playwright test --project=chromium-zoom
fi

printf '\n\033[1m== summary ==\033[0m\n'
if [ ${#FAILED[@]} -eq 0 ]; then
  printf '   all gates green\n'
  exit 0
fi
printf '   \033[31m%d gate(s) failed:\033[0m %s\n' "${#FAILED[@]}" "${FAILED[*]}"
exit 1
