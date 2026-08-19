#!/usr/bin/env bash
# Commit gauntlet receipts that have finished being written, and push.
#
# A dozen critics write screenshots and transcripts into `gauntlet/receipts/` while they work,
# so this repository is never clean during a gauntlet run. Two things follow, and they pull in
# opposite directions: uncommitted work is lost when the container runs out of memory — which
# has happened twice — and a screenshot staged mid-write is a corrupt file that still looks
# like evidence, which is worse than not having it.
#
# So: age, not wholesale. A path untouched for `SETTLE` seconds is finished; anything still
# moving belongs to whoever is writing it. Source is never staged here — an agent's half-edited
# module is not a receipt, and sweeping it into a commit would strip the reasoning from the
# commit message it deserves.
set -uo pipefail

SETTLE="${SETTLE:-90}"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"

settled() {
  git status --porcelain -- gauntlet/ | awk '{print $NF}' | while read -r path; do
    [ -f "$path" ] || continue
    [ -z "$(find "$path" -newermt "-${SETTLE} seconds" 2>/dev/null)" ] && printf '%s\n' "$path"
  done
}

files="$(settled)"
[ -z "$files" ] && exit 0
count="$(printf '%s\n' "$files" | grep -c .)"

# The index is shared with every other agent in this container, so losing the race is normal
# and removing the lock would corrupt what the winner is writing. Retry; never unlink.
for attempt in 1 2 3 4 5 6; do
  if printf '%s\n' "$files" | xargs -r git add 2>/dev/null \
    && git commit -q -m "Collect ${count} receipts that have finished being written" 2>/dev/null; then
    git push -q origin "$BRANCH" 2>/dev/null || true
    echo "committed ${count} settled receipt files"
    exit 0
  fi
  sleep $((attempt * 3))
done
exit 0
