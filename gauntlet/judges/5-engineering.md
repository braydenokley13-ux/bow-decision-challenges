GO WITH CONDITIONS

Judge 5 — engineering and security. Every claim below is true of **`18a818c8c8885e7e0cbdd547c536117dfa3d788c`**, archived to `/tmp/judge-5` with `git archive` and worked on there. HEAD had already moved twice by the time I finished; nothing here was re-checked against a later tree. Ports 4305/4385, `file` store driver except where I say otherwise. Receipts in `gauntlet/receipts/judge-5/`.

I could not find a cross-tenant read. I tried eight ways and every one was refused. That sentence is the reason this is a GO rather than a NO-GO, and the conditions below are the reason it is not a plain GO.

---

## The strongest evidence for the verdict

### The one that would have made me refuse, if it were an attack rather than an accident

**A store key mismatch is detected, reported, and then written into.** `keyCheck()` returning `"mismatch"` does not set `blockedReason`, so every write route on the service stays open against a store the service cannot read. One write is permanent, silent loss of a class's evidence, and the product's own health message tells the operator the opposite.

Full transcript: `gauntlet/receipts/judge-5/key-mismatch-destroys.txt`. Three boots of `dist-server/index.js` against one `BOW_CLASS_DIR`:

```
--- boot with the RIGHT key K1 ---
teacher signup: ms.reyes@school.example  -> t_d434cd56…
class: {"code":"R6JPF","label":"Period 3 Real Class",…}
roster: [{"seatCode":"1","displayName":"Aiden R"},{"seatCode":"2","displayName":"Bianca T"}]

--- boot with the WRONG key K2 (a typo, or a rotation done in the wrong order) ---
health: {"ok":false,"storeKey":"mismatch","classroomReady":false,
         "reason":"…Nothing has been deleted — put the original key back."}
teacher signs in:      401
teacher RE-REGISTERS:  201            <-- what the 401 pushes them to do
class created reusing code R6JPF: 201 <-- "a teacher may bring their own code" is a shipped feature

--- put the ORIGINAL key K1 back, exactly as health instructed ---
health:                {"ok":true,"classroomReady":true,"storeKey":"ok"}
GET /classes/R6JPF:    404 class_not_found
teacher signs in:      401
diff of class.json before/after: OVERWRITTEN
```

Health reports **green over the wreckage**, because the canary `_vault-check.json` was written under K1 and still opens under K1 — `keyCheck` reads one file and cannot see that the store is now a mixture.

And it is worse than a lost class. The children's roster rows are still on disk, sealed under K1, attached to a `class.json` nothing can open — so they fall out of the retention promise entirely. I ran `expiredClassCodes` directly against both directories with `now` five years in the future:

```
damaged store:  keyCheck: ok   expiredClassCodes(now + 5 years): []
healthy store:  keyCheck: ok   expiredClassCodes(now + 5 years): ["R6JPF"]
```

`Aiden R` and `Bianca T` are on that disk permanently. The teacher sign-in screen says, on screen, *"A class and everything in it is deleted 120 days after you make it."* For those two children that sentence is now false and nothing in the system says so.

The codebase knows about this. `server/store.ts`, in the comment above the canary:

> *"An operator who trusts that lets a teacher re-register, which overwrites the email pointer, and restoring the correct key then does **not** restore their account. A silent failure that becomes irreversible while somebody follows the health endpoint's advice is the worst shape a check can have."*

They fixed the half that made health lie about the mismatch. They did not fix the half the sentence actually describes, and I reproduced it with health telling the truth.

**This is the largest single reason a district's security reviewer should push back, and it is cheap to close** — see conditions.

### The teacher key is a capability URL, in the address bar, with no way to rotate it

Driven in Chromium (`/opt/pw-browsers/chromium-1194`), `page.url()` logged verbatim:

```
http://127.0.0.1:4305/educator/class/TUT67?key=XXWEW9JP9KD94RAVUU7K6FRD
http://127.0.0.1:4305/educator/class/TUT67/roster?key=XXWEW9JP9KD94RAVUU7K6FRD   (names on screen: true)
in-app hrefs carrying the key: ["/educator/class/TUT67/roster?key=XXWEW9JP9KD94RAVUU7K6FRD"]
history length: 3
```

Screenshots: `teacher-key-in-url.png`, `roster-page-key-in-url.png`. That key opens the whole evidence room — every child's name and every child's written explanation — for the class's 120-day life. `PATCH /classes/:code` accepts `label` and nothing else, by explicit design ("the code, the key, the owner and the dates are identity and provenance"), and I found no other route that regenerates it. **The only remedy for a leaked teacher key is `DELETE /classes/:code`, which destroys the children's work.** Teachers project the screen this URL sits in.

`Referrer-Policy: same-origin` is set on both the API and `vercel.json`, which is the right mitigation for the leak path they thought about. It does nothing about a projector, a browser history on a shared staff machine, or a platform access log.

### A teacher cannot end their own session, and cannot change their password

"Sign out" is `storage()?.removeItem(TOKEN_KEY)` — `forgetTeacher`, `src/educator/teacherSession.ts:49`. Client-side only. The token stays valid for its full `TEACHER_SESSION_DAYS = 30`. Probed for a revocation route:

```
DELETE /auth/teacher/session   -> 404      POST /auth/teacher/session   -> 401
DELETE /auth/teacher/signout   -> 404      POST /auth/teacher/signout   -> 404
DELETE /me/signout             -> 404      POST /me/signout             -> 404
DELETE /auth/teacher/password  -> 404      POST /auth/teacher/password  -> 404
```

A captured teacher token also hands back the keys:

```
GET /me/teaching -> {"classes":[{"code":"XMJU7",…,"teacherKey":"ARK4KYMMUU9PKJRRW4X6M3NE"}]}
```

So one token is 30 days of unrevocable access to every class that teacher owns, plus the long-lived key for each. The only lever is `/auth/teacher/recovery`, which needs the code shown once at sign-up.

Students, by contrast, have **real** revocation and it works. I captured a student token, pressed the teacher's control, and re-tried:

```
GET /me before:      200
POST /classes/:code/signout -> {"signedOut":1}
GET /me after:       401    /me/classes: 401    PUT /me/attempt: 401
```

### Unbounded durable writes from a class code alone

`PUT /me/attempt` has **no rate limit of any kind** and stores `request.body.payload` verbatim under the 4MB body cap. On an *open* class — which is every class until a teacher pastes a roster — a caller with only the code off a whiteboard self-serves student sessions:

```
15 self-served student sessions on an open class in 1.7s (no roster, no teacher, class code only)
15 x 3.4MB checkpoints written in 4.2s  (12.2 MB/s of attacker payload)
disk: 65M in one class directory
```

`POST /classes` is capped at 400/hour for an unauthenticated address and each class yields `MAX_ROSTER_SIZE = 60` seats, so the ceiling is roughly 24,000 seats/hour × ~4.5MB each. That extrapolation is arithmetic; the 65MB in 4.2s is measured. Nothing else bounds a self-hosted deployment's disk.

### What held, and I want it on the record because I went at it hard

Every one of these is a request I sent, not a line I read:

| attack | result |
|---|---|
| teacher B → class A: submissions, roster, claim, delete, rename, signout, erase seat, reissue card | 403 × 8 |
| student 1 → submission under seat 2 | 403 `"Sign in as yourself before turning this in."` |
| unauthenticated → submissions POST / evidence room / shareout / feedback | 403 × 4 |
| student → `/me/runs/<another student's sessionId>` | 404 |
| student token → evidence room | 403 |
| teacher token → post a submission under a seat | 403 |
| card for class A presented to class B | 401 |
| teacher key of class A presented to class B | 403 |
| `sessionId = "aaaaaaaa/../../../XA7AW/class"` | 400 at the door, no file written |
| token: swapped payload + old signature / `payload.` (alg-none shape) / empty signature | 401 × 3 |
| `X-Forwarded-For` rotated over 240 requests, `BOW_TRUST_PROXY` unset | 40 × 429 — the socket was counted, not the header |
| `__proto__` in a class-creation body | not present in the stored record |
| planted `<img src=x onerror=…>` and `<script>` child names, plus markup inside a child's written explanation, viewed on 4 teacher surfaces | `payload executed: {}` on all four; markup rendered as literal text |
| unauthenticated GET of a roster | `{"label":"…","joinMode":"roster"}` — no names |
| off-origin network requests during a real browser run | `[]`. Every request host: `["127.0.0.1:4305"]` |
| `grep -ril 'Aiden\|Bianca\|<teacherKey>\|<email>\|I saved because'` over the whole file store | no matches — every record is `{"v":1,"iv":…,"tag":…,"ct":…}` |
| boot with no `BOW_STORE_KEY` | `store: "unconfigured"`, 503 on health, 503 on class creation, 503 on signup |

**And the control I expected to break, and could not.** The brief asks whether one student's typo can lock out a school. I spent the class-code miss budget from one address — `404: 200, 429: 30, elapsed 2798ms` — and then, from the same address, asked for the real class:

```
GET  /classes/REAL              -> 200
GET  /classes/REAL/roster       -> 200
POST /classes/REAL/join (card)  -> 200
GET  teacher evidence room      -> 200
```

The asymmetry in `liveClass` — charge the miss, never charge the hit — is real and works. My first attempt at this test produced a screenful of 429s and I nearly wrote it up; it was my own contamination, because I had destroyed that class myself in the key-rotation test twenty minutes earlier. Two hundred wrong codes per fifteen minutes per address is 19,200 guesses/day against a 25⁵ ≈ 9.77M space, and a hit yields a class label and nothing else.

`npm run rekey` also does exactly what its docstring claims. Source untouched (7 files before, 7 after), `6 converted, 0 already done`, and the converted directory served the original class and signed the original teacher in.

The retention sweep executes. `sweepExpiredClasses(store, now + 121 days)` on a store holding 8 classes: 38 files → 9. Every class directory, every submission, every checkpoint, every teacher note, every share-out, and every student account gone. What survives is teacher accounts and the canary.

### Gates, run by me, exactly as they came out

```
npx tsc -b                     exit 0   (19.0s)
npx eslint .                   exit 0
npx stylelint "src/**/*.css"   exit 0
npm run build                  clean; dist/assets/index-*.js 714.70 kB (gzip 208.68 kB),
                               css 183.70 kB (gzip 29.78 kB); one chunk;
                               "(!) Some chunks are larger than 500 kB" warning unaddressed
npx vitest run                 145 passed | 1 skipped (146 files)
                               1663 passed | 1 skipped (1664 tests), 81.11s
npm audit                      found 0 vulnerabilities
npm audit --omit=dev           found 0 vulnerabilities
```

Nothing red. The one skip is `describe.skipIf(!RUN)` on a parameter search, which is correct.

---

## The largest gap

**Nothing structural upholds the authorization boundary, and nothing tests that a new route has one.** Closing it costs a `requireOwner(record, request)` helper and one test that enumerates the router's routes and asserts each unauthenticated one is on a declared allow-list — call it a day, maybe two.

`handleIdentityRequest` is **717 lines** in one function. Within it, the four-line preamble that gates a class is written out by hand:

```
copies of `opensClass(record, request.headers["x-bow-teacher-key"], caller)`   9
copies of the literal 403 body "This link does not open that class"           8   (identityFail exists and is not used)
copies of `if (!record || record.expiresAt <= now) return classMiss();`       10
`await callerOf(request.headers, context)` call sites                         15
```

`handleApiRequest` is another 428 lines with the same shape. So I added a tenth route the way a second engineer would, and left the preamble out:

```ts
if (request.method === "GET" && third === "everything") {
  const record = await store.getClass(code);
  if (!record) return classMiss();
  return { status: 200, body: { roster: …, submissions: …, feedback: …, teacherKey: record.teacherKey } };
}
```

```
npx tsc -b                exit 0
npx eslint server/        exit 0
npx vitest run src/platform    14 files, 180 tests, all passed
```

Then, unauthenticated:

```
GET /api/classes/XFX3D/everything -> 200
{"roster":[{…,"displayName":"Aiden R","joinCodeHash":"scrypt$32768$8$1$…","joinCodeIndex":"27bf…"},
           {…,"displayName":"Bianca T",…}],"submissions":[],"feedback":[],
 "teacherKey":"CG9YQCYPNRFRAQTDDDNEPD7J"}
```

Children's names, the join-code hashes, and the class's teacher key, to nobody at all — with three green gates. `server/identity.ts` was restored byte-identical afterwards (`diff -q`) and the route returns 403 again.

That is the honest shape of the risk in this codebase. It is not that the current authorization is wrong — I could not break it. It is that its correctness lives in nine copies of four lines and in the reviewer's attention, and the product is one enthusiastic Tuesday away from a tenth copy that is missing.

The same failure mode appears in three smaller places, all executed or counted:

- **The boundary that matters most is the one lint does not draw.** `src/domain/** → src/educator/**` *is* blocked — I added the import and got `error … Domain modules must remain pure and view-independent`, and the config handles the ESLint options-replacement footgun explicitly. But `src/** → server/**` is unguarded: I put `import { signToken } from "../../server/crypto"` into `src/student/session.ts` and it passed `tsc -b`, `eslint`, and `vite build` with no error and no warning. The bundle grew 30 bytes.
- **Three functions named `callerOf`.** `server/index.ts:157` and `api/[[...route]].ts:27` both answer "which address is the rate limiter counting" with *different rules* — one honours `BOW_TRUST_PROXY` and falls back to the socket, the other unconditionally trusts `x-real-ip` then the rightmost forwarded entry — and neither imports the other. `server/identity.ts:153` answers a completely different question (which *account* is this bearer token) and is the one called 20 times in the two routers. The codebase's own comment about the class-code limiter says two doors must call one function "because two copies of a security ceiling is how this one came to have a hole in it". They did that for `chargeCodeMiss` and not for this.
- **The CORS + security-header block is duplicated** between `server/index.ts` and `api/[[...route]].ts`, and the Vercel file's comment records that they have already been bitten by that divergence once ("this path had none of them"). The fix was to copy, not to share.
- **Dead code in the security layer.** `plainVault` is defined in `server/vault.ts:136`, imported by `server/store.ts:2`, and kept alive by `void plainVault;` on line 266. Nothing calls it outside a gauntlet receipt.

### Where the test suite is theatre, and where it is not

It is mostly not. 1663 tests, every test file carries at least one `expect`, and the `toBeTruthy()`/`toBeDefined()` assertions I checked are guard preconditions with explanatory messages ("this fixture must produce the judgement the override names"), which is the right pattern. `storeHardening.test.ts` is a genuinely good security test file — it covers the plaintext-record replacement, the deleted canary, and the migration door.

Two real gaps:

1. **No test writes into a mismatched store.** `describe("a key that no longer opens what this store wrote")` has three tests and all three assert on *reporting*: `keyCheck()` returns `"mismatch"`, health returns 503, `classroomReady` is false. Nothing asserts the service refuses to act. That is the exact defect above.
2. **The browser suite never touches a durable store.** `playwright.config.ts` starts the API with `env: { BOW_CLASS_STORE: "memory" }`. So the driver a school actually deploys is exercised only by unit tests, never end-to-end through a browser. Since the unit tests are good, this is a smaller hole than it sounds — but it is why the mismatch-plus-write path had nobody looking at it.

---

## Comments that say something the code does not do

The brief asked. Three, and they cluster on the same defect:

1. `src/platform/classes/storeHardening.test.ts:186` — *"it says what to do, because the operator's next move is to put the old key back **rather than to restore a backup over data that is still perfectly intact**."* I put the old key back. It was not intact.
2. The health `reason` string in `server/handler.ts` — *"Nothing has been deleted — put the original key back."* True at the instant it is printed; false after any write, and nothing stops writes.
3. `server/store.ts`, the canary comment — names the irreversible outcome exactly ("lets a teacher re-register, which overwrites the email pointer, and restoring the correct key then does **not** restore their account") and the code still permits it. Only the detection half was fixed.

Everywhere else the long comments are carrying real decisions, and several of them are the best security prose I have read in a codebase this size. The `liveClass` comment on charging misses but not hits, the `claim()` comment on why the seat decides and not the session, the `crypto.ts` note on why this is deliberately not a JWT — those are load-bearing, and I confirmed each by execution.

---

## What the product claims without evidence

- **Legal assertions in code comments, offered as design justification, uncited.** `server/vault.ts`: *"encryption of student data 'in its custody' is an affirmative obligation under New York Education Law §2-d"*. `server/retention.ts`: *"COPPA's rule is that personal information from a child may not be retained indefinitely"*. `server/handler.ts`: *"the FTC's guidance makes a school's ability to have data deleted a condition of the consent a school gives on a parent's behalf"*. These are legal readings stated as settled fact in the artefact a district's reviewer will read. They may well be right; nothing in the repo shows the work.
- **The retention sentence, on screen, in the teacher sign-in copy**: *"A class and everything in it is deleted 120 days after you make it."* True on a healthy store — I executed the sweep. False for any class whose `class.json` becomes unreadable, and the product cannot tell you which.
- To the product's credit and worth saying plainly, since rule 5 asks: **the product makes no compliance claim.** No FERPA, no COPPA, no §2-d, no WCAG conformance claim in shipped copy. It disclaims endorsement on screen — *"NYSED has not reviewed or endorsed BOW."* — which I read off the My Classes page in a browser.

## What I am claiming without evidence

- **Anything about the serverless deployment.** I ran the plain Node server only. My reading of `server/identity.ts` says the `WINDOWS` rate-limit map is module-scope, so on Vercel every function instance holds its own window and a cold start resets it — the file's own comment says exactly this ("it is **per instance** … the honest description of this control is 'raises the cost', not 'prevents'"). **I did not measure it.** I also did not exercise `api/[[...route]].ts` at all.
- **Anything about the Upstash/`redis` driver.** I ran `memory` and `file`. Whether the mismatch-and-write defect reproduces on redis is a hypothesis; the code path is shared (`storeFromEnvironment` refuses without a key for both, and `keyCheck` is implemented separately per driver), so I would expect it to, and I did not confirm it.
- **The 108 GB/hour disk-fill figure.** Arithmetic on a measured 15.5 MB/s and the published caps. I did not sustain the attack.
- **That the `src/** → server/**` import would fail at runtime in a browser.** The build succeeded and `node:crypto` did not appear in the bundle, so it was externalised; I did not load the page and see what happens.
- **Load behaviour.** I never had thirty simultaneous clients on this. Everything above is single-client.

---

## The conditions

Each is falsifiable by a command.

1. **A store whose key does not open it must refuse to write.** Set `blockedReason` when `keyCheck()` returns `"mismatch"` — the plumbing exists and already handles the no-key case identically. **Falsified by:** boot against a populated `BOW_CLASS_DIR` with a wrong `BOW_STORE_KEY`; `POST /api/auth/teacher` and `POST /api/classes` must both return 503, and `diff` of the directory before and after must be empty. Add the test `storeHardening.test.ts` does not have.
2. **Health must not report green over a store it has damaged, and the message must stop promising what it cannot deliver.** Delete the sentence *"Nothing has been deleted — put the original key back"* unless (1) makes it true. **Falsified by:** the transcript in `key-mismatch-destroys.txt` ending with `classroomReady: true` over a 404'd class.
3. **A teacher key must be rotatable without destroying the class.** One route, owner-authenticated, that regenerates `teacherKey` in place. **Falsified by:** `POST /api/classes/:code/key` returning 404, or the class's submissions being unreadable afterwards.
4. **The teacher key must not be a query parameter on any surface that renders a child's name.** **Falsified by:** `page.url()` containing the key on `/educator/class/:code/roster` or `/educator/class/:code/students/:seat`.
5. **A teacher must be able to end every session on their account without their recovery code**, by the same `sessionGeneration` mechanism students already have. **Falsified by:** a token captured before the action still answering 200 on `GET /api/me` after it.
6. **`PUT /me/attempt` must carry a per-student rate limit and a payload size cap.** **Falsified by:** a self-served open-class session writing more than a few MB, or writing at more than a handful of requests per minute.
7. **A lint rule forbidding `src/**` from importing `server/**`.** **Falsified by:** `import { signToken } from "../../server/crypto"` in `src/student/session.ts` passing `npx eslint .`.
8. **One authorization helper, called by every gated route, and a test that enumerates the router and asserts every ungated path is on a declared allow-list.** **Falsified by:** adding a route with no auth check and having `npx vitest run src/platform` stay green — which is what happens today.

Conditions 1, 2 and 5 are the ones I would hold a pilot for. 3, 4, 6, 7 and 8 are the ones I would want in writing with a date.

## Why this is not a NO-GO

Because the thing I was sent to find is not there. I attacked the identity system, the authorization on every route in both routers, the store on disk, four rate limiters, CORS, CSP, the token format, the client's storage and a shared-machine handover, and the only data-loss path I found needs an operator to make a mistake — not an attacker to be clever. The isolation between teachers, between students, and between classes held every time I pushed on it. Nothing plaintext reaches the disk. Nothing leaves the origin. There is no third party in this product at all. `npm audit` is zero because the dependency list is six packages. The at-rest design, the rekey tool and the miss-vs-hit rate-limit asymmetry are better than what I would expect from a commercial vendor in this category, and I verified all three by running them rather than reading them.

What would have made me refuse: a cross-tenant read, an unauthenticated write that lands in a teacher's evidence room, a token I could forge, plaintext on disk, or a rate limiter one student's typo could turn into a room-wide lockout. I went looking for each of those specifically. Each was closed, and in most cases the comment above the code explains which review closed it and what it cost.
