set -u
API=http://127.0.0.1:4481/api
say(){ echo; echo "=== $* ==="; }

say "C5: teacher signs up, captures a token"
SIGNUP=$(curl -s -X POST $API/auth/teacher -H 'content-type: application/json' -d '{"email":"repro.a@school.example","password":"a long enough passphrase"}')
TOKEN=$(echo "$SIGNUP" | sed -n 's/.*"token":"\([^"]*\)".*/\1/p')
echo "token captured: ${TOKEN:0:24}..."
echo -n "GET /me with it: "; curl -s -o /dev/null -w '%{http_code}\n' $API/me -H "authorization: Bearer $TOKEN"

say "C5: probing every plausible revocation route"
for m in DELETE POST; do for p in auth/teacher/session auth/teacher/signout me/signout auth/teacher/password me/password auth/teacher/sessions; do
  printf '%-7s /%-28s -> %s\n' "$m" "$p" "$(curl -s -o /dev/null -w '%{http_code}' -X $m $API/$p -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{"password":"a long enough passphrase","newPassword":"another long enough passphrase"}')"
done; done

say "C5: one token hands back every class teacherKey"
CLASS=$(curl -s -X POST $API/classes -H 'content-type: application/json' -H "authorization: Bearer $TOKEN" -d '{"label":"Period 3","challengeId":"plan-under-pressure"}')
CODE=$(echo "$CLASS" | sed -n 's/.*"code":"\([^"]*\)".*/\1/p')
KEY=$(echo "$CLASS" | sed -n 's/.*"teacherKey":"\([^"]*\)".*/\1/p')
echo "class $CODE key $KEY"
curl -s $API/me/teaching -H "authorization: Bearer $TOKEN"; echo

say "C3: probing every plausible key-rotation route on class $CODE"
for m in POST PUT PATCH; do for p in key rotate teacherKey; do
  printf '%-6s /classes/%s/%-12s -> %s\n' "$m" "$CODE" "$p" "$(curl -s -o /dev/null -w '%{http_code}' -X $m $API/classes/$CODE/$p -H "authorization: Bearer $TOKEN" -H 'content-type: application/json' -d '{}')"
done; done
echo -n "PATCH /classes/$CODE {teacherKey:...} -> "
curl -s -X PATCH $API/classes/$CODE -H 'content-type: application/json' -H "authorization: Bearer $TOKEN" -d '{"label":"Period 3","teacherKey":"ZZZZZZZZZZZZZZZZZZZZZZZZ"}'; echo
echo -n "old key still opens the class: "
curl -s -o /dev/null -w '%{http_code}\n' $API/classes/$CODE/submissions -H "x-bow-teacher-key: $KEY"
