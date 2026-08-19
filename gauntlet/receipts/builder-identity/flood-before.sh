set -u
API=http://127.0.0.1:4481/api
CLASS=$(curl -s -X POST $API/classes -H 'content-type: application/json' -d '{"label":"Open class","challengeId":"plan-under-pressure"}')
CODE=$(echo "$CLASS" | sed -n 's/.*"code":"\([^"]*\)".*/\1/p')
echo "open class: $CODE (no roster, no teacher account)"
S=$(date +%s%N)
: > tokens.txt
for i in $(seq 1 15); do
  curl -s -X POST $API/classes/$CODE/join -H 'content-type: application/json' -d "{\"displayName\":\"Bot $i\"}" \
    | sed -n 's/.*"token":"\([^"]*\)".*/\1/p' | tr -d "\n" >> tokens.txt; echo >> tokens.txt
done
E=$(date +%s%N)
echo "self-served $(wc -l < tokens.txt) student sessions in $(( (E-S)/1000000 ))ms from the class code alone"
node -e 'const fs=require("fs");const big="x".repeat(3.4*1024*1024);fs.writeFileSync("payload.json",JSON.stringify({classCode:process.argv[1],worldId:"basketball",stage:"working-plan",sessionId:"flood0001",payload:{junk:big}}))' $CODE
echo "one request body: $(du -h payload.json | cut -f1)"
S=$(date +%s%N)
N=0
while read -r T; do
  code=$(curl -s -o /dev/null -w '%{http_code}' -X PUT $API/me/attempt -H 'content-type: application/json' -H "authorization: Bearer $T" --data-binary @payload.json)
  N=$((N+1)); printf '%s ' "$code"
done < tokens.txt
E=$(date +%s%N)
echo
echo "$N x 3.4MB checkpoints in $(( (E-S)/1000000 ))ms"
echo "disk in the class directory: $(du -sh store/classes/$CODE 2>/dev/null || du -sh store 2>/dev/null)"
echo "--- and the rate limit, 30 requests from one student ---"
T=$(head -1 tokens.txt)
node -e 'const fs=require("fs");fs.writeFileSync("small.json",JSON.stringify({classCode:process.argv[1],worldId:"basketball",stage:"working-plan",sessionId:"flood0002",payload:{n:1}}))' $CODE
for i in $(seq 1 30); do printf '%s ' "$(curl -s -o /dev/null -w '%{http_code}' -X PUT $API/me/attempt -H 'content-type: application/json' -H "authorization: Bearer $T" --data-binary @small.json)"; done
echo
