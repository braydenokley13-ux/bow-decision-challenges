#!/usr/bin/env bash
# Every fix in this batch, proved by removing it.
#
# The rule this script exists to enforce: a revert that silently did not apply produces a
# passing test and a false receipt, and that has already happened twice in this repository. So
# each revert greps for the rule it is about to remove FIRST and aborts if it is not there, and
# greps again afterwards to prove the removal landed. `restore` puts each file back from a snapshot
# taken before anything was touched, and checks it matches before the next proof starts.
set -uo pipefail
cd "$(dirname "$0")/../../.."
IDENTITY=server/identity.ts
VERCEL='api/[[...route]].ts'
FILES=("$IDENTITY" "$VERCEL")

fail() { echo "ABORT: $*" >&2; exit 1; }

BASELINE=$(mktemp -d)
for f in "${FILES[@]}"; do cp "$f" "$BASELINE/$(basename "$f")"; done

restore() {
  for f in "${FILES[@]}"; do
    cp "$BASELINE/$(basename "$f")" "$f"
    diff -q "$BASELINE/$(basename "$f")" "$f" >/dev/null || fail "restore did not restore $f"
  done
}

trap 'restore; rm -rf "$BASELINE"' EXIT

step() { echo; echo "==================== $* ===================="; }

# --- Condition 5: teacher session revocation --------------------------------
step "C5  remove the sessionGeneration bump from POST /auth/teacher/signout"
grep -q 'const generation = (teacher.sessionGeneration ?? 0) + 1;' "$IDENTITY" || fail "C5 precondition: the bump is not in $IDENTITY"
python3 - "$IDENTITY" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
before = s
marker = '''      const generation = (teacher.sessionGeneration ?? 0) + 1;
      await store.putTeacher({ ...teacher, sessionGeneration: generation });
      return {
        status: 200,
        body: {
          signedOut: true,'''
assert marker in s, "C5: signout body not found"
s = s.replace(marker, '''      return {
        status: 200,
        body: {
          signedOut: true,''', 1)
assert s != before
open(p, "w").write(s)
PY
grep -q 'await store.putTeacher({ ...teacher, sessionGeneration: generation });' "$IDENTITY" && fail "C5 revert did NOT apply"
echo "revert applied. running the test:"
npx vitest run src/platform/identity/teacherSession.test.ts 2>&1 | grep -E '×|Test Files|Tests ' | head -12
restore

step "C5  remove the sessionGeneration bump from POST /auth/teacher/password"
grep -q 'await store.putTeacher({ ...teacher, passwordHash: await hashSecret(next), sessionGeneration: generation });' "$IDENTITY" || fail "C5 precondition: the password bump is not in $IDENTITY"
python3 - "$IDENTITY" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
old = 'await store.putTeacher({ ...teacher, passwordHash: await hashSecret(next), sessionGeneration: generation });'
new = 'await store.putTeacher({ ...teacher, passwordHash: await hashSecret(next) });'
assert old in s
open(p, "w").write(s.replace(old, new, 1))
PY
grep -q 'passwordHash: await hashSecret(next), sessionGeneration: generation' "$IDENTITY" && fail "C5b revert did NOT apply"
echo "revert applied. running the test:"
npx vitest run src/platform/identity/teacherSession.test.ts 2>&1 | grep -E '×|Test Files|Tests ' | head -12
restore

# --- Condition 3: teacher key rotation --------------------------------------
step "C3  remove the POST /classes/:code/key route from the table"
grep -q 'path: "classes/:code/key",' "$IDENTITY" || fail "C3 precondition: the key route is not in $IDENTITY"
python3 - "$IDENTITY" <<'PY'
import sys, re
p = sys.argv[1]; s = open(p).read()
start = s.index('  {\n    method: "POST",\n    path: "classes/:code/key",')
end = s.index('  // -- POST /classes/:code/feedback', start)
open(p, "w").write(s[:start] + s[end:])
PY
grep -q 'path: "classes/:code/key",' "$IDENTITY" && fail "C3 revert did NOT apply"
echo "revert applied. running the test:"
npx vitest run src/platform/identity/classKey.test.ts 2>&1 | grep -E '×|Test Files|Tests ' | head -14
restore

# --- Condition 6: checkpoint rate limit and payload cap ---------------------
step "C6  remove the payload cap from PUT /me/attempt"
grep -q 'if (bytes > MAX_CHECKPOINT_BYTES) {' "$IDENTITY" || fail "C6 precondition: the payload cap is not in $IDENTITY"
python3 - "$IDENTITY" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
start = s.index('      const bytes = checkpointBytes(request.body.payload);')
end = s.index('      const worldId = typeof request.body.worldId', start)
open(p, "w").write(s[:start] + s[end:])
PY
grep -q 'if (bytes > MAX_CHECKPOINT_BYTES) {' "$IDENTITY" && fail "C6 revert did NOT apply"
echo "revert applied. running the test:"
npx vitest run src/platform/identity/checkpointLimits.test.ts 2>&1 | grep -E '×|Test Files|Tests ' | head -12
restore

step "C6  remove the per-student rate limit from PUT /me/attempt"
grep -q 'if (!withinRate(`attempt:${studentId}`, CHECKPOINT_LIMIT, CHECKPOINT_WINDOW_MS, now)) {' "$IDENTITY" || fail "C6 precondition: the checkpoint limit is not in $IDENTITY"
python3 - "$IDENTITY" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
start = s.index('      if (!withinRate(`attempt:${studentId}`, CHECKPOINT_LIMIT, CHECKPOINT_WINDOW_MS, now)) {')
end = s.index('      const bytes = checkpointBytes(request.body.payload);', start)
open(p, "w").write(s[:start] + s[end:])
PY
grep -q 'withinRate(`attempt:${studentId}`' "$IDENTITY" && fail "C6b revert did NOT apply"
echo "revert applied. running the test:"
npx vitest run src/platform/identity/checkpointLimits.test.ts 2>&1 | grep -E '×|Test Files|Tests ' | head -12
restore

# --- Condition 8: the authorisation boundary --------------------------------
step "C8  add back the review's tenth route, exactly as they wrote it"
grep -q 'third === "everything"' "$IDENTITY" && fail "C8 precondition: /everything is already in $IDENTITY"
python3 - "$IDENTITY" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
# Written the way a second engineer would: inside the dispatcher, before it consults the table,
# with no preamble. This is the shape the review used, adapted to where the router now lives.
old = '''  let found: { route: IdentityRoute; params: Record<string, string> } | null = null;'''
new = '''  const [, second, third] = request.segments;
  if (request.method === "GET" && third === "everything") {
    const code = normaliseClassCode(second ?? "");
    const record = await store.getClass(code);
    if (!record) return classMiss();
    return {
      status: 200,
      body: {
        roster: await store.listRoster(code),
        submissions: await store.listSubmissions(code),
        feedback: await store.listFeedback(code),
        teacherKey: record.teacherKey,
      },
    };
  }

  let found: { route: IdentityRoute; params: Record<string, string> } | null = null;'''
assert old in s
open(p, "w").write(s.replace(old, new, 1))
PY
grep -q 'third === "everything"' "$IDENTITY" || fail "C8 revert did NOT apply"
echo "revert applied. the other gates first — the point of the finding is that they stay green:"
TSC=$(npx tsc -b 2>&1); echo "  npx tsc -b         -> $(grep -c 'server/identity.ts' <<<"$TSC") complaint(s) about server/identity.ts"
grep -v 'server/identity.ts' <<<"$TSC" | grep -c 'error TS' | sed 's/^/  (unrelated errors from other agents in flight: /;s/$/)/'
npx eslint server/ >/dev/null 2>&1 && echo "  npx eslint server/ -> exit 0 (green)" || echo "  npx eslint server/ -> red"
npx vitest run src/platform/identity/service.test.ts 2>&1 | grep -E 'Test Files|Tests ' | sed 's/^/  the old suite: /'
echo "and the boundary test:"
npx vitest run src/platform/identity/authorisationBoundary.test.ts 2>&1 | grep -E '×|✓|Test Files|Tests |AssertionError' | head -20
restore

step "C8  declare a gated route as ungated, without adding it to the allow-list"
grep -q '    path: "classes/:code/signout",\n' "$IDENTITY" || true
python3 - "$IDENTITY" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read()
old = '''    path: "classes/:code/signout",
    auth: "classOwner",'''
new = '''    path: "classes/:code/signout",
    auth: "classDoor",'''
assert old in s, "C8b precondition: the signout route is not declared classOwner"
open(p, "w").write(s.replace(old, new, 1))
PY
grep -q 'path: "classes/:code/signout",' "$IDENTITY" || fail "C8b revert did NOT apply"
python3 -c "
import sys
s = open('$IDENTITY').read()
i = s.index('path: \"classes/:code/signout\",')
assert 'auth: \"classDoor\"' in s[i:i+120], 'C8b revert did NOT apply'
print('revert applied.')
"
echo "running the test:"
npx vitest run src/platform/identity/authorisationBoundary.test.ts 2>&1 | grep -E '×|✓|Test Files|Tests |AssertionError' | head -20
restore

# --- The security layer's duplications ---------------------------------------
step "EXTRA  paste the CORS + security-header block back into the Vercel file"
grep -q 'const cors = apiHeaders(' "$VERCEL" || fail "EXTRA precondition: the Vercel file does not call apiHeaders"
python3 gauntlet/receipts/builder-identity/revert-cors.py "$VERCEL"
grep -q 'Access-Control-Allow-Origin' "$VERCEL" || fail "EXTRA revert did NOT apply"
echo "revert applied. running the test:"
npx vitest run src/platform/classes/transportParity.test.ts 2>&1 | grep -E 'Test Files|Tests |AssertionError|leaves the serverless' | head -10
restore

step "EXTRA  give the Vercel file its own copy of the address rule again"
grep -q 'clientId: rateLimitAddress({' "$VERCEL" || fail "EXTRA precondition: the Vercel file does not call rateLimitAddress"
python3 gauntlet/receipts/builder-identity/revert-address.py "$VERCEL"
grep -q 'function callerOf' "$VERCEL" || fail "EXTRA revert did NOT apply"
echo "revert applied. running the test:"
npx vitest run src/platform/classes/transportParity.test.ts 2>&1 | grep -E 'Test Files|Tests |AssertionError|leaves the serverless' | head -10
restore

step "every proof done — the files are restored"
git diff --stat "$IDENTITY" "$VERCEL"
