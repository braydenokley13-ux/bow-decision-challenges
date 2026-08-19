# BOW Decision Challenges — Security & Privacy Vendor Review (Round 5)

**Reviewer role:** fresh-context security/privacy red team, fifth round. Read-only on product code;
I may write only this file and `gauntlet/receipts/vendor5/`.
**Brief (unchanged):** find a reason a US school district should refuse to deploy this to middle-schoolers.
REFUSE is on the table and I am encouraged to use it.
**Pinned snapshot:** every claim below is true of commit **`d523c94411f149fde23464c2939e05df3b8077f3`**,
extracted with `git archive HEAD | tar -x` to a tree outside the repo and built with
`vite build --ssr server/index.ts` and `--ssr server/rekey.ts`. My private servers ran on
**:4790–:4812** (file store) with data under `.scratch/vendor5/r6/`; I checked nothing was listening
first and killed every process afterward (ports confirmed clear). Transcripts: `gauntlet/receipts/vendor5/`.

**On the moving HEAD.** The branch advanced to `a1ab0cf` while I worked. I diffed the entire
security surface — `server/*.ts`, `src/platform/classes/{codes,assignments}.ts`,
`src/domain/evidence/types.ts`, `src/student/reading/*` — between `d523c94` and `a1ab0cf` and it is
**byte-identical**. The intervening commits are client UI (attemptStore, ResumeGate, educator roster)
and receipt collection. Every finding here therefore holds at the live HEAD as well as at the pinned SHA.

**On the machine.** The box is shared and has crashed under load. I ran no memory-exhaustion test:
the traversal, scoping, rekey and lookup work is I/O-bound `curl`/`node` against a single-process
file store, never more than a couple hundred sequential requests, and I did not launch concurrent
scrypt floods (the round-4 call I agree with).

---

## 1. Verdict

# DEPLOY WITH CONDITIONS

**Single strongest reason to hesitate — but not to refuse:** the offline re-encryption command
(`npm run rekey`) takes **both the old and the new store key on argv**, where any local process or
user reads them out of `ps`/`/proc/<pid>/cmdline` for the length of the maintenance window. Those
two strings decrypt the entire class store and derive the token-signing secret, so either one is
"read the district." It is a real weakness and it is the product regressing from its own established
practice — the running service correctly takes `BOW_STORE_KEY` from the **environment**, which Linux
keeps owner/root-only. But it is bounded to a maintenance window and to parties who already have a
shell on the host the operator controls; it is not remotely exploitable and it exposes no child's
work over the network. It is a technical condition, not a blocker (finding NEW-1, receipt 05).

**Why not REFUSE.** The round-5 catastrophe — a student destroying any teacher's class by path
traversal in `sessionId` — is **closed on the bytes** (§2). Every prior-round HIGH/MEDIUM I re-ran is
closed and I re-verified each rather than taking it: managed and disk stores both seal at rest and
refuse to boot keyless; the plaintext-downgrade account-takeover is refused; the canary fails closed
including in the accounts-only state that cost the round-4 MEDIUM; the login timing oracle is gone.
I could not reproduce any cross-student, cross-teacher, or unauthenticated disclosure or destruction
of a child's name or work (§3, §4). The one genuinely new issue is local-and-operational. The data
held on a child remains minimal (a teacher- or self-typed display name, which may be "Table 4", plus
decision evidence — no email, DOB, school, device, or clickstream), and no student writing leaves the
device to any model or third party. Every gap below is a bounded engineering or contractual item.

**No child-data alarm was raised to the lead**, because I found nothing that destroys or exposes a
child's work: the traversal is closed and nothing else reaches student data across a tenant boundary.

### Severity of new findings
- **MEDIUM: 1** — both store keys exposed on `rekey` argv (NEW-1).
- **LOW: 3** — rekey does not refuse a non-empty destination (NEW-2); identity-route class codes skip
  the door's format check and fail as a 503 rather than a clean 400, still fail-closed (NEW-3); a stale
  source comment says managed at-rest encryption is "optional" when the code now requires it (NEW-4).

---

## 2. The traversal fix — CLOSED

Fix commit `c1f09bf`; I attacked it at `d523c94`. **Two layers, both confirmed on the bytes**
(receipt `02-traversal-fix-verification.txt`):

1. **The door.** `readSubmission` (`server/handler.ts:94`) validates the client-chosen `sessionId`
   **and** `assignmentId` against `SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/` — a character set, not a length.
2. **The store.** `segment()` (`server/store.ts:372`, regex `^[A-Za-z0-9._:-]{1,96}$`, excluding exactly
   `.` and `..`) **throws** rather than sanitising, and every write path that turns a client string into
   a filename passes through it: `submissionPath`, `assignmentPath`, `classPath`, `accountPath`,
   `indexPath`, and the roster / checkpoint / feedback / shareout paths.

Against the exact original payload and five variants, from an authenticated student in an open class
they self-joined, aimed at a second teacher's `class.json`:

| `sessionId` sent | result |
|---|---|
| `aaaaaaaa/../../../<VICTIM>/class` (the original) | **HTTP 400** |
| `aaaaaaaa%2f..%2f..%2f..%2f<VICTIM>%2fclass` (encoded slash) | **HTTP 400** |
| `aaaaaaaa\..\..\..\<VICTIM>\class` (backslash) | **HTTP 400** |
| `aaaaaaaa/../../../<VICTIM>/roster/1` (into roster) | **HTTP 400** |
| `../<VICTIM>`, `..`, `.`, `short` | **HTTP 400** |
| `123e4567-e89b-12d3-a456-426614174000` (a real `crypto.randomUUID()`) | **HTTP 202 — admitted** |

The victim teacher's class opened with their real key **200 before and 200 after**, label intact.

**I checked the door's rule against the ids the product actually generates**, because a rule that
refuses a legitimate student is its own incident. The client mints `sessionId` with
`crypto.randomUUID()` (`src/stages/StudentChallenge.tsx:192`, `PopUpContext.tsx:150`): 36 chars, hex
and hyphen, inside `{8,64}` and inside `[A-Za-z0-9._-]`. It is admitted (202 above) and reads back
through `/me/runs`. No legitimate refusal.

**I looked for what does not pass through `segment()`.** The read helpers `readFolder`/`readIndex`
join `code` **without** `segment()` — but every caller reaches them only after a `getClass(code)` on
the same code (which does segment and throws first), or with a `classCode` taken from the caller's own
stored seat index (written during a validated join), so the unsafe value never arrives. And a class
code is a single URL path segment: it cannot contain a real `/` (the WHATWG parser does not decode
`%2F` in `pathname`), and the only traversal-meaningful single segments — `.` and `..` — are the two
`segment()` excludes. The Redis driver builds keys by interpolation (`class:${code}` etc.) but ships
each command as a **JSON array** to the REST API, so there is no command-injection path even for an
unvalidated code. I confirmed no file was created outside the data root during any probe.

The traversal class of bug is closed comprehensively, not just at the one door where it fired.

---

## 3. New findings (severity-ordered)

### MEDIUM NEW-1 — `npm run rekey` puts both store keys on the command line
**Where:** `server/rekey.ts` `main()` reads the keys only from `arg("old-key")`/`arg("new-key")`
(argv). There is no environment/file/stdin path.
**What an attacker does:** anyone with an unprivileged shell on the host during the maintenance
window runs `ps -eo pid,args` (or reads `/proc/<pid>/cmdline`, world-readable by default on Linux).
**What they get** (receipt `05-rekey-keys-on-argv.txt`, observed live):
```
node dist-server/rekey.js --from …/big_src --to …/argv_dst \
  --old-key eUG/vf3T/QG02KKELlL0fqnOZqlNZWjrONY4zZL9sds= \
  --new-key 1ssB67ZG55CqPOHVWPdxaJ506pbnuhyDuY2Lrarae1k=
```
`--old-key` opens the entire existing sealed store; `--new-key` opens it going forward; **either**
derives the session-signing secret via `keeper.derive("session")`, i.e. the power to mint a valid
token for any teacher or child in the deployment. This is exactly the crown-jewel exposure the whole
sealing effort exists to prevent, just moved from the disk to the process table.
**What it costs the district:** on a single-tenant box the operator already owns, low — but the
product's own threat model is "one disk image = the whole district", and a co-tenant, a compromised
unprivileged service, or a shared jump host reading the process table is squarely inside it. The
exposure is real, transient, and unnecessary.
**The regression:** the running service takes `BOW_STORE_KEY` from the **environment**, and Linux
keeps `/proc/<pid>/environ` readable only by the process owner and root — meaningfully more protected
than argv. `rekey` should follow the convention the service already sets.
**My ruling (the keys-on-argv question I was asked to settle):** a **condition, not a blocker.** Fix
by reading each key from an environment variable, a file whose path is on argv, or stdin — never the
key itself on argv — and say so in `STORE_KEY_HELP`. It does not justify REFUSE on its own: it needs
local host access during a deliberately-stopped maintenance window, and it exposes nothing over the
network. But it is the sharpest new item and a large district's reviewer will ask about it.

### LOW NEW-2 — `rekey` neither refuses nor cleans a non-empty `--to` destination
**Where:** `rekeyStore` iterates only over **source** records; it never checks the destination is empty
and never removes destination files absent from the source. It already guards `--from === --to`; it
does not guard "`--to` is dirty".
**What happens** (receipt `06-rekey-dirty-destination.txt`): I planted a `FOREIGN1/class.json` sealed
under a **third** key into the destination, then rekeyed a real store into it. The run reports
`20 converted` and plants the canary under the new key; the foreign record **survives**; the resulting
service boots `storeKey: ok, classroomReady: true` while `GET /classes/FOREIGN1` returns 404 — the
record is present but unreadable.
**Why it matters:** BOW's own source data is always re-keyed correctly, so no child's work is lost in
the intended flow. But if the destination happened to be a *previous* BOW store under a different key
(a failed earlier rekey, a wrong `--to`), those classes are present-but-unreadable while health shows
green — the precise "silent failure behind a green light" the canary work exists to prevent. Fix:
refuse a non-empty `--to` (mirror the existing in-place guard), or warn loudly and require `--force`.

### LOW NEW-3 — identity-route class codes skip the door's format check; unsafe input 503s instead of 400
**Where:** `server/handler.ts` validates class codes with `isWellFormedClassCode` at the door and
answers a clean `404` (`liveClass`). `server/identity.ts` does `code = second.toUpperCase()` with no
such check and relies entirely on the store's `segment()` throw as the backstop.
**What happens** (receipt `12-identity-code-failclosed.txt`): a code with a `%` or a null byte reaches
`segment()`, which throws; `index.ts` catches it and returns **HTTP 503**. `..`, `._.`, `a/../b` are
plain 404s; `..%2f..%2fetc` and `AAAA%00` are 503s.
**Assessment:** this is **fail-closed** — no path is built, no file is touched, no data is exposed
(I confirmed no stray files). It is a robustness/consistency defect: an unauthenticated caller can
provoke a 503 (which reads as "service down") on bad input, and the two routers disagree on how a
malformed code is handled. Fix: validate the class code at the identity door too, returning 400/404.

### LOW NEW-4 — stale source comment claims managed at-rest encryption is optional
**Where:** `redisRestStore`'s doc comment (`server/store.ts` ~651) says at-rest sealing on the managed
path is "Optional rather than required." But `storeFromEnvironment` now returns
`unconfiguredStore(NO_STORE_KEY)` for a keyless managed deployment — a key **is** required, and I
verified a keyless managed config refuses. The behavior is correct and safe; the comment is misleading
to an operator or reviewer reading the source and should be corrected.

---

## 4. The four outstanding areas

### (a) `npm run rekey` — attacked as attacker and as operator
Built via `npm run build:rekey`; exercised end-to-end (receipt `04-rekey-properties.txt`). The six
properties the doc promises **hold**:

- **Both keys explicit / nothing inferred from env** — confirmed; but see NEW-1, they are on argv.
- **Nothing mutated in place** — source SHA-256 set byte-identical before/after on the happy path
  **and on every failure path I forced** (unreadable record, planted-tamper resume).
- **Every record verified by digest of decrypted content** — confirmed; a source record that does not
  open under the given key is named and the run aborts (exit 1) rather than finishing incomplete.
- **Canary planted last** — a run that aborts leaves a destination with **no** `_vault-check.json`; I
  pointed the service at that partial directory and it reported `mismatch / classroomReady: false`
  (HTTP 503). *A half-finished directory cannot look complete.*
- **Reversible** — the old directory is untouched; the old key still opens it; the new key reports
  `mismatch` against the old directory and `ok` against the new one.
- **Resumable / idempotent** — second run: `0 converted, 20 already done`.

**Can a partially-converted directory be made to look complete?** Only by an actor who can write the
destination and forge the canary under the new key — which requires the new key, i.e. the operator.
No remote or lower-privilege path. **Can the resume path be satisfied by something planted?** No: the
skip requires the destination file to open under the new key **and** digest-match the source. A planted
file with the same content is a correct conversion; a planted file with different content is
**overwritten** (I verified a new-key-sealed "TAMPERED" record was re-written from source, not skipped).
**A destination already holding a third key's records** — the operator-hazard of NEW-2. **`--from-plaintext`**
opens the source with `acceptLegacyPlaintext`; a sealed-under-a-different-key record mixed into a
plaintext source is refused as unreadable and aborts, so it cannot silently misimport.

### (b) `GET /me/runs/:sessionId` — scoping attacked, holds
Receipt `03-scoping-and-cross-tenant.txt`. The route resolves the seat from the caller's own token,
finds a submission only where `sessionId` matches **and** `seatCode` equals the caller's own seat.

- Second student's run, read by the first, by exact sessionId → **404**.
- Owner reads their own run → **200**. Anonymous → **401**. Teacher token on `/me/runs` → **401**.

A caller can read only submissions filed under a seat they currently hold; a reissued/removed seat drops
the seat→account link, so the prior holder gets 404. I could not read another child's run.

### (c) Read-aloud and glossary — nothing leaves the device, nothing is recorded
Receipt `11-readaloud-nothing-recorded.txt`; the reading test suite passes 50/50 at the pinned SHA
(the working-tree copy fails one glossary test, but that is an **uncommitted** food-truck change, not
HEAD — see §6). The voice is `window.speechSynthesis`; the glossary is a static in-repo dictionary.
`src/student/reading/nothingRecorded.test.ts` mechanically enforces the hard product rule and I read it
independently: the reading directory may import only React, its siblings, `design/reading.css`, and the
pure `domain/scenario/readability` ruler; it may contain **no** `fetch`/`XMLHttpRequest`/`sendBeacon`/
`WebSocket`/`EventSource`; it may **name** no `dispatch`/`evidence`/`submission`/`checkpoint`/
`supportLevel`/`observe` in code; and it may write exactly **one** `localStorage` key
(`bow.reading.v1`). The preference is device-local and, by construction, never enters the evidence log,
a checkpoint, or any teacher surface. **Confirmed: nothing about who used the reading tools leaves the
device or reaches a teacher.** This meets the stated product rule.

### (d) The class-lookup limit — reasoning holds, with one message wrinkle
Receipt `10-lookup-limiter.txt`. `liveClass` charges the **miss** (malformed or non-existent code) and
never the **hit**. First `429` lands at miss #200 (the documented ceiling); a live class returns **200
even after the miss bucket is full**, because a hit never consults the limiter. So the asymmetry does
what it claims: an attacker cannot spend a room's budget to lock the room out of its own class, and a
submission to a live class is likewise never blocked by this bucket.

**Where the premise strains** (the state I was asked to find): "a room hits codes that exist" is false
for a class **deleted mid-lesson** or a **mistyped whiteboard code** — the room then generates *charged
misses* on the shared school-address bucket. This does **not** block valid classes (hits bypass the
check), but once the bucket fills the room sees the alarming "Too many class codes tried from here"
message for the missing/typo'd code instead of a plain "no such class". It self-heals in 15 minutes and
exposes nothing. **An expired class** returns `410` **uncharged** (correct: useless to an enumerator).
**A teacher polling their own class** is a hit, uncharged (correct). I rate the message wrinkle a
usability/observability nit, not a security finding. NEW-4 aside, the design is sound.

### (e) The migration door — gone from any running service
Receipt `07-migration-door-gone.txt`. `acceptLegacyPlaintext` appears only in `rekey.ts` (offline),
the `vault()` definition, and tests. `storeFromEnvironment` always calls `vault(key)` with **no**
options; no environment variable, config, or test helper flips it in a running service. I wrote a
forged **plaintext** `class.json` and booted the real service against it: the record is **not opened**
(`GET` → 404) and health reports `mismatch`. The round-1/round-2 plaintext-downgrade account-takeover
has no runtime path.

---

## 5. My ruling on the keys on argv

**A condition, not a blocker.** The exposure is real and I reproduced it live (NEW-1): both master
keys sit in the world-readable process command line for the duration of a rekey. But it requires a
local shell on a host the operator controls, during a deliberately-stopped maintenance window, and it
leaks nothing over the network and no child's work directly. It does not meet the bar for REFUSE.
It **does** belong in writing as a technical condition, because (i) the keys are the entire security
boundary — decryption of all student data plus token forgery — and (ii) the fix is cheap and the
product already demonstrates the right pattern for the service key (environment, not argv). Require:
keys read from env vars, a key-file path, or stdin before this command is run against real district
data; and update `STORE_KEY_HELP` and the rekey usage text accordingly.

---

## 6. What I could not break

- The traversal fix, under every slash/encoding/backslash/target variant, and I confirmed it does not
  refuse a legitimate `crypto.randomUUID()` sessionId (§2).
- `/me/runs` cross-student read; cross-teacher read/delete/feedback; anonymous write to an open class
  (the roster-enforcement fix) — all **403/404/401** (§4b, §3 receipt).
- The rekey resume/verify path — a planted file cannot cause a source record to be dropped or
  corrupted; the source is untouched on every failure path (§4a).
- The plaintext-record runtime acceptance — refused (§4e).
- The accounts-only wrong-key boot — **fail-closed** (`mismatch/false/false`), closing the round-4
  MEDIUM (receipt `08-accounts-only-fail-closed.txt`).
- Spending a room's budget on the lookup or submission limiters — hits and accepted work are never
  charged (§4d).

I did not achieve any cross-tenant disclosure or destruction of a child's name or work.

## 7. Conditions a district would impose

**Technical, before a pilot:**
1. Stop passing the store keys to `rekey` on argv — read each from an env var, a key-file path, or
   stdin (NEW-1). Highest-value of this round.
2. Make `rekey` refuse (or `--force`-gate) a non-empty `--to` destination (NEW-2).
3. Validate the class code at the identity-route door, so malformed input returns 400/404 rather than
   a 503 exception (NEW-3).
4. Correct the `redisRestStore` comment so it does not tell a reader at-rest encryption is optional on
   the managed path when the code now requires it (NEW-4).
5. Carried, still valid: `BOW_TRUST_PROXY` must equal the *real* number of proxies in front of the
   process. Set it with no proxy present and an attacker controls the entire `X-Forwarded-For`, evading
   every per-address limit (verified: rotating a single spoofed XFF entry evades the miss limiter with
   `BOW_TRUST_PROXY=1` and no real proxy; with a fixed rightmost entry, as a real proxy produces, it
   throttles correctly). Unset (the default) uses the socket and cannot be spoofed.
6. A TLS terminator in front of the loopback HTTP server (the product does not terminate TLS itself;
   §2-d asks for encryption in motion).

**Contractual / operational (the district's to obtain — the software cannot supply these):**
7. A signed DPA with the KV subprocessor covering at-rest encryption, breach notice and deletion; a
   signed Parents' Bill of Rights and staff-training attestation (NY Ed Law §2-d / 8 NYCRR Part 121);
   a written data-retention policy and written information-security program (COPPA §312.8/§312.10);
   full-disk encryption and correct filesystem permissions on any self-hosted box.

**Compliance stance — no assertion of compliance, by instrument:**
- **NY Ed Law §2-d "encryption in its custody":** *partially meets.* Both durable drivers seal every
  record with AES-256-GCM and refuse to boot keyless (verified). The offline rekey means a key change no
  longer forces deleting a term of work. Encryption **in motion** is delegated to an operator-run TLS
  terminator, so the custody obligation is met for passive at-rest theft and **cannot be met by the
  software alone** for the in-motion case.
- **COPPA §312.10 (deletion) / retention:** *meets on the file store* — `DELETE /classes/:code` works
  under authorization (verified) and the 120-day sweep executes; the managed TTL window was not
  exercised on live infrastructure (§8).
- **FERPA / COPPA school-consent / §2-d Part 121 program:** *cannot be met by the software* — these are
  the DPA, the bill of rights, the security program and the school's authority to consent. The product
  makes **no** compliance claim in its own copy (`nysed-2026.ts` is honest: "BOW covers part of one of"
  the five required personal-finance topics), and I am making none here.

## 8. What I did not test

- **A live Upstash/Vercel deployment.** All managed claims are against the real server plus a
  spec-correct understanding of the REST driver; the managed TTL retention window (per-key `EXPIRE`
  bumped 120 days on every write vs. a class's own expiry) remains unexercised on real infrastructure —
  flagged since round 2, still worth a district confirming live.
- **Scrypt memory exhaustion at scale** — deliberately not run on a shared box near its limit; I agree
  with round 4's bounded call.
- **A real appending reverse proxy** for the `BOW_TRUST_PROXY` hop count end-to-end (I exercised the
  pure function and a live single-element spoof).
- **Sustained brute force of the 5-character join space** beyond the limiter threshold.
- **Runtime DOM XSS harness** — prior rounds' static sink audit stands; I did not re-run it.
- **Client-side commits after `d523c94`** (attemptStore/ResumeGate/educator) — outside the security
  surface, which I confirmed unchanged. Note the current working tree is dirty and one glossary test
  fails on an **uncommitted** food-truck change; that is a process observation, not a HEAD defect.
- Domain/scoring/evidence correctness — out of scope for a security review.

---

*Report `gauntlet/critiques/vendor-review-5.md`; receipts `gauntlet/receipts/vendor5/01…12`.
Pinned SHA `d523c94411f149fde23464c2939e05df3b8077f3`; security surface byte-identical at live HEAD `a1ab0cf`.*
