# Recon — Security & Privacy critique

Role: fresh-context security/privacy critic. Mandate: find a reason a school district should
refuse to deploy this, assuming minors use it. Authorised localhost testing for a vendor
review. App `http://127.0.0.1:4173`, class API `http://127.0.0.1:4180`, file store, seeded
class `7XCWD`.

---

## SUMMARY

The product's *confidentiality* posture is genuinely good and I could not break it: no XSS
(React escaping holds end-to-end), strict class/teacher-key isolation, no path traversal,
no secrets in repo or bundle, **no third-party/analytics/LLM data path at all**, near-zero
logging, and an env layer that fails closed. Those held up under real requests, not just on
paper.

The problem is *integrity, abuse, and data-governance*, and it is structural to the "the
class code is public" design:

1. **Anyone who sees the class code can write to the class, unauthenticated, with no rate
   limit, cross-site with no CORS preflight.** I injected 200 submissions in 8.5s and forged
   a submission from origin `https://evil.example`. A code that by design goes on a
   whiteboard is a public write token. This pollutes the teacher's evidence room with fake
   or abusive submissions attributed to real seat numbers, and is a disk/memory DoS. This is
   my nominated **deployment-blocking** finding.
2. **There is no deletion path and retention is not enforced on the file store.** Zero
   `DELETE` handlers, zero purge/unlink anywhere; "expired" classes return `410` but their
   JSON stays on disk forever. A district cannot honour a FERPA/COPPA/state-law deletion
   request. **High, arguably blocking** for any district with a legal deletion obligation.
3. **The teacher key — the only credential — travels in the URL query string** (`?key=`) and
   is echoed back in the authenticated evidence-room response body. **Medium.**

XSS, the headline thing I was told to chase, is **sound**: I submitted `<img onerror>`,
`<script>`, and a `javascript:` link as a student's written defence and confirmed in a real
Chromium that the teacher's page renders it HTML-escaped and executes nothing.

Net recommendation to a district: **do not deploy as-is for classes of minors** until
unauthenticated writes are rate-limited/abuse-controlled and a data-deletion path exists.
Everything blocking is fixable; none of it is XSS or data-exfiltration.

---

## WHAT I PERSONALLY REPRODUCED (commands + outputs)

All against the running services. Seeded key `YJ3VXQMQQPVHJ9UCHRVVND9R`.

### Auth / isolation — SOUND

```
GET /api/classes/7XCWD (no key)         -> 200, returns label+challenge+assignments, NO submissions, NO teacherKey
GET /api/classes/7XCWD/submissions      -> 403 not_authorised (no key)
   "                    (wrong key)      -> 403
   "                    (correct key)    -> 200, 15 submissions
POST /api/classes -> new class KDHMU, key 7Q7NPAXHPADTPJRAKADED3FF
GET 7XCWD/submissions with KDHMU's key  -> 403   (teacher key A cannot open class B)
GET KDHMU/submissions with 7XCWD's key  -> 403   (and vice versa)
```

### Unauthenticated write + impersonation — BROKEN

Crafted a minimal valid submission (only `log[].type` is validated; everything else is
stored verbatim) as **seat 99 with no teacher key**:

```
POST /api/classes/7XCWD/submissions  (no key)  -> HTTP 202 Accepted {"seatCode":"99",...}
read back with key -> seat-99 submission present, payload stored verbatim
```

### No rate limiting / flooding — BROKEN

```
200 unauthenticated POSTs to class KDHMU, distinct seats/sessions:
  accepted=200 rejected=0  elapsed=8.5s
  submissions now in class: 200   files on disk: 200
```
No throttle, no CAPTCHA, no per-IP or per-class cap.

### Cross-origin forgery (CSRF, no preflight) — BROKEN

```
OPTIONS .../submissions  Origin: https://evil.example
  -> 204, Access-Control-Allow-Origin: https://evil.example   (arbitrary origin reflected)
Simple POST, Content-Type: text/plain, Origin: https://evil.example, JSON body:
  -> HTTP 202 Accepted
```
`text/plain` is a CORS "simple request" so **no preflight fires**; the server parses it as
JSON regardless of content-type. Any web page a student/teacher visits can silently inject
submissions into any class whose code it knows.

### Submission overwrite (mechanism) — CONFIRMED, then restored

Dedup key is `(seatCode, sessionId)`; re-posting the same pair overwrites in place:

```
seat-3 original defence: "Basketball seat 3: I kept the backup money ..."
POST seat 3 / session-00000003 with text "DEFACED BY ATTACKER — knew only the whiteboard code" -> 202
seat-3 text AFTER  : "DEFACED BY ATTACKER — knew only the whiteboard code"
seat-3 count AFTER : 1   (overwrote, did not duplicate)
restore original    -> 202 ; seat-3 text back to original
```
Caveat: this worked because the **seed uses sequential `session-0000000N` ids**. Production
generates `crypto.randomUUID()` (122-bit) client-side, so a *targeted* overwrite of a
specific real student is not feasible for an outsider — but *untargeted injection of new
submissions for any seat* (above) needs only the class code.

### XSS end-to-end — SOUND

Submitted as a student's written defence:
`<img src=x onerror="window.__XSS_FIRED=1;document.title='XSS-SEAT-99'"><script>...</script><a href="javascript:alert(1)">`.
Stored verbatim (confirmed via API). Then drove real Chromium (`.scratch/xss_probe.mjs`) to
the teacher class overview, student page, reading queue, debrief:

```
student page blockquote innerHTML: "&lt;img src=x onerror=... &lt;script&gt;..."
window.__XSS_FIRED = 0   window.__XSS_SCRIPT = 0
document.title unchanged   img[src=x] count = 0   dialogs = []   pageerrors = []
```
React renders it as text. No `dangerouslySetInnerHTML`/`innerHTML` anywhere in `src/`. No
student data ever flows into an `href`/attribute sink (the only `href=` sinks are static
framework URLs).

### Malformed identifiers / traversal — SOUND

```
GET /api/classes/../../etc/passwd            -> 404
GET /api/classes/..%2f..%2fetc%2fpasswd      -> 404
GET /api/classes/%2e%2e%2f%2e%2e             -> 404
GET /api/classes/7XCWD%00                    -> 404
GET /api/classes/<5000 A's>                  -> 404
GET /api/classes/7XCWD/../KDHMU/submissions  -> 403 (normalised to KDHMU, needs key)
GET /api/classes/7xcwd   and  7-X-C-W-D      -> 200 (case/dash-insensitive by design)
GET /api/classes/<24-char string>            -> 404 (class code must be length 5)
No files written outside .bow-classes; no passwd/traversal artifacts in store root.
```

### Error handling / availability — SOUND

```
POST malformed JSON              -> 400 {"error":"bad_request","message":"That request could not be read."}  (no internals)
POST depth-100000 nested JSON    -> 400 ; health after = 200 (server survives)
POST 5001-event log              -> 400 (5000 cap)
POST ~4.8MB body                 -> 400 ; POST 5MB body -> 400 (4MB cap) ; health after = 200
POST valid ~3.2MB / 5000 events  -> 202 (accepted, stored)
```

### Env fail-closed — SOUND (and good)

```
BOW_EPHEMERAL_DISK=1 (no allow flag): store=unconfigured, health 503, POST /classes -> 503 refuse
BOW_CLASS_STORE=memory             : ok:true but durable=false, classroomReady=false
BOW_EPHEMERAL_DISK=1 + ALLOW=1     : file store but durable=false, classroomReady=false
```

### Secrets / third parties / logging — SOUND

```
grep repo + built dist/ for keys/tokens/hosts -> none; no .env files; .bow-classes gitignored
client bundle external URLs -> only w3.org / reactjs.org / reactrouter.com / nysed.gov (doc links)
client fetch targets -> only ${CLASS_API_BASE}=/api (same origin). localOnlyTransport keeps data on device.
server logging -> a single startup line; NO request/PII/evidence logging anywhere.
```

### Teacher-key exposure — CONFIRMED

```
Teacher reaches queue at /educator/class/7XCWD/reading?key=YJ3VXQMQQPVHJ9UCHRVVND9R   (key in URL)
GET /submissions body -> class.teacherKey = "YJ3VXQMQQPVHJ9UCHRVVND9R"  (echoed back, behind auth)
```

Seed left clean: my 7XCWD injections removed, seat-3 restored, 15 submissions on disk.
(Test class `KDHMU` I created remains — there is no deletion path to remove it, which is
itself finding F2.)

---

## FINDINGS

### F1 — Unauthenticated, unthrottled, cross-site-forgeable writes to any class — DEPLOYMENT-BLOCKING
- **Repro:** the "no key" 202s, the 200-in-8.5s flood, and the `evil.example` `text/plain`
  202 above.
- **Why it's structural:** the class code is *designed* to be public (whiteboard). `POST
  /classes` and `POST /classes/:code/submissions` require no credential; content-type is not
  enforced so cross-origin writes skip the CORS preflight; there is no rate limit, no proof
  a submission came from a student, and no binding between a seat number and a person.
- **District impact:** anyone who photographs/overhears the code — or any web page a child
  visits — can flood a class with fake submissions attributed to **real seat numbers**,
  including harassing or offensive written "defences" that a teacher then reads on screen and
  grades against. It is also a disk-fill / memory-amplification DoS (see F3). For a tool used
  by minors where the join token is public by design, this is a legitimate reason to refuse.
- **Minimal fix:** rate-limit writes per class + per IP; add a lightweight join step that
  mints a short-lived per-seat token the submission must carry; reject non-JSON content-type
  and stop reflecting arbitrary CORS origins (allowlist the app origin). None changes the
  no-accounts model.

### F2 — No deletion path; retention not enforced on the file store — HIGH (arguably blocking)
- **Repro:** `grep` shows **0** `DELETE` handlers and **0** purge/unlink/sweep in
  `server/`, `api/`, `src/platform/classes/`. Expired classes return `410` (I read the code
  path) but their JSON is never removed. The Redis driver sets a TTL; the **file driver — what
  a self-hosting district gets — never deletes**.
- **District impact:** no way to honour a FERPA/COPPA/state-privacy deletion request; student
  writing (which can contain names/PII typed into free-text defences) persists on disk
  indefinitely past the nominal 120-day retention. A lost teacher key makes a class both
  inaccessible **and** undeletable.
- **Minimal fix:** add an authenticated `DELETE /classes/:code`; run a purge job that unlinks
  class directories past `expiresAt`; document a deletion SLA. Provide a key-recovery or
  admin-delete story.

### F3 — Availability: unbounded submission count → disk + read amplification — HIGH
- **Repro:** per-request limits hold (4MB, 5000 events, deep nesting → clean 400), but the
  **number** of submissions is unbounded (F1). A valid submission is up to ~4MB; the teacher's
  `GET /submissions` returns **every** full log in a single response (`store.listSubmissions`
  reads all files via `Promise.all`, then `JSON.stringify`). I measured one modest class GET
  at 3.27MB; N attacker submissions of ~4MB make it hundreds of MB in memory on both server
  and the teacher's browser.
- **District impact:** one attacker with a class code can exhaust the pilot host's disk and
  make the evidence room fail to load.
- **Minimal fix:** cap submissions per class/seat; paginate the evidence-room read; cap total
  bytes per class.

### F4 — Teacher key in URL query string and echoed in response body — MEDIUM
- **Repro:** educator routes carry `?key=...`; `GET /submissions` returns `class.teacherKey`.
- **District impact:** the sole credential lands in browser history, `Referer` headers, and
  any reverse-proxy/access log; it is re-transmitted on every evidence fetch and would sit in
  any cached response or a projected/shared teacher screen.
- **Minimal fix:** carry the key in the `X-BOW-Teacher-Key` header only (never the URL);
  strip `teacherKey` from the `class` object in the `/submissions` response (destructure it
  out the way `GET /classes/:code` already does for students).

### F5 — CORS reflects arbitrary origin — MEDIUM (low in isolation)
- **Repro:** `Access-Control-Allow-Origin: https://evil.example` reflected; no
  `Allow-Credentials`.
- **District impact:** no cookies exist, so this does not leak authenticated reads on its own
  (an attacker page would still need the key in a header). It does enable the F1 cross-origin
  writes. Fix folds into F1: allowlist the app origin.

### F6 — Class label is world-readable and may carry roster context — LOW
- **Repro:** `GET /classes/7XCWD` (no key) returns `label:"Period 3 · Grade 7"` and the
  assignment list.
- **District impact:** anyone with the code learns the class label (period/grade) and what was
  assigned. Minor, but it is PII-adjacent context exposed to unauthenticated callers.
- **Minimal fix:** none required if labels stay generic; consider not returning the label
  pre-join, or guidance to teachers not to put identifying info in labels.

### F7 — Seed uses sequential session ids; non-constant-time key compare — LOW / informational
- Seeded `session-0000000N` makes targeted overwrite trivial **in the demo only**; production
  uses `crypto.randomUUID()` (sound). Teacher-key check is `key !== record.teacherKey`
  (not constant-time), but at ~24 chars over a 25-symbol alphabet remote timing is
  impractical. Note both; neither blocks.

---

## WHAT HELD UP

These I actively tried to break and could not — they matter as much as the findings:

- **XSS / stored-content injection to teachers:** React auto-escaping holds end-to-end,
  proved in a real browser. No `innerHTML`/`dangerouslySetInnerHTML` in the client; no student
  data reaches an `href`/attribute sink. `javascript:` link rendered inert as text.
- **Class isolation & teacher-key isolation:** teacher key A cannot open class B; wrong key →
  403; the key is never returned to a student (`GET /classes/:code` omits it by explicit
  field-by-field construction).
- **Role separation:** every read/write of other people's work is gated on the key; a
  student-side request (only ever holding the class code) cannot reach assignment creation,
  overrides, scoring, or the evidence room.
- **Path traversal / file-store injection:** class codes are normalised to 5 chars of a fixed
  alphabet before any disk access; null bytes, overlong, unicode, `%2e%2e`, `../` all 404;
  no files created outside `.bow-classes`.
- **Input validation:** closed evidence event-type vocabulary; seat 1–99; sessionId 8–64;
  challenge must exist; override is validated against the attempt's *actual* observations
  (can't fabricate a judgement); reasoning scores clamped server-side; malformed override/score
  bodies rejected.
- **Per-request availability:** 4MB body cap, 5000-event cap, deep-nesting handled — all clean
  400s, server survives every case.
- **Env fail-closed:** an ephemeral-disk host with no managed store refuses to start classes
  (503) rather than silently losing them; memory/ephemeral report `classroomReady:false`.
  This is a notably good design.
- **Secrets & supply of data:** no hardcoded secrets in repo or built bundle; no `.env`;
  `.bow-classes` is gitignored.
- **No third-party / analytics / LLM data path:** the client talks only to same-origin `/api`;
  external URLs in the bundle are documentation links; `localOnlyTransport` keeps everything
  on-device. Student writing is never sent to any third party or model. Strong privacy point.
- **Logging:** the server logs a single startup line and nothing per-request — no PII, no
  evidence, no bodies.
- **Replay idempotency:** re-posting the same `(seat, sessionId)` replaces rather than
  duplicates (a dropped-connection retry does not create a second student).
```
