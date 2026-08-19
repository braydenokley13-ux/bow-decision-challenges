#!/usr/bin/env bash
# Judge 5 reproductions, snapshot 18a818c8c8885e7e0cbdd547c536117dfa3d788c.
# Run against a local file-store instance you start yourself. Nothing here needs the UI.
set -u
API=${API:-http://127.0.0.1:4385/api}

section() { printf '\n=== %s ===\n' "$1"; }

section "1. Key mismatch is reported and then written into (the finding)"
cat <<'NOTE'
  # boot with key K1, make a teacher + class + roster, stop.
  # boot with key K2 against the SAME BOW_CLASS_DIR:
  curl -s $API/health                       # -> storeKey:"mismatch", "Nothing has been deleted"
  curl -s -X POST $API/auth/teacher   ...   # -> 201, overwrites the email pointer
  curl -s -X POST $API/classes -d '{"code":"<the same code>"...}'  # -> 201, overwrites class.json
  # boot with K1 again, exactly as health instructed:
  curl -s $API/health                       # -> ok:true classroomReady:true storeKey:"ok"
  curl -s $API/classes/<code>               # -> 404, gone
  curl -s -X POST $API/auth/teacher/session # -> 401, the teacher is locked out
  # and expiredClassCodes(now + 5y) returns [] for that class: the roster rows holding the
  # children's names are now outside the 120-day sweep forever.
NOTE

section "2. Teacher key travels in the address bar"
echo '  /educator/class/<CODE>?key=<TEACHERKEY> and /educator/class/<CODE>/roster?key=<TEACHERKEY>'
echo '  No route rotates a teacher key; PATCH /classes/:code accepts only { label }.'

section "3. No teacher session revocation, no password change"
for m in DELETE POST; do for p in /auth/teacher/session /auth/teacher/signout /me/signout /auth/teacher/password; do
  printf '  %-6s %-28s -> %s\n' "$m" "$p" "$(curl -s -o /dev/null -w '%{http_code}' -X $m -H 'Content-Type: application/json' -d '{}' $API$p)"
done; done

section "4. Unbounded durable writes from a class code alone (open class)"
cat <<'NOTE'
  C=$(curl -s -X POST $API/classes -d '{"challengeId":"plan-under-pressure"}')   # no auth needed
  # join N times with only a displayName -> N student tokens (measured: 15 in 1.7s)
  # PUT /me/attempt with a 3.4MB payload each -> 65MB on disk in 4.2s. No rate limit on this route.
NOTE

section "5. What HELD (each of these returned 403/404/401)"
cat <<'NOTE'
  teacher B -> class A submissions / roster / claim / delete / rename / signout / erase / reissue
  student 1 -> submission under seat 2; -> /me/runs/<student 2's session>; -> evidence room
  unauthenticated -> submissions POST, evidence room, shareout, feedback
  card for class A presented to class B; teacher key of A presented to B
  token forgery: swapped payload + old sig, "payload." (alg-none shape), empty signature
  X-Forwarded-For rotation with BOW_TRUST_PROXY unset (limiter still counted the socket)
  path traversal in sessionId ("aaaaaaaa/../../../X/class") -> 400 at the door
  200 spent class-code misses, then every correct-code route still answered 200
NOTE
