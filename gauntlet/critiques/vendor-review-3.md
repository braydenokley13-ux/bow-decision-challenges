# BOW Decision Challenges — Security & Privacy Vendor Review (Round 3)

**Reviewer role:** fresh-context security/privacy red team, third round. Read-only on product code;
I may write only this file and `gauntlet/receipts/vendor3/`.
**Brief (unchanged):** find a reason a US school district should refuse to deploy this to middle-schoolers.
REFUSE is on the table.
**Pinned snapshot:** every claim is true of commit **`52a03b98d3b5ce03ce37d290057da8308d0e71ed`**
(branch `claude/bow-decision-challenges-gauntlet-pg1522`; contains the lead's `8605d79` fix commit),
extracted with `git archive` to a tree outside the repo and built with `vite build --ssr`. My private
server ran on **:4477** (file store) with data under `.scratch/vendor3/`. Reproduction transcripts are in
`gauntlet/receipts/vendor3/`. Mid-review the coordinator's `pkill` killed my server once; every result
below was re-run afterward with an explicit health check before and after, so **no finding rests on a
request that failed because the process was down** — where a dead process could masquerade as a finding
(a 503, a rate limit, a mismatch) I show the server answering 200 in the same transcript.

---

## 1. Verdict

# DEPLOY WITH CONDITIONS

This is a change from my Round-2 **REFUSE**, and I want to be plain about why, because I came back to
attack the fix, not to bless it. **The two HIGH findings that drove the REFUSE are genuinely closed, on
the bytes** (§2). There is now, for the first time, a deployable configuration that is both functional and
encrypts children's data as advertised: managed (Vercel/Upstash) **with** `BOW_STORE_KEY` seals every
value and derives the signing secret, and refuses to start **without** a key; the self-hosted disk does the
same; and the plaintext-downgrade that turned a single file-write into teacher-account-takeover is refused.
I attacked all of that and could not reopen it.

**Single strongest remaining reason a reviewer would hesitate — but not refuse:** the rate limiter is a
denial-of-service surface. Because the submission limiter is charged **before authentication** and keyed on
a client id that an entire class **behind one NAT shares**, anyone who knows a class code — a number
written on the whiteboard — and sits on the same school network can fire 120 junk POSTs and lock every
child in that class out of turning their work in for ten minutes (§3, NEW-2). That is an availability
problem a district's reviewer would want fixed as a condition of deployment; it is **not** a disclosure of
children's data and not an account compromise, so it does not by itself justify refusing. The remaining
findings are a fragile key-mismatch safety net (NEW-1), an account-enumeration timing oracle on teacher
login (NEW-3), and two low items. None reaches the bar of "a district must refuse," which is the honest
call and the one the evidence supports.

### Severity of findings this round
- **HIGH: 0**
- **MEDIUM: 3** (submission-limiter DoS; canary key-check fails open on one-file loss; login/recovery timing oracle)
- **LOW: 2** (unauthenticated unthrottled class-label enumeration; managed `teacher-email` pointer still unsealed)
- **Caveat / observation: 2** (XFF hop-count misconfiguration re-opens spoofing; `acceptLegacyPlaintext` has no production wiring)

---

## 2. Round-2 findings, re-run against HEAD (closed / partial / not closed)

Full transcript: `gauntlet/receipts/vendor3/04-round2-reverification.txt` (and `01`, `02`, `03`).

| Round-2 finding | Status | Settled by |
|---|---|---|
| **BLOCKER** — plaintext PII/keys/secret at rest (file store) | **CLOSED** | Every product-written file is a sealed `{"v":1,"iv"…}` envelope; grep of the data dir for planted names, the teacher key, and `session-secret` → 0 hits. The only unsealed file present is the one *I* forged for the downgrade re-test, which the product rejects. |
| **HIGH-1** — managed path outage-with-key / BLOCKER-without-key | **CLOSED** | `command()` now sends `JSON.stringify(args)` (only the value is sealed): keyed redis `putClass`+`getClass` **works**, storing a sealed envelope, against a spec-correct mock Upstash. Keyless managed now returns `unconfiguredStore` (refuses to start). `bow:session-secret` is no longer persisted in the KV — it is derived. |
| **HIGH-2** — plaintext downgrade → teacher account takeover | **CLOSED** | Overwrote a sealed teacher record with a plaintext one carrying an attacker-chosen scrypt hash; login with the attacker's password → **401**. A keyed `vault.open()` returns `null` for any non-sealed record. |
| **MEDIUM-3** — leftmost `X-Forwarded-For` rate-limit bypass | **CLOSED** for the default/correct config | Default (`BOW_TRUST_PROXY` unset): 200 wrong joins each with a fresh spoofed XFF → 80×429 (spoof ignored, socket bucket used). `callerOf` counts hops from the right; silly values (`0/-1/abc/1.5/99`) fail safe to the socket. **Residual caveat below.** |
| **MEDIUM-4** — key rotation = silent green over unreadable data | **PARTIALLY CLOSED** | Rotation still destroys access to every class (no re-encryption path), but it now **surfaces**: `GET /health` reports `storeKey:"mismatch"` and **503**. **NEW-1 below** shows the surfacing is defeated by deleting one file. |

The lead's summary of what landed is accurate on the points I could test. In particular the claim that the
managed driver's own test "never caught it because it ran with no key at all" is correct and is the right
root cause; the test is now keyed.

---

## 3. New findings (severity-ordered)

### MEDIUM NEW-1 — The key-mismatch health guard fails **open**: deleting one file turns `mismatch` into `fresh`
**Where:** `server/store.ts` `keyCheck()` reads `_vault-check.json` (file) / `bow:vault-check` (redis). If
the canary is **absent** it returns `"fresh"` (healthy, 200); if present-but-unreadable, `"mismatch"` (503).
It never checks whether class data exists. The canary is planted only by `putClass`.
**Reproduction:** `gauntlet/receipts/vendor3/01-canary-fresh-masks-mismatch.txt` (each server shown
answering before conclusions).
- (A) Wrong key, canary intact → `storeKey:"mismatch"`, `classroomReady:false`, **health 503**, class 404.
  The MEDIUM-4 remediation works as designed.
- (B) Delete the single file `_vault-check.json`, restart with the **same wrong key** → `storeKey:"fresh"`,
  `classroomReady:true`, `ok:true`, **health 200** — while the class is still **404** (data unreadable).
**What it costs the district:** the guard that was added specifically so a botched key rotation cannot
report itself healthy is disarmed by the loss of one predictably-named file — a restore that skips dotfiles,
an `rsync --exclude`, a "clean up BOW's internal files" script, or simply restoring class directories from
one backup and not the canary. It re-creates the exact Round-2 silent-green-over-lost-data state. A safer
design fails **closed**: class directories present but no readable canary should be `mismatch`, not `fresh`.
An attacker with data-dir write gains nothing here they don't already have (they could delete the data
directly), so this is a robustness/operational gap, not an escalation — which is why it is MEDIUM, not HIGH.

### MEDIUM NEW-2 — Submission limiter is a self-DoS / in-room DoS: one class behind a NAT can be locked out of turning work in
**Where:** `server/handler.ts` — `if (!withinRate(`submit:${clientId}:${record.code}`, 120, 10min)) return 429`
is the **first** statement of the submissions route, **before** `readSubmission`/auth. `clientId` defaults to
the socket address, so every student behind one NAT (or one reverse proxy with `BOW_TRUST_PROXY` unset)
shares one bucket, and `withinRate` charges **every** attempt including successes and unauthenticated junk.
**Reproduction:** `gauntlet/receipts/vendor3/02-ratelimit-dos.txt` (health 200 before **and** after, so the
429 is the limiter, not a dead process).
- 28 simultaneous joins + first submissions on one class → all succeed. **Normal single-turn-in load is
  fine** — the coordinator's "a school behind one NAT must not lock itself out" is met for ordinary use.
- An attacker who knows only the public class code and shares the class's NAT fires **120 unauthenticated
  junk POSTs** (all charged, no token needed) → the real student's genuine turn-in then returns **429**
  "Too many submissions from here just now." Every child on that NAT is blocked for the rest of the window.
- A revise-heavy class can also reach it unaided: 28 students × 6 submits = 168 attempts → 48 blocked.
**What it costs the district:** a single malicious device on the school network — or a genuinely active
class that revises and resubmits — can deny turn-ins for a whole class for ten minutes at a time, with no
credentials. The right shape is to charge the submission limiter **after** authentication (so junk and
other students don't count) and/or key it per authenticated student, not per shared network address.

### MEDIUM NEW-3 — Account-enumeration timing oracle on teacher login and recovery
**Where:** `server/identity.ts` login/recovery return an identical body and status for "no such account"
and "wrong password/code" — the stated property is that the endpoint "cannot be used to find out which
teachers exist." But `verifySecret` (scrypt, N=2^15) runs **only** when the account exists.
**Reproduction:** `gauntlet/receipts/vendor3/03-timing-oracle.txt` (account proven to exist via a 201
signup and a 200 correct-password login; server health 200 throughout; both probes return HTTP 401):
- EXISTING account + wrong password → median **385 ms**.
- NONEXISTENT account → median **5 ms**.
- ~**83×** separation. The response shape is identical; the timing is not.
**What it costs the district:** the endpoint is a staff-directory oracle — an attacker enumerates which
institutional email addresses have BOW accounts, which is targeting information for a phishing campaign
against the accounts that hold children's assessed work. It is teacher (adult) metadata, not children's
data, and it does not by itself grant access — hence MEDIUM. Fix: run a scrypt verify against a dummy hash
on the no-account branch so both paths pay the same cost.

### LOW NEW-4 — `GET /classes/:code` is unauthenticated and unthrottled; class labels are enumerable
200 rapid reads of one code → 200×200, 0×429. The response includes the teacher-authored `label`
(e.g., "Ms Rivera Period 2") plus challenge and assignment metadata. The 5-character code space (~9.7M) is
sweepable by a determined attacker with no auth and no rate limit, disclosing class labels across the
deployment. No student names or evidence (those require the key). Low sensitivity, but it is reconnaissance
that pairs with NEW-3. A modest per-address read limit would close it.

### LOW NEW-5 — Managed `teacher-email` pointer is still stored unsealed even with a key
In `redisRestStore.putTeacher`, `teacher-email:<sha256(email)> = record.id` is written as the raw id (not
`put()`), so with a key present the email→account mapping is plaintext to the subprocessor. The id is opaque
and the email is hashed, so this is low-impact, but it contradicts the "seal every value" invariant the fix
otherwise now holds (the `teacher-classes` index was correctly sealed). Subprocessor/DPA territory.

### Caveats / observations (not defects, but a reviewer should know)
- **XFF hop-count is now an operator footgun.** `callerOf` trusts `BOW_TRUST_PROXY` places in from the
  right. Set correctly against a proxy that actually appends the client IP, it is safe. Set to a count the
  proxy chain does not append to — including `1` when the request can reach the node without traversing the
  appending proxy, or any overcount — the selected entry is attacker-chosen again (table in receipt 04).
  Invalid/silly values fail safe to the socket. Document the exact value per deployment topology.
- **`acceptLegacyPlaintext` has no production wiring.** Its only non-test caller is `vault(key, options)`,
  and `storeFromEnvironment` calls `vault(key)` with no options and reads no env var for it. So the
  one-boot migration door the vault docstring describes cannot actually be opened by an operator in the
  shipped binary — which is good for security (the forgery window is unreachable) but means the documented
  migration path is, as written, not invocable. Worth reconciling doc and code before a district relies on it.

---

## 4. What I could not break (re-tested, not re-asserted)

Receipt `gauntlet/receipts/vendor3/05-could-not-break.txt`.
- **Class annexation via `POST /classes/:code/claim`.** A self-signed-up teacher with no key tried to claim
  an account-less class by code alone → **403**. A blanket `opensClass()` gate (`handler.ts:417`) fronts
  claim and every mutating route, so claiming still requires the teacher key. The stated model holds; the
  first reviewer's "no cross-teacher disclosure" survives.
- **File-store concurrency, a class of thirty inside one minute.** 30 distinct concurrent submissions → 30
  files; 10 racing writes to the same seat+session → one idempotent record; 31 readable back, none corrupt,
  zero leftover `.tmp`. `writeAtomic` (temp + rename) is sound under load.
- **Stored-name / label XSS.** No `dangerouslySetInnerHTML`/`innerHTML`/`insertAdjacentHTML`/`document.write`
  anywhere in `src`; names render through React text interpolation and server-side `cleanDisplayName`; no
  user data reaches an href/src/attribute sink.
- **Session token tamper family** — payload swap, empty signature, self-minted unsigned token all → 401.
- **No model / third-party egress** — every front-end fetch is same-origin `CLASS_API_BASE`; only server
  outbound is the configured KV. No student writing leaves to any model.
- **Recovery correctness** — a used recovery code is consumed (its hash overwritten) and recovery rotates
  `sessionGeneration` (+1), ending every prior session. (Its entropy was adequate in Round 2.)
- **Downgrade, keyless managed, silent-green rotation** — the three Round-2 holes, all confirmed shut (§2).

---

## 5. Conditions to deploy

**Technical (fix before a pilot; none is a REFUSE, but a district reviewer should require them):**
1. Charge the submission limiter **after** authentication and key it per authenticated student, not per
   shared network address — so junk and classmates cannot exhaust a class's turn-in window (NEW-2).
2. Make the key-check fail **closed**: class data present but no readable canary ⇒ `mismatch`/503, not
   `fresh`/200 (NEW-1).
3. Equalize the login/recovery timing so no-account and wrong-password pay the same scrypt cost (NEW-3).
4. Add a modest per-address read limit to `GET /classes/:code` (NEW-4); seal the managed `teacher-email`
   pointer (NEW-5).
5. Provide a supported **key-rotation / re-encryption** procedure. Rotation still means total data loss
   today (now loud, not silent — but still a term of work gone). This remains the sharpest operational
   risk after the DoS: a district cannot respond to a suspected key compromise without destroying records.
6. Reconcile the `acceptLegacyPlaintext` documentation with the absence of any wiring to enable it.

**Contractual / operational (unchanged from Rounds 1–2, still the district's to obtain):**
7. A signed DPA with the KV subprocessor (at-rest encryption, breach notice, deletion); a signed Parents'
   Bill of Rights and staff-training attestation (NY Ed Law §2-d); a written data-retention policy and
   written information security program (COPPA §312.10 / §312.8). Full-disk encryption and correct
   filesystem permissions on any self-hosted box; a TLS terminator in front of the loopback HTTP server.

**Compliance stance (unchanged, no assertion made):** I am not asserting BOW is or is not FERPA / COPPA /
§2-d / Part 121 compliant. On the instruments I checked against primary text (COPPA §312.10 deletion; NY Ed
Law §2-d "encryption … in its custody"): the durable stores now **partially meet** the §2-d at-rest
obligation for the passive-theft case (AES-256-GCM, both drivers keyed, keyless refused) — a real
improvement over Round 2, where the managed keyless path **could not meet** it — and the file-store 120-day
sweep **meets** the §312.10 deletion obligation. These are technical determinations about the code, not a
compliance opinion; encryption-in-motion and the retention behaviour of the managed TTL path remain the
district's to verify.

---

## 6. What I did not test

- **A live Upstash/Vercel deployment.** HIGH-1's re-verification is against a spec-correct mock KV and by
  reading `command()`/`storeFromEnvironment`/`api/[[...route]].ts`. A district should confirm the keyed
  managed path works, and re-check the managed TTL retention window (per-key `EXPIRE` bumped 120 days on
  every write can outlive the class's own window — a Round-2 note I did not exercise live this round).
- **The XFF "correct proxy" path end-to-end** — I demonstrated the default and the misconfiguration cases
  via the pure `callerOf` and a live spoof test, but did not stand up a real appending proxy in front.
- **Sustained brute force of the 5-char join space** against a live class beyond the limiter threshold.
- **The educator React surface rendering** beyond a static sink grep (no runtime DOM XSS harness).
- **Physical/social** aspects of the one-time recovery code.
- I did not re-audit domain/scoring/evidence correctness — out of scope for a security review.

---

*Files: report `gauntlet/critiques/vendor-review-3.md`; receipts `gauntlet/receipts/vendor3/01…05`.
Pinned SHA `52a03b98d3b5ce03ce37d290057da8308d0e71ed`.*
