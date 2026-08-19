#!/usr/bin/env bash
# Does the commit actually build — not the working tree, the commit?
#
# This exists because HEAD was broken three times in one evening in the same way, and every
# check we had said it was fine. A dozen agents were editing this repository at once, so the
# working tree held every file anybody had written, while what got committed held only the
# files somebody remembered to stage. `tsc -b`, `eslint` and `vitest` all run against the
# working tree, so all three were green over a commit that would not load a single page:
# `src/App.tsx` imported a module whose deletion had been committed without it, `analysis.ts`
# imported a file that had never been committed at all, and `EvidenceTrailPanel.tsx` imported
# an export that only existed in an uncommitted edit.
#
# A deletion is the dangerous one. Adding a file and forgetting to stage it breaks loudly the
# moment anybody else checks out; deleting a file and staging only the deletion breaks a tree
# that still has the importer sitting in it, and nothing local ever notices.
#
# So: export the commit to a clean directory, borrow node_modules, and run the real gates
# against *it* rather than against whatever is lying around locally.
#
# It ran only `npm run build` at first, and that was too narrow for the same reason it existed.
# An engineering review found ESLint exiting non-zero on a commit that had already been pushed,
# and a later run found twelve unit tests failing at HEAD — one fixture starved of a prop the
# shell had started reading, one sending a payload the client had stopped sending. Both were
# invisible locally: uncommitted work in the tree made the suite look green, which is precisely
# the failure this script was written for, one layer up.
#
#     scripts/verify-head.sh              # HEAD, all gates
#     scripts/verify-head.sh <ref>        # any commit
#     BOW_VERIFY=build scripts/verify-head.sh   # just the build, when that is all you changed
#
# Exits non-zero if any gate fails. The full run takes about three minutes; `BOW_VERIFY=build`
# takes about one.
set -euo pipefail

REF="${1:-HEAD}"
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

echo "→ exporting $REF ($(git -C "$ROOT" rev-parse --short "$REF")) to a clean tree"
git -C "$ROOT" archive "$REF" | tar -x -C "$OUT"

# Borrowed rather than installed: this is a build check, not a dependency check, and a fresh
# install would take longer than the thing it is guarding.
ln -s "$ROOT/node_modules" "$OUT/node_modules"

cd "$OUT"

# Typecheck and lint before the build, because they say *where* something is wrong; the build
# only says that it is. Tests last, because they are the slowest and the least likely to be
# the thing a broken commit trips on first.
run() {
  echo "→ $1"
  shift
  "$@"
}

run "tsc -b" npx tsc -b
run "eslint" npx eslint .
run "stylelint" npx stylelint "src/**/*.css"
run "npm run build" npm run build

if [ "${BOW_VERIFY:-all}" = "build" ]; then
  echo "✓ $REF builds and lints from a clean checkout (tests skipped: BOW_VERIFY=build)"
  exit 0
fi

run "vitest run" npx vitest run

echo "✓ $REF typechecks, lints, builds and passes its tests from a clean checkout"
