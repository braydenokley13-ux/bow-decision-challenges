#!/usr/bin/env bash
# Regenerate the Pass environment plates from the one authoring master, then
# re-shoot the in-situ judging screenshots. Run from the repo root:
#
#   bash gauntlet/v5/art/pass/regen.sh
#
# bake-art.mjs resolves a bare file path (no query string), so the grade is
# selected by rewriting the master's data-grade attribute into a temp copy.
# In a browser, preview any grade with lane-master.html?grade=early|peak|late.
set -euo pipefail
cd "$(dirname "$0")/../../../.."   # repo root

source scripts/browser-env.sh
PASS=gauntlet/v5/art/pass
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for g in early peak late; do
  sed "s/<html data-grade=\"peak\">/<html data-grade=\"$g\">/" \
    "$PASS/lane-master.html" > "$TMP/lane-$g.html"
  node scripts/bake-art.mjs "$TMP/lane-$g.html" "$PASS/lane-$g.webp" \
    --width 1920 --height 520 --scale 2 --quality 0.82
done

node "$PASS/shoot-insitu.mjs"

echo "--- byte weights ---"
ls -la "$PASS"/lane-*.webp
