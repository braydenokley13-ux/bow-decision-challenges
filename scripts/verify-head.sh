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
# So: export the commit to a clean directory, borrow node_modules, and run the real build.
#
#     scripts/verify-head.sh            # HEAD
#     scripts/verify-head.sh <ref>      # any commit
#
# Exits non-zero if the commit does not build. Takes about a minute.
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

echo "→ npm run build"
cd "$OUT"
npm run build
echo "✓ $REF builds from a clean checkout"
