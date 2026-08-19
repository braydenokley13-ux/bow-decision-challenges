# Decision 03 — the product may not offer a child a control that destroys work while telling them it is safe

**Date:** 2026-08-19 · **Made by:** the lead · **Status:** adopted, with two fixes landed and one rule standing

## What happened

A resilience critic reproduced two work-destroying defects end to end, in a real browser, against
the durable file store. They are unrelated in code and identical in shape: **the product told
somebody their work was safe, and it was not.**

### One — the run menu, while the turn-in was still in the air

`StageShell.tsx` and `PopUpShell.tsx` both passed `submitted={state.stage === "submitted"}`. The
reducer enters that stage on the **button press**, before a request is made. So through a slow
turn-in — and for ever after a failed one — the run menu said:

> What you turned in stays with your teacher. Leaving only clears it off this computer.

next to a button that calls `clearEveryAttempt()`.

The reproduction did not need an exotic failure. A service that *accepts* the POST and never
answers is an ordinary school network, and `call()` had no timeout and no `AbortSignal`, so the
first attempt never resolved and `deliverWithRetry`'s ladder never got a turn — it was sitting on
`await transport.deliver(...)`. The student watched "Sending your plan…" for ninety seconds with
no message, no retry and no way out, and the run menu was the only other control on the screen.

Measured afterwards: `bow.*` keys in local storage 10 → 1. The attempt, the evidence log and the
written defence gone. No submission in the teacher's evidence room. The teacher's live board still
showing that seat mid-run at `defense`. Twenty-five minutes of one child's work, destroyed by the
product's own reassurance.

### Two — the teacher's marking, when a child pressed reload

`POST /classes/:code/submissions`, the re-delivery branch, carried one field of three:

```ts
await store.putSubmission(existing ? { ...stored, reasoningPoints: existing.reasoningPoints } : stored);
```

`reasoningCriteria` and `overrides` were not carried. A second delivery of the same
`(seatCode, sessionId)` deleted the teacher's criterion marks and every override on that attempt.

`SubmittedStage` re-POSTs on every mount, and its `sent` guard is a `useRef`, which is per-mount.
A reload, a restored tab, "Try sending again", or a second device holding the same session all
trigger it. Reproduced: teacher marks the writing `{C6.1:2, C6.2:2, C6.3:2, C6.4:4}`, overrules one
machine judgement with the note the service requires, child reloads, read-back is `{points: 10}`.

The override is the one place this product lets a teacher's professional judgement into a child's
permanent record, and it was deleted by a keypress with nobody told. **Worse than the deletion**:
`reasoningPoints: 10` survived, standing over marks that no longer existed — exactly the state
`handler.ts` says elsewhere must never be possible, between the number a teacher reads and the
marks a competency result rests on.

Re-delivery also restamped `submittedAt`, moving a child from on time to a day late for reloading.

## The rule

**A screen that offers to destroy work must derive what it says about that work from the same
source the work's own screen uses — never from a proxy for it.**

The submitted screen never had the first bug. It reads `delivery` and says "Sending your plan…"
until the service answers; its own comment says "A delivery that did not happen is never drawn as
one." The run menu re-derived the same fact from a different, cheaper signal, and the cheap signal
was wrong in exactly the window where the truth mattered most.

The corollary, for the service half:

**A student's device may replace only what a student's device sent.**

Everything else on a submission was written by a teacher or stamped once by the service, and a
re-delivery is not evidence about any of it.

## What landed

- `RunMenu` takes `handIn: DeliveryState["status"]` and says four true things instead of two.
  "Still on its way" and "did not arrive" are distinct, because those are the two states a student
  is most likely to be reading it in — a turn-in that went through leaves nothing to wonder about.
- `call()` aborts at ten seconds, which is what makes a hung request retryable rather than
  terminal, and what gives the retry ladder its turn.
- `keepWhatWasNotSent()` states the merge as a rule in one place, and preserves `submittedAt`.
- Three test files hold it: `runMenuTruth.test.tsx` checks both cost-bearing claims against all
  four delivery states; `submissionMerge.test.ts` reproduces the wipe and pins every field of
  `SubmissionRecord` to a side of the rule, so a field added later fails until somebody decides
  which it is. All were confirmed red against the code they replaced.

## What is *not* claimed

The blast radius of the second defect is bounded by session expiry: a student session lasts ten
hours, so a re-delivery the next morning is refused for an expired token and never reaches the
merge. That is a real limit and it is written into the test fixture rather than implied. It removes
none of the triggers that matter — reload, restored tab, retry, second device are all inside the
same lesson, and a teacher can mark work the moment it arrives.

No claim is made here about FERPA, COPPA, NY Education Law §2-d, NYCPS or district compliance.

## The standing consequence

Every future control that can destroy a student's or a teacher's work owes three things before it
ships: it names what is at stake in the words of the person reading it, it derives that from the
authoritative source rather than a proxy, and the safe choice holds focus by identity rather than
by luck. The roster's erase confirmation had all three; the run menu and "Forget these classes on
this computer" had none. Both now do.
