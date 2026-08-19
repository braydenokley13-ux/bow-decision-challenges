# BOW Decision Challenges — Security & Privacy Vendor Review (Round 4)

**Reviewer role:** fresh-context security/privacy red team, fourth round. Read-only on product code;
I may write only this file and `gauntlet/receipts/vendor4/`.
**Brief (unchanged):** find a reason a US school district should refuse to deploy this to middle-schoolers.
REFUSE remains available.
**Pinned snapshot:** every claim is true of commit **`de6207c19559a0e3a741a9fa0809fba9b8001ab8`**
(contains the round-3 fixes), extracted with `git archive` outside the repo and built with `vite build --ssr`.
My servers ran on **:4485–4493** with data under `.scratch/vendor4/`; all are stopped and the ports confirmed clear.
Transcripts: `gauntlet/receipts/vendor4/`.

**On the machine.** Load average ~25 on 4 cores, ~5.8 GB RAM free, a dozen agents building and driving
browsers. I took the operational note seriously: every timing claim below is a **ratio against a control
measured in the same burst, seconds apart, on the same box**, and I measured an explicit **noise floor**
(1.28×) so I could say which differences are real. I also deliberately did **not** run the one test that
would have been most dramatic — several hundred concurrent scrypts to try to OOM the box — because at
32 MB per scrypt that would have killed other agents' work. I bounded that experiment and reasoned about
the rest arithmetically, and I say so where it matters.

---

## 1. Verdict

# DEPLOY WITH CONDITIONS

Unchanged from Round 3, and for a reason worth stating plainly: **all three MEDIUMs and both caveats are
genuinely fixed, and I verified each one rather than taking it.** The timing oracle is gone (83× → 0.69×,
inside a 1.28× noise floor). A real thirty-student room now produces **zero** 429s. The managed pointer is
sealed. The canary fails closed in the state I reported it failing open.

**But the pattern from Round 3 repeated: two of the fixes broke something new**, which is exactly what I was
asked to look for.

- The **canary fix** made the file store fail closed when classes exist — and left it failing **open** when
  only *teacher accounts* exist, because the canary is planted solely by `putClass`. In that state a boot
  under a mistyped key reports `fresh / ok / classroomReady: true`, and if the operator trusts it and lets a
  teacher re-register, **restoring the correct key does not restore access** — the original account is
  severed permanently (receipt 01).
- The same fix, on the **managed** driver, made a *correct, healthy* deployment report **`mismatch` and
  HTTP 503** — with a reason telling the operator to put an old key back — from the moment the first teacher
  signs up, because `DBSIZE > 0` with no canary is read as "wrong key" (receipt 02).

Neither is a reason to refuse: neither discloses a child's data, neither is remotely triggerable, and both
are small, well-localised logic errors. But both would hurt a district on day one, and the second would fail
a deploy gate on every managed install. Combined with the unthrottled roster-amplified forge path (NEW-C)
and the still-unrotatable key, the honest verdict remains **deploy with conditions**, with the conditions in §5.

### Findings this round
- **HIGH: 0**
- **MEDIUM: 3** (accounts-only canary fail-open with irreversible account loss; managed false-`mismatch`/503; unthrottled roster-amplified refused submissions)
- **LOW: 2** (migration door's alarm absent during the actual migration; `GET /classes/:code` still unthrottled — carried from Round 3, not addressed)

---

## 2. The three MEDIUMs and two caveats, re-run

Full transcripts in `gauntlet/receipts/vendor4/05-verified-closed.txt`.

| Round-3 item | Status | Evidence |
|---|---|---|
| **NEW-3** login/recovery timing oracle | **CLOSED** | `burnSecretCheck` runs the same scrypt on the no-account branch of both routes. Measured *inside* the 10-failure window (an earlier run was contaminated by the per-email 429 and showed a misleading 0.01×): ratios **0.69 / 0.69 / 0.88×** against a **1.28×** measured noise floor. Round 3 was 83×. No usable signal. |
| **NEW-2** submission limiter locking a room out | **CLOSED** | A real room, 30 pupils on one NAT: 30 joins (+5 mistyped cards), 96 submissions, 40 teacher polls → **no 429 anywhere**. Per-student cap trips exactly as documented at 20/10 min and affects only that pupil. |
| **NEW-1** canary fails open | **CLOSED for the reported state**, **new gap elsewhere** | Classes present + canary deleted now → `mismatch`. But accounts-only → still `fresh` (§3 NEW-A). |
| **LOW** managed `teacher-email` pointer | **CLOSED** | `putTeacher` writes `put(record.id)`; `getTeacherByEmail` unwraps with `get()`. Exercised through a mock-KV round trip. |
| **Caveat** migration door had no handle | **WIRED, but its alarm misfires** | `BOW_STORE_MIGRATE_PLAINTEXT=1` genuinely reads a legacy plaintext class and roster. But health says `mismatch`, not `migrating`, in the only state that matters (§3 NEW-D). |

I also checked that the timing fix did not create a new denial-of-service, since `burnSecretCheck` makes a
previously-cheap branch pay a 32 MB scrypt. It does not: 24 concurrent no-account sign-ins left legitimate
latency unchanged (4 ms quiet vs 2 ms under flood), scrypt runs on the libuv threadpool rather than the event
loop, and the per-address bucket (300 failures/15 min) caps the rate far below trouble. **Tested, not a finding.**

---

## 3. New findings

### MEDIUM NEW-A — Accounts-only stores still fail open, and a wrong-key boot then destroys account access irreversibly
**Where:** `server/store.ts`. `plantCanary()` is called only from `putClass()`. `keyCheck()`'s absent-canary
branch is `readdir(root).some(n => !n.startsWith("_") && !n.endsWith(".json")) ? "mismatch" : "fresh"` —
and `_accounts` / `_index` both start with `_`, so a store full of teacher accounts looks empty.
**Reproduction:** receipt `01-canary-accounts-only-fails-open.txt`.
1. Teacher signs up, no class yet. Correct key → `storeKey=fresh, ok=true, classroomReady=true`.
2. Restart with a **wrong** key → still `fresh / ok / classroomReady:true`, while the teacher's sign-in
   returns **401** (their record cannot be opened). The guard added for exactly this does not fire.
3. Trusting the green health, the teacher re-registers → **201**, a *second* account for one email, and the
   email pointer is overwritten sealed under the wrong key.
4. Operator restores the **correct** key → the **original** teacher still gets **401, permanently.**
**Cost to the district:** one mistyped environment variable silently and irreversibly severs every teacher
account — and with it every class those accounts own — while the health endpoint says the deployment is
ready. **Fix:** plant the canary on the first write of *any* record, and/or count a non-empty `_accounts`
tree as "data present" in the fail-closed judgement.

### MEDIUM NEW-B — The managed store reports a false `mismatch` (HTTP 503) on a correct, healthy deployment
**Where:** `redisRestStore.keyCheck()` falls back to `DBSIZE > 0 ? "mismatch" : "fresh"`. `DBSIZE` counts the
whole database; the canary is planted only by `putClass`.
**Reproduction:** receipt `02-managed-keycheck-false-mismatch.txt`, end-to-end with the real server against a
spec-correct mock KV, **correct key throughout**:
- brand-new deployment → health **200**, `storeKey=fresh`.
- a teacher signs up (the normal first action) → **signup 201**.
- immediately after → health **503**, `storeKey=mismatch`, `ok=false`, reason: *"BOW_STORE_KEY has changed …
  put the original key back."* The key has not changed. Nothing is wrong.

Across states, with the correct key: teacher-only → **false mismatch**; a KV **shared with another app**
(common on Vercel KV) with zero BOW data → **false mismatch**; `DBSIZE` returning `null` (unsupported or
denied) → **`fresh`, i.e. fails open** — the very property the fix removed; `DBSIZE` returning 403 (a
permission-restricted Upstash token) → **throws**, surfacing as a different 503.
**Cost to the district:** `handler.ts` calls health "the first thing to check after a deploy" and notes that
"a smoke test that only checks for 200 still catches it" — so a deploy gate or load-balancer probe fails
every managed install from first signup until someone happens to create a class, and the reason text
actively misdirects the operator toward restoring a key that is already correct.

### MEDIUM NEW-C — Refused submissions are unthrottled and roster-amplified; one child's card degrades the service ~80×
**This is the direct answer to the question I was asked to attack.** Is a forged submission cheap?
**Unauthenticated: yes — the reasoning holds.** 2.4 ms/req against a 1.9 ms `/health` control; no scrypt, no
roster read (`callerOf` returns null before touching the store). **Authenticated: no.** `store.listRoster()`
reads and AES-GCM-decrypts up to 60 sealed records **before** the seat check and **before** the per-student
limit. So the answer to "a store read per request?" is: *a whole-roster read per request*.
**Reproduction:** receipt `03-refused-submission-cost.txt` (200 requests per row; **every** request 403, **none** rate limited):

| request | ms/req |
|---|---|
| control `GET /health` | 1.9 |
| forged, **no token** → 403 | 2.4 |
| forged, valid token, wrong seat, **60-seat** class | **16.2** |
| forged, valid token, wrong class, **1-seat** class | 3.9 |

Roster-size amplification **4.1×**; versus control **8.5×**. Sustained from **one ordinary student join card**
— the lowest-privilege credential in the product, printed and handed to a child — 600 refused forges took
legitimate `GET /classes/CODE` from **2 ms to 184 ms (82× slower)**, with zero 429s.
**Assessment:** removing the address-keyed bucket was right about the room-vs-attacker problem — a limit
keyed on an address that the room shares can always be spent by an attacker in the room. But it also removed
the only thing shedding load on this route, and the replacement covers only *accepted* work. **Fix:** resolve
the seat before listing the whole roster (or index the roster by seat), and charge the per-student bucket on
refused attempts too, so the cost lands on the forger rather than the room.

### LOW NEW-D — The migration door's alarm is absent during the actual migration
Receipt `04-migration-door.txt`. The door works: with `BOW_STORE_MIGRATE_PLAINTEXT=1` a legacy plaintext
class and its roster (`"displayName":"Legacy Child"`) read back; closed, they 404. But a genuine
pre-sealing directory has **no canary**, so `keyCheck` takes the absent-canary fail-closed branch and returns
**`mismatch`** — never consulting `keeper.migrating`. Health therefore shows *"BOW_STORE_KEY has changed …
put the original key back"* throughout the real migration, which is the opposite of the right advice and
would lead a careful operator to abort a correct migration. `migrating` becomes reachable only **after** a
write plants a canary. So the "loud for exactly as long as it is open" property holds everywhere except the
window it was written for.
*(Fixture note, in fairness: my first attempt used class code `OLDCL`, which is not well-formed — `O` and `L`
are not in `CODE_ALPHABET` — and 404'd for that reason. I caught it and redid the test with `MFDNK`.)*

### LOW — carried from Round 3, not addressed
`GET /classes/:code` remains unauthenticated and unthrottled (200/200 reads, no 429), disclosing the
teacher-authored class label across a sweepable 5-character code space.

---

## 4. The two questions asked

### (1) Key rotation: condition or blocker?

**A condition — but the hardest one on the list, and it should be time-boxed rather than deferred.**

Why not a blocker: the blast radius is bounded by the product's own design. Classes expire in 120 days, so
the maximum loss horizon is a term, not a permanent record; the loss is now **loud** rather than silent
(that was the Round-3 fix, and it works); and no district-held system of record depends on BOW — the
gradebook of truth lives elsewhere. A district can deploy, keep the key in the same secret manager as
everything else, and never rotate in a 120-day pilot.

Why it is nonetheless serious: the one action a district must take after a suspected key compromise —
rotate — currently means destroying every class. A control you cannot rotate is a control you cannot
remediate, and "we would have to delete a term of children's work to respond to an incident" is an answer
that will not survive a security review at a large district. It also interacts with NEW-A: today the
*loudness* itself has a hole.

**The honest minimum for a re-encryption path.** Not a live migration — an **offline** command, run with the
service stopped, that:
1. takes the old key and the new key explicitly;
2. walks every record, `open()` with the old key, `seal()` with the new, writing into a **new directory** —
   never mutating in place;
3. **verifies** by re-reading every written record under the new key and comparing a digest of the decrypted
   plaintext against the source, and **refuses to complete** if any record fails;
4. plants a canary sealed with the new key as its final act, so a half-finished run cannot look complete;
5. leaves the old directory untouched, so the operation is reversible by pointing the service back at it;
6. is resumable and idempotent, so a crash mid-run cannot produce a directory that neither key fully opens.

Guarantees a district should ask for in writing: no in-place mutation, a verified round-trip on **every**
record (not a sample), reversibility, and a service that refuses to start against a partially-converted
directory. The canary now gives you the last one nearly for free.

Note that this same command is also the right answer to the migration door, which brings me to (2).

### (2) Is a documented, off-by-default forgery window worth the migration it enables?

**No. Delete it, and ship the offline converter instead.** You asked me to attack the judgement rather than
accept it, so, plainly:

1. **It protects a population of zero.** The product has never shipped. There is no pre-sealing directory
   anywhere in the world. The door is a permanent, documented weakening of the authorization path in
   exchange for a migration that no real deployment will ever need to perform.
2. **Its safety story is the loudness — and the loudness is exactly what does not work** in the state it is
   used in (NEW-D). The mitigation that justifies the risk is absent precisely when the risk is taken.
3. **While open, it is a full authorization bypass, not a read affordance.** I verified this: with the flag
   set, my Round-2 HIGH-2 takeover works verbatim — overwrite a sealed teacher record with plaintext
   carrying a password hash of your choosing, sign in, **HTTP 200 and a valid teacher token**. That is not
   "reads records nobody's key wrote"; that is "accepts credentials nobody's key wrote".
4. **A runtime flag is strictly worse than an offline tool.** It is reachable by a process that outlives the
   maintenance window, it is a config an attacker who gains environment control can set, and it applies to
   every record on every request rather than to one conversion pass.

The alternative costs the operator nothing they would not already do: stop the service, run the converter,
start the service. The converter is the same one key rotation needs, so it is one piece of work that closes
both. If a legacy directory ever does exist, it gets converted once, offline, with per-record verification —
and the running service never has to be willing to trust unsealed bytes.

---

## 5. Conditions to deploy

**Technical, before a pilot:**
1. Resolve the seat before reading the whole roster, and charge the per-student bucket on refused
   submissions, so a single join card cannot degrade the service (NEW-C).
2. Plant the canary on the first write of *any* record, and treat a non-empty `_accounts` tree as data
   present, so accounts-only stores fail closed (NEW-A).
3. Replace the managed `DBSIZE` heuristic with a BOW-namespaced probe (e.g. `EXISTS` on a known BOW key, or
   a `SCAN` of the `class:`/`teacher:` prefixes), and treat an unavailable/denied `DBSIZE` as unknown rather
   than as `fresh` (NEW-B).
4. Make `keyCheck` consult `keeper.migrating` before the absent-canary branch, so the migration state is
   reported during the migration (NEW-D) — or delete the door per §4(2), which removes the question.
5. A modest per-address read limit on `GET /classes/:code`.
6. Ship the offline re-encryption/conversion command described in §4(1).

**Contractual / operational (unchanged, still the district's to obtain):**
7. A signed DPA with the KV subprocessor (at-rest encryption, breach notice, deletion); a signed Parents'
   Bill of Rights and staff-training attestation (NY Ed Law §2-d); a written data-retention policy and
   written information security program (COPPA §312.10 / §312.8). Full-disk encryption and correct
   filesystem permissions on any self-hosted box; a TLS terminator in front of the loopback HTTP server.

**Compliance stance (unchanged, no assertion made):** I am not asserting BOW is or is not FERPA / COPPA /
§2-d / Part 121 compliant. Against primary text I checked in earlier rounds (COPPA §312.10 deletion; §2-d
"encryption … in its custody"): both durable drivers now seal at rest and refuse to start keyless, which
**partially meets** the §2-d custody obligation for the passive-theft case, and the 120-day sweep **meets**
§312.10 deletion on the file store. Encryption in motion, the managed TTL retention window, and every
contractual item remain the district's to verify.

---

## 6. What I did not test

- **A live Upstash/Vercel deployment.** NEW-B is reproduced against a spec-correct mock KV plus the real
  server; a district should confirm on real infrastructure, and separately check the managed TTL retention
  window (per-key `EXPIRE` bumped 120 days on every write can outlive a class's own window — flagged in
  Round 2, still unexercised live).
- **Scrypt memory exhaustion at scale.** Deliberately not run: ~32 MB per scrypt × hundreds concurrent would
  have OOM'd a shared box running a dozen other agents. I bounded it at 24 concurrent (no impact) and
  reasoned from the 300/15 min address cap.
- **A real appending reverse proxy** in front of the server, to exercise the `BOW_TRUST_PROXY` hop count
  end-to-end (Round 3 covered the default and misconfiguration cases via the pure function and a live spoof).
- **Sustained brute force of the 5-character join space** beyond the limiter threshold.
- **Runtime DOM XSS harness** — Round 3's static sink audit stands (no unsafe sinks anywhere in `src`).
- Domain/scoring/evidence correctness — out of scope for a security review.

---

*Report `gauntlet/critiques/vendor-review-4.md`; receipts `gauntlet/receipts/vendor4/01…05`.
Pinned SHA `de6207c19559a0e3a741a9fa0809fba9b8001ab8`.*
