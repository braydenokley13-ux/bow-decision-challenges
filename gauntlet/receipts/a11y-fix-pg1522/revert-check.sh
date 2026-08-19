#!/usr/bin/env bash
# Does each pinning test actually fail on the code it was written against?
#
# A test that passes both before and after a fix pins nothing, and the cheapest way to write
# one by accident is to write it after the fix and never look back. So this puts the pre-fix
# source back and runs the tests against it — in an exported copy, because this repository is
# being edited by several agents at once and reverting files in the live tree would clobber
# whatever somebody else has open.
#
# The revert asserts its own precondition. A `git show` that silently writes the wrong content,
# a path that has moved, a marker already absent — any of those produce a revert that did not
# apply, tests that pass, and a fake proof that the fix was needed. Each file therefore names
# a marker that the fix put there and the revert must remove, and the script stops if it is
# still present after the restore.
#
#     gauntlet/receipts/a11y-fix-pg1522/revert-check.sh [fix-commit]
#
# Exits non-zero unless the revert applied *and* the tests failed under it.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
FIX="${1:-HEAD}"
BEFORE="$(git -C "$ROOT" rev-parse "${FIX}^")"
OUT="$(mktemp -d)"
trap 'rm -rf "$OUT"' EXIT

echo "→ fix under test: $(git -C "$ROOT" rev-parse --short "$FIX")   before it: $(git -C "$ROOT" rev-parse --short "$BEFORE")"
git -C "$ROOT" archive "$FIX" | tar -x -C "$OUT"
ln -s "$ROOT/node_modules" "$OUT/node_modules"

# file:marker — the marker is a string the fix introduced, and its absence is what proves the
# older content actually landed on disk.
REVERT=(
  "src/components/primitives/CalculationInput.tsx:useInPlaceArrival"
  "src/components/primitives/RunMenu.tsx:keepWorking"
  "src/stages/StudentChallenge.tsx:floorSettled"
  "src/stages/popup/PopUpScreens.tsx:focusRef"
)
for entry in "${REVERT[@]}"; do
  path="${entry%%:*}"
  marker="${entry##*:}"
  if ! grep -q "$marker" "$OUT/$path"; then
    echo "✗ PRECONDITION: '$marker' is not in $path at the fix commit — this script is checking the wrong thing." >&2
    exit 2
  fi
  git -C "$ROOT" show "$BEFORE:$path" > "$OUT/$path"
  if grep -q "$marker" "$OUT/$path"; then
    echo "✗ PRECONDITION: the revert of $path did not apply — '$marker' is still there." >&2
    exit 2
  fi
  echo "  reverted $path (marker '$marker' gone)"
done

# The hook itself and the tests stay at the fix commit: what is being reverted is the
# behaviour at the call sites, which is what the tests are about.
cd "$OUT"
echo "→ running the pinning tests against the reverted source"
set +e
npx vitest run \
  src/components/primitives/inPlaceArrival.test.tsx \
  src/components/primitives/runMenuFocus.test.tsx \
  src/stages/answerSpeaks.test.tsx 2>&1 | tee "$OUT/reverted.txt"
status=${PIPESTATUS[0]}
set -e

failed="$(grep -Eo 'Tests +[0-9]+ failed' "$OUT/reverted.txt" | grep -Eo '[0-9]+' | head -1 || true)"
echo
if [ "$status" -eq 0 ]; then
  echo "✗ the pinning tests PASSED on the pre-fix code. They pin nothing." >&2
  exit 1
fi
echo "✓ ${failed:-?} pinning tests fail on the pre-fix code, and pass on the fix."
