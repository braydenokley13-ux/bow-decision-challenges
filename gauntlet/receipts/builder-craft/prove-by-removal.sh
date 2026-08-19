#!/usr/bin/env bash
#
# Each of the four fixes, taken back out, with the test that guards it run against the product
# without it.
#
# The precondition is the point. A revert that silently did not apply produces a passing test
# and a false receipt, and that has happened twice in this repository — so every step here
# greps for the text it just wrote and **aborts** if it is not there, before a browser is
# started. A step that cannot prove it changed the file does not get to report anything.
#
#   BOW_E2E_APP_PORT=4403 BOW_API_PORT=4483 \
#   CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
#   bash gauntlet/receipts/builder-craft/prove-by-removal.sh
#
set -u
cd "$(dirname "$0")/../../.." || exit 1

READING=src/design/reading.css
APPCSS=src/design/app.css
JOIN=src/student/Join.tsx
APP=src/App.tsx
BACKUP=$(mktemp -d)
RESULT=0

restore() {
  for f in "$READING" "$APPCSS" "$JOIN" "$APP"; do
    [ -f "$BACKUP/$(basename "$f")" ] && cp "$BACKUP/$(basename "$f")" "$f"
  done
}
trap restore EXIT

for f in "$READING" "$APPCSS" "$JOIN" "$APP"; do cp "$f" "$BACKUP/$(basename "$f")"; done

# A revert that did not happen is the failure this whole script exists to make impossible.
require() {           # require <file> <text that must now be present>
  if ! grep -qF -- "$2" "$1"; then
    echo "ABORT: the revert did not apply — $1 does not contain: $2"
    exit 2
  fi
}
forbid() {            # forbid <file> <text that must now be gone>
  if grep -qF -- "$2" "$1"; then
    echo "ABORT: the revert did not apply — $1 still contains: $2"
    exit 2
  fi
}

run() {               # run <label> <spec> <grep>
  echo
  echo "=== $1 — expecting the guard to FAIL ==="
  if npx playwright test --config=visual/craft.config.ts "$2" -g "$3" > "$BACKUP/out.txt" 2>&1; then
    echo "NOT PROVEN: the guard passed with the fix removed."
    grep -E "passed|failed" "$BACKUP/out.txt" | tail -2
    RESULT=1
  else
    echo "PROVEN: the guard failed with the fix removed."
    grep -E "Error:|painted over|starts at x=|distinct titles|focus is on|no skeleton" "$BACKUP/out.txt" | head -6
  fi
}

# ---------------------------------------------------------------------------
# 1 — the closed reading control goes back to floating over the bottom-left corner.
# ---------------------------------------------------------------------------
python3 - "$READING" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
old = """.reading-tools:not([data-open="true"]) {
  position: static;
  width: max-content;
  max-width: 100%;
}"""
new = """.reading-tools:not([data-open="true"]) {
  position: fixed;
  bottom: var(--gutter);
  left: var(--gutter);
  z-index: 40;
  max-width: min(340px, calc(100vw - (var(--gutter) * 2)));
}"""
assert old in s, "the rule this reverts is not in the file"
open(p, "w").write(s.replace(old, new))
PY
require "$READING" "z-index: 40;"
forbid "$READING" "  position: static;"
run "condition 1 · the reading control back in the corner" visual/occlusion.spec.ts "the season"
restore

# ---------------------------------------------------------------------------
# 2 — the waiting message goes back to a shorthand margin that resets the page spine.
# ---------------------------------------------------------------------------
python3 - "$APPCSS" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
old = ".class-state { margin-block: var(--s-6); color: var(--ink-3); font: var(--t-body-lg); }"
new = ".class-state { margin: var(--s-6) 0; color: var(--ink-3); font: var(--t-body-lg); }"
assert old in s, "the rule this reverts is not in the file"
open(p, "w").write(s.replace(old, new))
PY
require "$APPCSS" ".class-state { margin: var(--s-6) 0;"
forbid "$APPCSS" ".class-state { margin-block: var(--s-6);"
run "condition 3 · the waiting message back outside the page's spine" visual/states.spec.ts "condition 3"
restore

# ---------------------------------------------------------------------------
# 3 — the field stops taking focus when the message about it arrives.
# ---------------------------------------------------------------------------
python3 - "$JOIN" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
old = "  useEffect(() => { if (problem) field.current?.focus(); }, [problem]);"
new = "  // removed to prove the guard: focus no longer moves to the box the message is about."
assert old in s, "the line this reverts is not in the file"
open(p, "w").write(s.replace(old, new))
PY
require "$JOIN" "removed to prove the guard"
forbid "$JOIN" "if (problem) field.current?.focus();"
run "condition 4 · focus left where it was" visual/states.spec.ts "condition 4"
restore

# ---------------------------------------------------------------------------
# 4 — nothing writes document.title after the first paint.
# ---------------------------------------------------------------------------
python3 - "$APP" <<'PY'
import sys
p = sys.argv[1]
s = open(p).read()
old = "    <DocumentTitle />\n"
new = "    {/* removed to prove the guard: nothing writes document.title after the first paint. */}\n"
assert old in s, "the element this reverts is not in the file"
open(p, "w").write(s.replace(old, new))
PY
require "$APP" "removed to prove the guard"
forbid "$APP" "<DocumentTitle />"
run "condition 6 · no route says its own name" visual/states.spec.ts "condition 6"
restore

echo
if [ "$RESULT" = 0 ]; then echo "ALL FOUR PROVEN BY REMOVAL."; else echo "AT LEAST ONE FIX IS NOT PROVEN."; fi
exit "$RESULT"
