set -u
API=${BOW_API:-http://127.0.0.1:4481/api}
RUN=$(date +%s)
EMAIL="after.$RUN@school.example"
J() { sed -n "s/.*\"$1\":\"\([^\"]*\)\".*/\1/p"; }
say(){ echo; echo "=== $* ==="; }

say "C5 — a teacher ends every session on their account"
SIGNUP=$(curl -s -X POST $API/auth/teacher -H 'content-type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"a long enough passphrase\"}")
TOKEN=$(echo "$SIGNUP" | J token)
SECOND=$(curl -s -X POST $API/auth/teacher/session -H 'content-type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"a long enough passphrase\"}" | J token)
echo -n "captured token, GET /me before: "; curl -s -o /dev/null -w '%{http_code}\n' $API/me -H "authorization: Bearer $SECOND"
echo -n "POST /auth/teacher/signout: "; curl -s -X POST $API/auth/teacher/signout -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{}'; echo
echo -n "captured token, GET /me after:  "; curl -s -o /dev/null -w '%{http_code}\n' $API/me -H "authorization: Bearer $SECOND"
echo -n "captured token, /me/teaching:   "; curl -s -o /dev/null -w '%{http_code}\n' $API/me/teaching -H "authorization: Bearer $SECOND"

say "C5 — and a password change, which also turns the generation"
TOKEN=$(curl -s -X POST $API/auth/teacher/session -H 'content-type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"a long enough passphrase\"}" | J token)
OLD=$(curl -s -X POST $API/auth/teacher/session -H 'content-type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"a long enough passphrase\"}" | J token)
CHANGED=$(curl -s -X POST $API/auth/teacher/password -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"currentPassword":"a long enough passphrase","newPassword":"a different long passphrase"}')
echo "$CHANGED" | head -c 300; echo
NEW=$(echo "$CHANGED" | J token)
echo -n "token captured before the change, GET /me after: "; curl -s -o /dev/null -w '%{http_code}\n' $API/me -H "authorization: Bearer $OLD"
echo -n "the token it handed back, GET /me:               "; curl -s -o /dev/null -w '%{http_code}\n' $API/me -H "authorization: Bearer $NEW"

say "C3 — a leaked teacher key, replaced, class intact"
CLASS=$(curl -s -X POST $API/classes -H 'content-type: application/json' -H "authorization: Bearer $NEW" -d '{"label":"Period 3","challengeId":"plan-under-pressure"}')
CODE=$(echo "$CLASS" | J code); KEY=$(echo "$CLASS" | J teacherKey)
curl -s -X POST $API/classes/$CODE/roster -H 'content-type: application/json' -H "authorization: Bearer $NEW" -d '{"names":["Aiden R","Bianca T"]}' > cards.json
CARD=$(J joinCode < cards.json | head -1)
STOK=$(curl -s -X POST $API/classes/$CODE/join -H 'content-type: application/json' -d "{\"joinCode\":\"$CARD\"}" | J token)
curl -s -X PUT $API/me/attempt -H 'content-type: application/json' -H "authorization: Bearer $STOK" -d "{\"classCode\":\"$CODE\",\"worldId\":\"basketball\",\"stage\":\"working-plan\",\"sessionId\":\"live-1\",\"payload\":{\"real\":true}}" > /dev/null
echo "class $CODE, old key $KEY"
echo -n "POST /api/classes/$CODE/key -> "
ROT=$(curl -s -w '\n%{http_code}' -X POST $API/classes/$CODE/key -H "authorization: Bearer $NEW" -H 'content-type: application/json' -d '{}')
echo "$ROT" | tail -1
NEWKEY=$(echo "$ROT" | head -1 | J teacherKey)
echo "$ROT" | head -1 | head -c 400; echo
echo -n "old key, evidence room:  "; curl -s -o /dev/null -w '%{http_code}\n' $API/classes/$CODE/submissions -H "x-bow-teacher-key: $KEY"
echo -n "new key, evidence room:  "; curl -s -o /dev/null -w '%{http_code}\n' $API/classes/$CODE/submissions -H "x-bow-teacher-key: $NEWKEY"
echo -n "roster still has the children: "; curl -s $API/classes/$CODE/roster -H "x-bow-teacher-key: $NEWKEY" | head -c 220; echo
echo -n "the student's checkpoint survives: "; curl -s "$API/me/attempt?classCode=$CODE" -H "authorization: Bearer $STOK" | head -c 200; echo
echo -n "/me/teaching carries the new key: "; curl -s $API/me/teaching -H "authorization: Bearer $NEW" | grep -c "$NEWKEY"

say "C6 — the same flood the review ran, against the fixed service"
J() { sed -n "s/.*\"$1\":\"\([^\"]*\)\".*/\1/p"; }
OC=$(curl -s -X POST $API/classes -H 'content-type: application/json' -d '{"label":"Open class","challengeId":"plan-under-pressure"}' | J code)
echo "open class $OC (no roster, no teacher account) — the review's exact starting point"
: > t3.txt
S=$(date +%s%N)
for i in $(seq 1 15); do curl -s -X POST $API/classes/$OC/join -H 'content-type: application/json' -d "{\"displayName\":\"Bot $i\"}" | J token | tr -d '\n' >> t3.txt; echo >> t3.txt; done
E=$(date +%s%N)
echo "self-served $(wc -l < t3.txt) student sessions in $(( (E-S)/1000000 ))ms"
node -e 'const fs=require("fs");fs.writeFileSync("big.json",JSON.stringify({classCode:process.argv[1],worldId:"basketball",stage:"working-plan",sessionId:"flood0001",payload:{junk:"x".repeat(3.4*1024*1024)}}))' $OC
echo "one request body: $(du -h big.json | cut -f1)"
BEFORE=$(du -sk store2 | cut -f1)
S=$(date +%s%N)
while read -r T; do printf '%s ' "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $API/me/attempt -H 'content-type: application/json' -H "authorization: Bearer $T" --data-binary @big.json)"; done < t3.txt
E=$(date +%s%N)
AFTER=$(du -sk store2 | cut -f1)
echo; echo "15 x 3.4MB checkpoints attempted in $(( (E-S)/1000000 ))ms; store grew $(( AFTER-BEFORE ))KB (was 65MB before the fix)"
echo -n "what the student is told: "; curl -s -X PUT $API/me/attempt -H 'content-type: application/json' -H "authorization: Bearer $(head -1 t3.txt)" --data-binary @big.json; echo
echo -n "a 250KB payload (inside the cap) still saves: "
node -e 'const fs=require("fs");fs.writeFileSync("mid.json",JSON.stringify({classCode:process.argv[1],worldId:"basketball",stage:"working-plan",sessionId:"real-2",payload:{filler:"x".repeat(250*1024)}}))' $OC
curl -s -o /dev/null -w '%{http_code}\n' -X PUT $API/me/attempt -H 'content-type: application/json' -H "authorization: Bearer $(sed -n 2p t3.txt)" --data-binary @mid.json
