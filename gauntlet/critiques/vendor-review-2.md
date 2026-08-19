# BOW Decision Challenges — Security & Privacy Vendor Review (Round 2)

**Reviewer role:** fresh-context security/privacy red team, second round. Read-only on product code;
I may write only this file and `gauntlet/receipts/vendor2/`.
**Brief:** find a reason a US school district should refuse to deploy this product to middle-schoolers.
**Pinned snapshot:** every claim below is true of commit **`300ce6280970405ec4fcd9d884c398ddd922b00f`**
(branch `claude/bow-decision-challenges-gauntlet-pg1522`), extracted with `git archive` to a tree outside
the repo and built with `vite build --ssr`. My private server ran on **:4477** (file store) with data under
`.scratch/vendor2/`; I did not touch any other agent's server or data. Reproduction transcripts are in
`gauntlet/receipts/vendor2/`.

---

## 1. Verdict

# REFUSE

**Single strongest reason:** *There is no deployable configuration of this product that is both functional
and encrypts children's data the way the product says it does.* The managed deployment — Vercel/Upstash,
the exact "defensible pilot" path the first reviewer signed off on — is broken in one of two ways depending
on a single environment variable, and there is no third option. Set `BOW_STORE_KEY` (the security-conscious
choice the code urges) and **every request 503s**: the Redis driver seals the entire command envelope with
AES-GCM, so Upstash receives ciphertext it cannot parse and rejects every `SET`/`GET`. Leave `BOW_STORE_KEY`
unset (the working choice) and the deployment stores every child's name and evidence as **plaintext JSON in
the KV** *and persists the session-signing HMAC secret in the same KV in plaintext* — which is the original
Round-1 BLOCKER ("the signing secret every token is signed with, beside the data it protects; one read =
mint a token for anybody") reproduced verbatim on the path the district was told to use. The self-hosted
file store, meanwhile, did close its at-rest confidentiality gap — but its newly-advertised tamper-evidence
is false: anyone who can *write* a single file in the data directory (no key needed) downgrades a sealed
record to plaintext and takes over a teacher account. Round 1's BLOCKER was closed on one driver and
re-opened, in two different shapes, on the two others. A district cannot deploy any durable configuration
of this without accepting either an outage or an unencrypted store of children's PII plus a token-forgery
key. That is a refuse.

To be fair to the work: the file-store at-rest sealing and the 120-day deletion sweep are **real and I
verified them** (§2, receipts 01 and 05A). The problem is not that nothing was fixed; it is that the fix
shipped a managed path that cannot run encrypted and a file path whose encryption a single write undoes.

### Severity of new findings
- **HIGH: 2** (managed path outage-or-BLOCKER; file-store plaintext downgrade → account takeover)
- **MEDIUM: 2** (X-Forwarded-For rate-limit bypass; store key is unrotatable without total silent data loss)
- **LOW: 2** (managed metadata stored unsealed even with a key; misleading green health after key loss)

---

## 2. The previous BLOCKER: **closed on the file store, re-opened on the managed store**

Round-1 BLOCKER-1 was two claims — (a) student names, teacher keys, and the token-signing secret written
in plaintext on disk, and (b) nothing ever deletes expired class data.

**On the file store, both are genuinely closed.** Receipt `01-at-rest-sealed.txt`:
- Every file body on disk is an AES-256-GCM envelope `{"v":1,"iv":…,"tag":…,"ct":…}`. I created a class, a
  four-child roster with distinctive names ("Aaliyah Okonkwo-Reyes" …), a teacher account, and a submission
  containing the free-text string "medical bill". Grepping the entire data directory for the names, the
  teacher key `E4WHT9ATMKGTHMT77EDA7H9C`, a join code `ENNXF`, the teacher email, and `session-secret`
  returns **zero hits in every case**. No file escapes the seal.
- The session-signing secret is **not on disk** — `find` for `*session*` returns nothing. It is derived
  (`vault.derive("session")` = HMAC over `BOW_STORE_KEY`), as claimed.
- Receipt `05-retention-and-key-rotation.txt` §A: `sweepExpiredClasses` run against a store holding one
  past-expiry class and one live class **deleted the expired class's directory and its indexes**
  (`getClass → null`) and left the live one intact. It deletes, it does not mark. The file-store timer
  (`startRetentionSweep`, hourly, unref'd, started at boot) and the serverless `sweepIfDue` both call it.
- `storeFromEnvironment` refuses to start a keyless disk store — confirmed: keyless boot reports
  `unconfigured`, health 503, class creation 503 (transcript in `.scratch/vendor2/keyless.log`).

**But the same BLOCKER is alive on the managed store** (receipt `03-managed-path-broken-or-blocker.txt`),
and the managed store is the one the first review treated as the recommended pilot. See HIGH-1 below. The
lead's summary — "the durable file store now seals every value; the session secret is derived, not stored"
— is true *of the file store* and is silent about the fact that the managed driver runs keyless by design
and puts the same secret back on disk in the KV. Treating the fix as closing the BLOCKER is only correct
for one of three drivers.

---

## 3. New findings (severity-ordered)

### HIGH-1 — The managed deployment cannot run encrypted; unencrypted, it reproduces the Round-1 BLOCKER
**Where:** `server/store.ts` `redisRestStore()` — `command()` sends `body: put(args)`, and
`put = keeper ? keeper.seal(value) : JSON.stringify(value)`. `storeFromEnvironment` builds
`redisRestStore(url, token, keeper)` with `keeper` present iff `BOW_STORE_KEY` is set; `api/[[...route]].ts`
(the Vercel function) calls the same `storeFromEnvironment`.
**Reproduction:** `gauntlet/receipts/vendor2/03-managed-path-broken-or-blocker.txt`, against a spec-correct
mock Upstash (body must be a JSON command array, else 400 — matching the real REST API).

- **With `BOW_STORE_KEY` set:** `put(args)` seals the *whole command array* into an AES-GCM envelope. Upstash
  receives `{"v":1,"iv":…}` where it expects `["SET","key","value"]`, returns 400, and `command()` throws.
  `putClass → 400`, `getClass → 400`. **Every store operation fails; the service is a total outage.** A
  district that follows the product's own security guidance (set a key so the data is ciphertext to the
  subprocessor) gets a deployment that cannot start a single class. This is not a corner case — it is what
  happens the first time anyone hardens the managed deployment.
- **Without `BOW_STORE_KEY` (the config that actually works):** teacher records, rosters (child names), and
  evidence are written as **plaintext JSON** to the KV, and `sessionSecret()` mints a random secret and
  **persists it in the KV at `bow:session-secret` in plaintext**. I reproduced all of it: the mock KV ends
  holding `teacher:… = {"email":…,"passwordHash":…}`, `roster:… [1] = {…"displayName":"Jane Doe (a child)"}`,
  and `bow:session-secret = h5aSGnSdTE1g…`. Anyone who reads the KV (a leaked Upstash token, a subprocessor
  incident, a snapshot) gets every name and the ability to forge a valid token for **any teacher or student
  in the deployment** — the exact "own the district" the Round-1 BLOCKER described.

**What it costs the district:** the recommended deployment path is a choice between "does not run" and
"stores children's PII and a master token-forgery key unencrypted at a third party." There is no
configuration that is both up and encrypted.
**Obligation:** NY Ed Law §2-d requires a contractor to "use encryption technology to protect data … in its
custody." The keyless managed path **cannot meet** the at-rest custody obligation (technical gap: plaintext
in KV); the keyed managed path meets it only by not functioning. At-rest encryption at the subprocessor is
also partly a DPA/contractual control — but a code path that silently stores the *signing secret* beside the
data is a technical defect, not a paperwork one.

### HIGH-2 — File-store plaintext downgrade: a single unauthenticated *write* → teacher account takeover
**Where:** `server/vault.ts` `open()`: `if (!isSealed(parsed)) return parsed as T;`. The migration
affordance for legacy plaintext is also a downgrade oracle. The vault's own docstring claims the opposite —
"a record edited on disk fails to open rather than opening as something else — which matters here because
these files are read back as authorisation decisions." That claim is false.
**Threat actor:** someone who can **write** the data directory but does **not** hold `BOW_STORE_KEY`. This is
inside the threat model Round 1 itself adopted ("one restored volume … or one path-traversal elsewhere on
the host"): a read-write NFS/SMB mount, a co-tenant process, a backup/restore staging host, a path-traversal
*write* in any other service on the box, a low-privilege insider with filesystem but not secret-manager
access. The seal defends the *read-only* thief; it does nothing against this actor.
**Reproduction:** `gauntlet/receipts/vendor2/02-downgrade-account-takeover.txt`.
1. The teacher record on disk is sealed ciphertext — the attacker cannot read it.
2. Not needing to: they overwrite `_accounts/teachers/<id>.json` with a **plaintext** record
   `{"id":…,"email":"marisol.quintanilla@ps118.example.edu","passwordHash":"<scrypt hash of a password THEY
   chose>","recoveryHash":…}`. The id is the filename; the email is a school address (guessable/enumerable).
3. They POST `/api/auth/teacher/session` with `password:"attacker-known-pw-999"` and get **HTTP 200 + a valid
   teacher token**.
4. `GET /api/me/teaching` returns the real teacher's classes **including the teacher key**.
5. `GET /api/classes/<code>/submissions` returns the **decrypted evidence room** the seal was meant to
   protect — every child's name and written work, served in cleartext to the forged identity.

The GCM auth tag provides zero integrity here because the attacker simply does not use the sealed envelope.
The encryption gives confidentiality against a passive disk image but converts "can write one file" into
"full application-level account takeover + plaintext PII read." The advertised authenticated-store guarantee
is not one.
**Fix direction (for the lead, not me):** once a deployment has a key, `open()` must **reject** non-sealed
records (or bind a per-deployment version/AAD that a forged plaintext cannot satisfy), with a one-time,
explicit migration flag for the legacy-plaintext window — not an always-on downgrade.

### MEDIUM-3 — `X-Forwarded-For` spoof defeats every per-address rate limit
**Where:** `server/index.ts` sets `clientId` from `x-forwarded-for.split(",")[0]` (the **leftmost**, i.e.
client-controlled, value) when `BOW_TRUST_PROXY=1`; `api/[[...route]].ts` does the same **unconditionally**
on Vercel. Rate-limit buckets are keyed on `clientId`.
**Reproduction:** `gauntlet/receipts/vendor2/04-xff-ratelimit-bypass.txt` (my server ran `BOW_TRUST_PROXY=1`).
- 130 wrong join attempts from a *fixed* spoofed `XFF` → the limiter trips (429), as designed.
- 300 wrong join attempts, each with a *fresh* spoofed `XFF` → **0 of 300 blocked**. Every per-address
  ceiling (join brute-force 120/10min, login 300/15min, signup 60/h, submissions 120/10min) is bypassed by
  rotating one header the client sets.
**Why it bites:** the code repeatedly calls this limiter "the only thing standing between an unauthenticated
endpoint and a script." Wrong join codes are cheap on the server too (no scrypt runs unless the keyed index
matches), so unbounded join guessing against a known 5-character class code is now practical — as is
per-account teacher lockout at scale and signup/submission flooding. The **inverse** misconfiguration is
also bad: with `BOW_TRUST_PROXY` *unset* behind a reverse proxy, `remoteAddress` is the proxy's single IP,
so the whole district collapses into **one** bucket and one script (300 failed logins) can 429 every
teacher's login at once. Correct handling is to count trusted proxy hops from the right, not trust the
leftmost value. This is a DoS surface, and it also weakens the brute-force defence the whole design leans on.
**Cost:** a single classroom device, or anyone on the internet who knows a class code, can lock a class out
of joining or grind join codes; a district behind one NAT can be self-DoS'd by the mis-set flag.

### MEDIUM-4 — `BOW_STORE_KEY` cannot be rotated without total, silent data loss; incident response is impossible
**Where:** `vault.open()` returns `null` on a key mismatch (reads are authorization decisions, so this reads
as "no such record"). `STORE_KEY_HELP` says the quiet part: "changing it means every existing class becomes
unreadable." There is no re-encryption/migration path.
**Reproduction:** `gauntlet/receipts/vendor2/05-retention-and-key-rotation.txt` §B/§C.
- Reading the *same* sealed data directory with a rotated key: `getClass("9EVY6") → null`, `listRoster → []`.
  Every class silently vanishes.
- A server started on the same data dir with a fresh key reports `GET /api/health → ok:true,
  classroomReady:true, "Classes are kept in the file store for 120 days"` while `GET /api/classes/9EVY6 →
  404`. The failure is invisible to a smoke test.
**Why it bites:** the store key is now the entire system — confidentiality key, session-signing secret, and
blind-index key all derive from it. Its compromise is a full compromise, and the one action a district must
take after a suspected key compromise — **rotate the key** — destroys every class's data. A control you
cannot rotate without deleting the records it protects is not an incident-response posture; under §2-d's
breach-response expectations it is the wrong shape. (It is also a single point of total failure: lose the
key, lose every class, with a green health check.)

### LOW-5 — Managed store leaves account-linking metadata unsealed even when a key is present
**Where:** in `redisRestStore`, `putTeacher` writes `teacher-email:<sha256(email)[:32]> = record.id`
(plaintext id, not `put()`), and `linkClassToTeacher` writes `JSON.stringify({code})` (not `put()`). So even
in the (non-functional, but intended) keyed managed config, the email→account and account→class-codes
linkage is plaintext. `sha256(email)` over a district's known staff-email format is enumerable, so a KV
reader can confirm which teachers have accounts and map them to class codes. The "seal every value" claim is
not true on this driver. (Also cosmetic: a dead `void plainVault;` statement sits inside the driver.)
This is subprocessor/DPA territory and low-impact, but it contradicts the stated invariant.

### LOW-6 — API JSON responses carry no `Cache-Control: no-store` on the Vercel path
`server/index.ts` sets `Cache-Control: no-store` on API responses; the Vercel function
(`api/[[...route]].ts`) sets only CORS headers, and `vercel.json` sets `no-store` nowhere. Student evidence
JSON returned by the serverless deployment relies entirely on Vercel not caching function responses by
default. Worth pinning explicitly rather than inheriting from platform defaults on a product holding
children's assessed work.

---

## 4. What I could not break (re-tested, not re-asserted)

Receipt `06-could-not-break.txt`.
- **Token tamper family.** HMAC-SHA256 over the base64url payload, no `alg` field. Payload swapped to a
  teacher id with the old signature → 401. Empty signature → 401. Self-minted unsigned teacher token → 401.
  The `readToken` verify-before-parse order holds; the identity-code changes did not regress it.
- **No model / third-party egress.** Every front-end `fetch` targets `CLASS_API_BASE` (same origin). The only
  server outbound is the configured KV REST call. Runtime dependencies remain four (react, react-dom,
  react-router-dom, vite). No analytics, CDN, fonts, or trackers. **No student writing is sent to any model.**
  This is the product's strongest privacy property and it still holds.
- **Blind index is blind against a read-only thief.** `joinCodeIndex` is an HMAC keyed by a secret derived
  from `BOW_STORE_KEY`, and it lives *inside* sealed roster files. Both the index values and the key are
  unavailable to a disk thief, so there is no rainbow-table enumeration of the 5-character join space from a
  stolen file store. (It is defeated only through the write-downgrade of HIGH-2, which defeats everything.)
- **Recovery-code entropy is adequate.** `newRecoveryCode()` yields a 36-char-alphabet code, mostly 19–20
  chars, backed by 15 random bytes and stored scrypt-hashed; recovery is rate-limited per account. Not
  online- or offline-brute-forceable. (Its *operational* shape — one-time, no email, unrecoverable if the
  teacher loses it, returned in the HTTP response body — is a resilience concern, not a crypto one.)
- **File-store at-rest confidentiality and 120-day deletion**, re-verified as in §2.

---

## 5. Conditions a district would have to impose to deploy

These are the conditions under which the REFUSE could become DEPLOY-WITH-CONDITIONS. As shipped at
`300ce62`, they are not met.

**Technical (must be fixed in code before any pilot):**
1. **Fix the managed driver.** Stop sealing the command envelope (`body: put(args)`); seal *values* only, so
   the keyed managed path runs at all. (HIGH-1)
2. **Encrypt the managed path, or refuse to run it unencrypted.** As long as keyless managed is allowed, the
   session secret must not be persisted in the KV in plaintext, and names/evidence must be sealed. Ideally
   the managed store refuses to start keyless exactly as the file store does. (HIGH-1)
3. **Close the downgrade.** With a key present, `open()` must reject non-sealed records; provide an explicit,
   one-shot legacy-migration flag instead of an always-on plaintext passthrough. (HIGH-2)
4. **Trust proxy headers correctly** — count hops from the right / use the platform's verified client-IP —
   so the rate limit cannot be bypassed by a client-set `X-Forwarded-For`, and cannot collapse a district to
   one bucket. (MEDIUM-3)
5. **Provide a key-rotation path** that re-encrypts existing records (or an explicit, supported re-key
   procedure), and make health report unreadable data as unhealthy rather than green. (MEDIUM-4)
6. Seal the managed account-linking metadata; set `no-store` on the serverless API responses. (LOW-5/6)

**Contractual / operational (necessary but not sufficient):**
7. A signed DPA with the KV subprocessor covering at-rest encryption, breach notice, and deletion; a signed
   Parents' Bill of Rights and staff-training attestation (§2-d); a written data-retention policy and written
   information security program (COPPA §312.10 / §312.8). These were open in Round 1 and remain the
   district's to obtain — but note that item 7 cannot paper over items 1–3: a DPA does not make a plaintext
   signing secret in the KV, or a plaintext-downgrade takeover, acceptable.
8. Full-disk encryption and strict filesystem permissions on any self-hosted box, and a TLS terminator in
   front of the loopback HTTP server (§2-d "in motion"). FDE materially reduces — but does not eliminate —
   HIGH-2, because the downgrade needs a *logically* writable data directory, not raw disk access.

**Compliance statements I will not make and the product may not make:** I am not asserting BOW is or is not
FERPA/COPPA/§2-d/Part 121 compliant. On the instruments I checked against the primary text: the file store
now **partially meets** §2-d "encryption … in its custody" for the passive-theft case (AES-256-GCM), but
**cannot meet** it on the keyless managed path (plaintext in KV) and undercuts it on the file path via
HIGH-2; the 120-day sweep **meets** the COPPA §312.10 deletion obligation *on the file store* but the
managed path relies on per-key TTLs that are bumped 120 days forward on every write, so late-written evidence
can outlive the class's stated window (a retention **partial-meet** on the managed path, worth a district's
attention). These are technical determinations about the code, not a compliance opinion.

---

## 6. What I did not test

- **A real Upstash/Vercel deployment.** HIGH-1 is reproduced against a spec-correct mock (body-must-be-a-
  command-array, 400 otherwise) and by reading `command()`/`storeFromEnvironment`/`api/[[...route]].ts`. I
  did not have live Upstash credentials; a district should confirm the outage against a real KV in one
  command. The keyless-plaintext half I reproduced fully.
- **The front-end / React render path** for stored-name XSS. Round 1 tested it and found React escaping
  sufficient; I did not re-run it and rely on that baseline.
- **The `redis` retention/TTL behavior end-to-end** against a live KV (the per-key `EXPIRE = now+120d`
  bump is read from code, not exercised).
- **Concurrency / atomic-rename races** on the file store under real 30-way simultaneous submission (I
  reasoned about `writeAtomic` but did not load-test it).
- **The Vercel static-asset CSP and header set** beyond reading `vercel.json`.
- **Physical/again-social** aspects of the one-time recovery code (screenshots, help-desk flows).
- I did **not** re-audit the domain/scoring/evidence code for correctness — out of scope for a security review.

---

*Files: report `gauntlet/critiques/vendor-review-2.md`; receipts `gauntlet/receipts/vendor2/01…06`. Pinned
SHA `300ce6280970405ec4fcd9d884c398ddd922b00f`.*
