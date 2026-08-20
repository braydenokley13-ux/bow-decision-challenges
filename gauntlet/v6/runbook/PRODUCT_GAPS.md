# What the demonstration seed could not do through the product

Written while building `scripts/seed-demo.ts` and while walking `DEMO_RUNBOOK.md` end to end in
a browser on 20 August 2026. Each row is something the seed or the runbook wanted, could not get
from a shipped endpoint or a shipped screen, and **worked around rather than patched** — the
product was not edited to make the demonstration easier.

Nothing here is a bug report about the demonstration. It is a list of places where a district
watching on Friday will be shown something slightly narrower than it could be, and the
demonstration path is written around each one honestly.

---

## 1. `/educator/class/DEMO/roster` is an error screen

**Where** `src/educator/Roster.tsx`, the component body — `const teacherKey = useTeacherKey(code)`
and then `if (!code || !teacherKey) return;` in the load effect.

**What is missing** A fixture branch for `DEMO_CLASS_CODE`. `src/educator/useClassEvidence.ts`
has one (`const isDemo = code === DEMO_CLASS_CODE`, answered from `demoClassBundle()` without
ever touching the service). `Roster.tsx` has none, so it always asks the real API with a teacher
key, and `DEMO` is four characters precisely so it can never be a real class code and can never
have a real key.

**What it blocks** On the sample class — which is the only surface that works with the class
service down — the roster, the student cards, card reissue, "take off the list", "erase", "sign
the whole class out" and "make a new private link" cannot be shown at all. Verified with every
`/api/**` request aborted in Chromium: `/educator/class/DEMO`, `/…/reading`, `/…/debrief` and
`/…/students/1` all render in full; `/educator/class/DEMO/roster` renders *"This class did not
open. This browser does not hold the key for that class."*

**How the runbook works around it** The demonstration runs on a **real** class created by the
seed, where all of that works. The fallback path (§F) is the sample class and deliberately does
not visit `/roster`; the runbook says out loud that roster management is the one thing the
fallback cannot show.

---

## 2. The shipped run helpers cannot produce a resumable mid-run checkpoint for a real class

**Where** `src/test/runChallenge.ts` line 95 and `src/test/runPopUp.ts` line 139:

```ts
send({ type: "SESSION_STARTED", sessionId: …, classCode: "H4KVW", seatCode: opts.seatCode });
```

**What is missing** Two things. `RunOptions` and `PopUpRunOptions` have no `classCode`, so every
log they build says it belongs to class `H4KVW`; and `runChallenge` has no way to stop part-way
(`runPopUp` has `stopAfterSaturdayThree` and `skipWriteUp`, Basketball has nothing).

**Why that matters here and not in the test suite** For a *finished* submission it is harmless —
the service stamps `classCode: record.code` on the record it stores, which is why
`e2e/flow.ts:seedRuns` can use `buildSubmission` unchanged. For a **checkpoint** it is not:
`PUT /me/attempt` stores `payload` verbatim, `ResumeGate` hands that payload to the provider as
the run's initial state, and `useAttemptCheckpoint` then checkpoints to `state.meta.classCode`.
A seeded checkpoint carrying `H4KVW` would resume onto a screen whose next save 403s, and whose
submission would be filed against a class the student is not in.

**How the seed works around it** `midBasketball()` and `midPopUp()` in `scripts/seed-demo.ts`
drive `challengeReducer` and `popUpReducer` directly — the same reducers, the same actions, in
the same order the shipped helpers use — with the real class code and the real seat, and stop
at a named stage. It is still a real run through the real reducer; it is just not reusing the
helper, because the helper cannot be told.

---

## 3. Nothing deletes a teacher account

**Where** `server/identity.ts`, the `IDENTITY_ROUTES` table. There is `POST /auth/teacher`,
`POST /auth/teacher/session`, `POST /auth/teacher/recovery`, `POST /auth/teacher/signout`,
`POST /auth/teacher/password` — and no `DELETE`.

**What it blocks** Two different things.

For the demonstration: `npm run seed:demo -- --reset` can delete the class
(`DELETE /classes/:code`, the same control the runbook shows a district) but cannot delete the
teacher. So the seed is idempotent about the account by design — it signs in if it can and signs
up only if it cannot — and a genuinely clean state needs a fresh `BOW_CLASS_DIR`.

For a district: `DELETE /classes/:code` and
`DELETE /classes/:code/roster/:seat?erase=1` cover a class and a child. An **educator's own**
account, with its email address, has no delete. The privacy page's own "what a district asks for
that this product does not have" section is where that belongs; the runbook does not claim
otherwise.

---

## 4. A class's cards can only be reprinted one seat at a time

**Where** `server/identity.ts`, `POST /classes/:code/roster` (returns `cards` once, then hashes
them) and `POST /classes/:code/roster/:seat/code` (one seat). `src/educator/Roster.tsx`'s `Cards`
component renders only what those two calls just returned.

**What is missing** Any route or screen that reprints the class's cards. This is correct
security — `joinCodeHash` is scrypt and the service genuinely cannot produce the code again —
but it has an operational consequence with no control behind it: a teacher who loses the printed
sheet must press *Print a new card* on every row, and every student's old card dies as they do.

**What it blocks in the demo** The seed's print-out is the only copy of sixteen card codes. If it
is lost the presenter re-runs `npm run seed:demo -- --reset`, which is fine on Friday and would
not be fine in a real classroom in week six.

---

## 5. `Assignment.attemptOf` is stored and nothing reads it

**Where** `src/platform/classes/types.ts` (the field), `src/platform/classes/assignments.ts`
(`readAssignmentRequest` parses and validates it), `server/handler.ts` (stores it). No reader.

**What it blocks** The "post-instructional application and assessment" beat that
`gauntlet/v5/D26_MATRIX.md` already records as **Not yet** — a second, comparable attempt after
teaching. The seed does not set `attemptOf` and the runbook does not demonstrate reassessment.

---

## 6. There is no sign-in integration of any kind, and no seat for one

**Where** `src/legal/notice.ts`, `GAPS`: *"There is no roster integration. No SIS, no Google
Classroom, no Clever…"*. A grep of `src/**` and `server/**` for `google|clever|classlink|
microsoft|oidc|saml|sso` returns nothing but the word "lesson" and a variable called
`platesSold`.

**What it blocks** Nothing the demonstration wanted — it is here because it is the single most
likely question from the room and the single easiest thing to imply by accident. There is no
integration, no mock of one, and no half-built one to point at.

---

## 7. The live class panel does not refresh itself

**Where** `src/educator/RealClassPages.tsx` around line 452 — and it is a decision, not an
omission: *"Auto-polling is deliberately not it — a panel that renumbers itself under a teacher
who is reading a name off it is worse than one that is plainly a minute old."*

**What it means for the presenter** The board will not move on its own while the room watches.
The runbook says to press **Check again** — the control the product ships for exactly this — and
to say why it is a button rather than a ticker. Listed here because a presenter who expects a
live ticker will stand in front of a static screen for thirty seconds.

---

## 8. The write-back panel contradicts itself until the page is reloaded

**Where** `src/educator/RealClassPages.tsx`, the *What they hear from you* section on a student's
page.

**What happens** Sending a note sets the status line under the button to *"Sent. They will see it
next time they open BOW."* — and the paragraph above the textarea goes on saying *"Nothing has
been written back about this run yet"* until the page is reloaded. Both are on screen at once.
Photographed at `gauntlet/v6/runbook/step-31-the-note-is-sent.png`.

**What it blocks** Nothing, and the note really is sent — the student's own screen carries it
immediately (`step-32-the-student-reads-it.png`). It is here because a district watching this
live will read the two sentences together, and a presenter who does not expect it will reload
mid-beat and lose the thread. The runbook tells them which line is the confirmation.
