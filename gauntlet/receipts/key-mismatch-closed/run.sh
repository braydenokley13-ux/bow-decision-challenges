set -u
DIR="$1"; PORT=4590
K1=$(openssl rand -hex 32); K2=$(openssl rand -hex 32)
boot() {
  BOW_CLASS_STORE=file BOW_CLASS_DIR="$DIR" BOW_STORE_KEY="$1" BOW_API_PORT=$PORT \
    node dist-server/index.js >/dev/null 2>&1 &
  echo $! > /tmp/keyproof.pid
  for _ in $(seq 1 40); do curl -sf "http://127.0.0.1:$PORT/api/health" >/dev/null 2>&1 && break; sleep 0.25; done
}
stop() { kill "$(cat /tmp/keyproof.pid)" 2>/dev/null; wait "$(cat /tmp/keyproof.pid)" 2>/dev/null; sleep 0.3; }
post() { curl -s -o /tmp/kp.body -w '%{http_code}' -X POST "http://127.0.0.1:$PORT/api$1" -H 'content-type: application/json' -d "$2"; }
get()  { curl -s -o /tmp/kp.body -w '%{http_code}' "http://127.0.0.1:$PORT/api$1"; }

echo "=== BOOT 1 — the right key ==="
boot "$K1"
echo "signup:  $(post /auth/teacher '{"email":"ms.reyes@school.example","password":"a-long-enough-passphrase"}')"
TOK=$(python3 -c "import json;print(json.load(open('/tmp/kp.body')).get('token',''))")
CODE=$(curl -s -X POST "http://127.0.0.1:$PORT/api/classes" -H 'content-type: application/json' \
  -H "authorization: Bearer $TOK" -d '{"label":"Period 3 Real Class","challengeId":"plan-under-pressure"}' \
  | python3 -c "import json,sys;print(json.load(sys.stdin).get('code',''))")
echo "class:   $CODE"
echo "health:  $(get /health) $(python3 -c "import json;d=json.load(open('/tmp/kp.body'));print(d['storeKey'],d['classroomReady'])")"
BEFORE=$(find "$DIR" -type f | sort | md5sum)
stop

echo
echo "=== BOOT 2 — the wrong key, exactly the judge's sequence ==="
boot "$K2"
echo "health:  $(get /health) $(python3 -c "import json;d=json.load(open('/tmp/kp.body'));print(d['storeKey'],'classroomReady='+str(d['classroomReady']))")"
echo "reason:  $(python3 -c "import json;print(json.load(open('/tmp/kp.body'))['reason'])")"
echo "sign in:      $(post /auth/teacher/session '{"email":"ms.reyes@school.example","password":"a-long-enough-passphrase"}')"
echo "RE-REGISTER:  $(post /auth/teacher '{"email":"ms.reyes@school.example","password":"a-long-enough-passphrase"}')"
echo "create class: $(post /classes '{"label":"Period 3 Real Class","challengeId":"plan-under-pressure","code":"'"$CODE"'"}')"
echo "turn in:      $(post "/classes/$CODE/submissions" '{"seatCode":"1","log":[]}')"
stop
AFTER=$(find "$DIR" -type f | sort | md5sum)
echo "files unchanged after the wrong-key boot: $([ "$BEFORE" = "$AFTER" ] && echo YES || echo NO)"

echo
echo "=== BOOT 3 — the original key back, as health instructs ==="
boot "$K1"
echo "health:  $(get /health) $(python3 -c "import json;d=json.load(open('/tmp/kp.body'));print(d['storeKey'],'classroomReady='+str(d['classroomReady']))")"
echo "GET class $CODE: $(get "/classes/$CODE")"
echo "sign in:         $(post /auth/teacher/session '{"email":"ms.reyes@school.example","password":"a-long-enough-passphrase"}')"
stop
