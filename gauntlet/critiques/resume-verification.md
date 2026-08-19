# Verification — is cross-device resume real?

**Verdict up front: half of it is.** *Eight Weeks to the Showcase* now resumes on a second
device, exactly and reliably. *Run the Pop-Up* does not, at all — the server hands the browser
the whole run and the browser throws it away and starts the market from Saturday zero. And the
same defect fires on a child's **own** device the moment they sign in again, which the product
asks a whole class to do at the end of every day.

---

## What was tested, and how

| | |
|---|---|
| **Snapshot under test** | `300ce6280970405ec4fcd9d884c398ddd922b00f` ("Stop telling a child they worked out the answer we gave them") |
| **Why a snapshot** | Other agents were committing to the tree throughout. `git archive HEAD \| tar -x -C /home/user/snap-resume-300ce62` at 00:07 UTC; every claim below is true of that SHA and nothing was rebuilt from the live tree afterwards. |
| **Still true at HEAD?** | HEAD moved to `de6207c` while I worked (18 commits). I re-read the five load-bearing lines at HEAD and every one is unchanged: `PopUpChallenge.tsx` still derives the market's seed from `useChallenge().state.meta`; `PopUpContext.tsx` still short-circuits on `nothingToAsk = !seed.classCode \|\| !studentToken()`; `ResumeGate.tsx` still carries only `{ worldId }` for a run in the other story; `Home.tsx` still calls `forgetStudent()` on any failed `readMyClasses()`; `RunMenu.tsx:56` still gates its sentence on `submitted`. I did not re-measure at `de6207c`, but the mechanisms behind every finding below are intact there. |
| **App** | Vite dev server on `127.0.0.1:5205` (`BOW_API_PORT=4205 npx vite --port 5205 --strictPort`), which proxies `/api` the way the repo does. Ports checked free first — 5179/5184/5191/5203 and 4191/4192/4193/4194/4203 were in use by other agents. |
| **API** | `node dist-server/index.js` on `127.0.0.1:4205`. **Not** the memory store: after two separate `pkill -f dist-server` events wiped a memory-store class mid-run, I moved to the durable file store (`BOW_STORE_KEY` + `BOW_CLASS_DIR`) and put a five-second supervisor in front of it, so a killed API restarts with the class intact. `/api/health` was asserted `{"ok":true,"store":"file","durable":true}` at the start **and end** of the headline verification run — no result below is a dead server misread as a defect. |
| **Devices** | Real Chromium at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, one `launchPersistentContext` per persona with its own `userDataDir` under `/home/user/profiles/` — `ivyA`, `ivyB`, `leoA`, `leoB`, `spareSchool`, `spareHome`, `lab`, `mia`, `oli`, `oliB`, `vic`, `ubi`, `teacher`. Separate profile directory = separate cookie jar, separate localStorage, separate everything. No token was ever planted; nothing was cleared by hand. |
| **Data** | A real class built through the real teacher UI: class **G94MX** "Period 4 · Resume Check", *Students pick* both stories, twelve pasted names, twelve printed cards read off the real card screen. Every student signed in by typing the class code and their card code into the join form, two screens, like a child. |
| **Drivers** | Throwaway, in `.scratch/resume/`. Receipts in `gauntlet/receipts/resume/`. |

The honest sign-in worked. It is two screens (class code → card code) and it never fought me,
which is worth saying because the brief anticipated it might.

---

## M4 — "Carry on" on a second device

### Eight Weeks to the Showcase: **fixed. Genuinely.**

Leo Okonkwo, seat 2, played the opening of Eight Weeks on `leoA`: ordered the three places
cheapest-first, chose **Teammate Share**, worked out its eight-week cost as $1,000, pressed
*Build the plan*. He stopped on **question 1 of 4**.

`leoA` home (`V-leo-02-deviceA-home.png`):

> **Eight Weeks to the Showcase**
> You stopped at The first plan.
> **Carry on**

A different browser profile — `leoB`, which had never seen this run, no localStorage, no
cookies — signed in with the same card. Its home said the same thing
(`V-leo-03-deviceB-home.png`). Pressing **Carry on** landed on
(`V-leo-04-deviceB-after-carry-on.png`):

> Before the season. **Part 2 of 5: The plan.** · G94MX · SEAT 2
> BUILD AVERY'S PLAN · **QUESTION 1 OF 4** — WHAT CAN AVERY COUNT ON?
> − Where Avery lives **−$1,000** · Teammate Share · 8 weeks

That is the run. Same stage, same question, his housing decision on the board. **This is what
the fix was for and it works.** Refresh mid-question, tab close and reopen, and a second tab
all behave correctly too (below).

### Run the Pop-Up: **still broken, and the server is not the problem.**

Ivy Marchetti, seat 1, played Run the Pop-Up on `ivyA`: took the **Middle Row** booth, worked
out $390 owed before opening, left both uncertain amounts out, worked out $1,510 to plan with,
split it $500 stock / $150 cushion / $860 her cut, ordered three trays for $180, opened the
doors and sold 30 plates. She stopped on **Saturdays 2 and 3**
(`V-ivy-01-deviceA-in-run.png`).

`ivyA` home (`V-ivy-02-deviceA-home.png`) and `ivyB` home, a separate profile that had never
seen the run (`V-ivy-03-deviceB-home.png`), both said:

> **Run the Pop-Up**
> You stopped at Saturdays 2 and 3.
> **Carry on**

I instrumented `ivyB`'s network before pressing it. The server answered
`GET /api/me/attempt?classCode=G94MX` with **the entire run**:

```
{"worldId":"food-truck","stage":"popup-standing-order","seat":"1",
 "payloadStage":"popup-standing-order","logLen":18,"spot":"middle-row"}
```

Eighteen log events, the booth she chose, her three lines, her tray order. The browser had it
in hand. Pressing **Carry on** landed on (`V-ivy-04-deviceB-after-carry-on.png`):

> BEFORE THE MARKET — Saturday 1 — · Saturday 2 — · Saturday 3 — · Saturday 4 —
> **NO SEAT YET**
> RIVERSIDE NIGHT MARKET · IN THE ACCOUNT **$1,900**
> **Where do you set up?** — Back Lane / Middle Row / Bridge Gate — *Take a booth to carry on*

Saturday zero. All three booths on offer again. **$1,900** back in the account. And the seat
label in the top bar reads **"NO SEAT YET"**, which is the tell: this is not a run that failed
to restore, it is a run that never learned who was sitting there.

**The mechanism, and why it is not a race or a flake.** The market's own resume gate
(`PopUpProvider`) refuses to ask the server when `!seed.classCode`. That seed comes from the
*other* world's reducer — `PopUpChallenge.tsx` reads `classCode`, `seatCode`, `assignmentId`
straight out of `useChallenge().state.meta`. On a second device the outer `ResumeGate` sees
`attempt.worldId !== "basketball"` and deliberately carries **only the world id, not the
state**, so Basketball's provider mounts with a virgin `createInitialState()`. Its `meta` is
empty. So the seed is empty, the market's gate short-circuits before it makes a request, and
the market starts a brand-new run with **no class code at all**. Two things I watched confirm
this rather than infer it: the top bar says *NO SEAT YET* (empty `classCode`/`seatCode`), and
the new seatless run never checkpoints — Ivy's server attempt was still *Saturdays 2 and 3*
afterwards, so home kept offering **Carry on** and Carry on kept landing her at the booths,
indefinitely.

The red team's M4 said "the resume line names a world and a stage, and the button opens
whatever run the *device* is holding." That has been half-fixed: the line is now server-fed and
truthful, the button now opens the right *world*, and for one of the two worlds it opens the
right *run*. For the other, the promise is still broken, and it is broken **after** the product
has proved on screen that it knows exactly what the answer is.

### The same defect on the child's own device — this is the one that will hurt

The teacher's class-list page carries this control and this sentence
(`X-01-teacher-signout.png`):

> **END OF THE DAY · SIGN EVERYBODY OUT**
> One press ends every student session in this class, on every device. **Nothing they did is
> lost.** Use it when the Chromebooks go back on the trolley.

I pressed it, with Ivy mid-run on her own laptop.

1. `ivyA` before: `bow.attempt.v2.plan-under-pressure.food-truck`, `.basketball`, `.world`,
   four `bow.draft.food-truck.*` keys, token, id.
2. Next visit to `/home`: `401 no_session` → bounced to the join form
   (`X-02-ivy-signed-out.png`). Attempts still on disk.
3. She types her class code and her card code again — **the same child, the same card, the same
   machine**. Home reads *"Run the Pop-Up · You stopped at Saturdays 2 and 3 · Carry on"*
   (`X-03-ivy-home-after-resignin.png`). localStorage is now
   `["bow.run.tab","bow.student.v1.id","bow.student.v1.token"]` — **every attempt key and every
   draft has been deleted**.
4. She presses **Carry on**: *NO SEAT YET*, *Where do you set up?*
   (`X-04-ivy-own-device-lost-run.png`).

Most of a lesson gone — the booth, the split, Saturday 1 — on her own computer, on the ordinary
end-of-day path, under a sentence that says nothing is lost. The clearing rule from `0ea8372` does not check whether the child
who just signed in is the child who was already there (see B1 below), and the pop-up resume
cannot put it back.

**Receipts:** `V-ivy-01`…`V-ivy-04`, `V-leo-01`…`V-leo-04`, `X-01`…`X-04`.

---

## 1. B1's fix — "a student lands in the previous student's run"

### The case the red team tested: **fixed. Verified with two real cards in one profile.**

Profile `lab`, one browser, one machine.

- Nia Alvarez (card `7NNRW`, seat 4) signed in and played to *The first plan*.
  Home: *"Eight Weeks to the Showcase · You stopped at The first plan · Carry on"*
  (`B1-01-nia-home.png`). localStorage held her attempt.
- She pressed the product's own **"Not you?"** → the join form (`B1-02-after-not-you.png`).
- Sam Brooks (card `AUEMT`, seat 5) signed in on the same profile. Home:
  *"Plan Under Pressure · You handle the money. 20–28 minutes · **Start**"*
  (`B1-03-sam-home.png`), and localStorage was down to
  `["bow.student.v1.id","bow.run.tab","bow.student.v1.token"]` — Nia's attempt gone.
- Sam pressed Start and got **Part 1 of 5: The offer**, *G94MX · SEAT 5*, the three places
  unordered, no trace of Nia's Teammate Share (`B1-04-sam-fresh-run.png`).

**Not reproduced. The fix holds.**

One residue worth a line: between *"Not you?"* and the next child signing in,
`bow.attempt.v2.plan-under-pressure.basketball` and `.world` are **still on disk**. The
clearing happens at the next sign-in, not at sign-out. Nothing in the UI reaches it (the run
route bounces to `/join` without a token), but on a shared laptop the previous child's plan sits
in localStorage until somebody else signs in.

### The harder case the red team did not test: **the same child signing in again wipes their work.**

Leo, mid-run, pressed *"Not you?"* and signed straight back in **as himself**, same card
(`B1-05-leo-before-resignin.png` → `B1-06-leo-after-resignin.png`):

```
storage before      ["bow.attempt.v2.plan-under-pressure.basketball",
                     "bow.attempt.v2.plan-under-pressure.world",
                     "bow.run.tab","bow.student.v1.id","bow.student.v1.token"]
after Not you?      [attempt keys still present, token gone]
after signing in
as Leo again        ["bow.run.tab","bow.student.v1.id","bow.student.v1.token"]
```

The device's copy of his own work is deleted because *somebody* signed in, not because somebody
*different* did. In Eight Weeks this is survivable — the server's checkpoint restores it and his
home line and Carry on were both correct afterwards. In Run the Pop-Up it is the total loss
demonstrated above. And in **both** worlds it deletes the only copy that works without a
network, which matters because of the next finding.

### Same seat on two devices at once: **they diverge, permanently, and neither is told.**

Spare One, seat 3, signed in on `spareSchool` and `spareHome`. Both reached
*question 2 of 4*, the two-bonuses question, with the server holding the run.

- `spareSchool` with the wifi down (every `/api/**` request aborted) went back to the bonuses
  and pressed **"Yes — count on it"** for the attendance bonus
  (`C5-01-school-offline-both-bonuses-in.png`).
- `spareHome`, online, went back to the same question and pressed
  **"No — leave it out"** for both (`C5-02-home-both-bonuses-out.png`).
- Both devices then came back online and reloaded, twice each.

Final state, read off the two browsers a minute apart:

| | Avery's money |
|---|---|
| `spareSchool` | `+ Only if a bonus rule is met **$800**` |
| `spareHome` | `+ **No bonus money counted** $0` |

Same child, same seat, same session id, both online, both refreshed — **two different plans that
never converge.** The precedence rule is `here.sessionId === there.sessionId && here.log.length
>= there.log.length` → keep the local copy. Both devices have logs at least as long as the
server's, so each one keeps its own forever and each one overwrites the server on its next
checkpoint. Whichever device the child happens to finish on is the plan the teacher grades, and
the judgement this challenge exists to make — *did you count on money nobody promised?* — is
**opposite** on the two machines. Neither screen mentions the other. (`C5-03`, `C5-04`.)

The benign version converges correctly: when one device is simply behind, it adopts the
server's newer state on reload and the two agree (`C-01`…`C-04`).

---

## 2. The escape hatch's copy — **reproduced, and it destroys work**

The sentence is gated on `state.stage === "popup-submitted"` (`RunMenu.tsx:56`), which is a
fact about the *reducer*, not about whether anything reached the teacher.

Vic Ives, seat 12, played Run the Pop-Up end to end in one browser session — booth, money,
plan, four Saturdays, the generator swap, three or four sentences of his own writing — and
pressed **Turn in my answer** with the submission endpoint answering `403 not_authorised`.
Without reloading, on that same render (`S-vic-refuse-turnin.png` / `S-vic-refuse-menu.png` /
`S-vic-refuse-confirm.png`):

> **THE MARKET IS OVER**
> **YOUR ANSWER IS SAVED, BUT NOT SENT YET.**
> This link does not open that class. Use the link you were given when you created it.
>
> *(run menu, same screen)*
> **What you turned in stays with your teacher. Leaving only clears it off this computer.**
> → **Yes — clear it and start again** / No — keep working

Two sentences, one screen, in direct contradiction. The server held **zero** submissions for
this class at that moment (`GET /classes/G94MX/submissions` → `"submissions":[]`). And the
error text is a teacher's sentence shown to a twelve-year-old — `not_authorised` maps to
*"Use the link you were given when you created it"*, and a child was never given a link.

**Then I pressed the button**, with Ubi Hart (seat 11), same refusal, same screen
(`S-ubi-refuse-confirm.png` → `S-ubi-refuse-after-leaving.png`):

- Landed on the public marketing page.
- localStorage down to `["bow.student.v1.id","bow.student.v1.token"]` — the attempt and every
  draft deleted.
- Server submissions after: `["12"]` — Vic, rescued by his reload. Seat 11 is not there, and no
  path in the product can put her there: the evidence log the teacher grades is gone from the
  only device that held it. (A *checkpoint* of her state does survive server-side — that is why
  the room list still names her — but nothing in the product turns a checkpoint into a
  submission, and her own **Carry on** now opens an empty market.)
- Her home now reads *"Run the Pop-Up · **You stopped at Turned in.** · Carry on"*, and Carry on
  lands her at *NO SEAT YET · Where do you set up?* (`T3-ubi-home.png`,
  `T3-ubi-after-carry-on.png`).
- The teacher's room list still says **"Ubi Hart · Turned in · 1 min ago"** while the
  *TURNED IN* counter says **1** and *EVERY STUDENT WHO TURNED IN* lists only Vic. The same page
  contradicts itself, because the room list reads the checkpoint's stage and the evidence list
  reads the submission.

**Mitigating, and it matters:** an outstanding submission **is** retried on the next page load,
and the failure copy is honest across reloads. Vic reloaded, the POST went out again and
returned `202`, his work landed, and his home changed to *"Turned in 8/19/2026. Your teacher has
it. — See what your run shows"* (`S-vic-refuse-after-reload.png`, `T3-vic-home.png`). Rex Diallo
(seat 7) reloaded with the refusal still in force and the page correctly still said **"YOUR
ANSWER IS SAVED, BUT NOT SENT YET"** (`S-rex2-refuse-after-reload-still-refused.png`) — while
the run menu three inches above it still said *"What you turned in stays with your teacher"*
(`S-rex2-refuse-menu.png`). So the failure is not "the work is always lost". It is that:

- the run menu's sentence is wrong on that screen and stays wrong through every reload;
- the only two actions offered on the failure screen are **"Run the market again"** and
  **"Leave this run → Yes — clear it and start again"**, and both clear the attempt the retry
  queue lives in (I watched *Run the market again* leave Vic with an empty market, and *Yes —
  clear it* leave Ubi with nothing on the device and nothing on the server);
- there is no **"Try sending it again"** button anywhere on that screen.

**Reproduced.** The sentence can absolutely still be shown when nothing was turned in, and
acting on it is unrecoverable.

---

## 3. "You stopped at Turned in. Carry on." — **changed, not gone**

When the submission actually lands, the line is now right (`T3-vic-home.png`):

> **Run the Pop-Up** — Turned in 8/19/2026. Your teacher has it. — **See what your run shows**

The old string survives for exactly the case where it is most misleading: a run whose reducer
reached the submitted stage but whose evidence never reached the class. Ubi's home
(`T3-ubi-home.png`):

> **Run the Pop-Up** — **You stopped at Turned in.** — **Carry on**

**Partially fixed.** The remaining instance is now a symptom of finding 2 rather than a copy
bug on its own, but a child is still told they "stopped at Turned in" and invited to carry on
into a market that starts from nothing.

---

## 4. The resume line's honesty, everywhere else

| Situation | Line shown | Where the button lands | Honest? |
|---|---|---|---|
| Eight Weeks, second device | "You stopped at The first plan" | The first plan, work intact | **Yes** |
| Run the Pop-Up, second device | "You stopped at Saturdays 2 and 3" | Choosing a booth, nothing | **No** |
| Run the Pop-Up, own device after re-sign-in | "You stopped at Saturdays 2 and 3" | Choosing a booth, nothing | **No** |
| Refresh mid-question | same stage and question | same stage and question, board intact | **Yes** (the half-typed number in the answer box is dropped — `R4-01`) |
| Second tab while the first is open | "THIS TAB IS NOT THE ONE RUNNING IT… you can move the run into this tab" | correct, and *Move the run to this tab* works | **Yes** (`R4-02`) |
| Tab closed, reopened after 2s and after 10s | — | correct stage, board intact, no stale-lock complaint | **Yes** (`R4-03`, `R4-04`) |
| Submitted run that reached the teacher | "Turned in 8/19/2026. Your teacher has it." | the run report | **Yes** |
| Submitted run the server refused | "You stopped at Turned in. Carry on." | Choosing a booth, nothing | **No** |
| Run on this device that the server never saw | *"Plan Under Pressure · You handle the money · **Start**"* | correctly resumes the local run | **No** — it says Start when there is a run here, then resumes it anyway (`N2-01`, `N2-02`) |
| Finished one story, started again | two rows for the same class, both labelled "Run the Pop-Up" | both correct | **Confusing, not false** (`T4-vic-home-after-second-story.png`) |

Two extra things I found while testing that last row:

- After a submitted run, the only offered action is **"Run the market again"**, which drops the
  child on the public marketing page and then puts them straight back into **the same world**
  with no picker (`T4-vic-after-run-again.png`). A class told "Two ways in. You pick one." has
  no way to pick the other one after finishing.
- **A child can no longer leave a run they chose by mistake.** Oli Fenn started Eight Weeks,
  opened the run menu — which correctly said *"Nothing here has been turned in yet. Leaving
  clears this run off this computer, and it cannot be got back."* (`S-03-oli-menu.png`) — and
  pressed **Yes — clear it and start again**. localStorage went to `[]`, he was signed out
  (`S-04`). He signed back in with his card and **the server put him straight back into the run
  he had just cleared**: no world picker, *Part 2 of 5: The plan*, Teammate Share −$1,000 still
  on the board (`S-05`, `S-06`, `S-07`), and the same on a second device (`S-08`). This control
  exists, per its own source comment, so that "a student who picked the wrong world" is not stuck
  with it. Server-authoritative resume has quietly taken that away. **This is a new regression
  introduced by the resume work.**

---

## New failure modes the resume machinery introduced

### a. The device's copy and the server's copy disagree
Covered above: they diverge and stay diverged, silently, forever. Log length is the only
tiebreak and it is not a clock. `C5-01`…`C5-04`.

### b. The network is down at the moment of resume — **one page load signs the child out**
`Home.tsx` calls `forgetStudent()` on **any** failure of `readMyClasses()`, including
`"No connection. Check the wifi and try again."` I loaded `/home` twice on a signed-in
mid-run device, once with every `/api/**` request aborted (dropped wifi) and once with the API
answering `503`:

```
wifi dropped   /home -> /join   storage: token and id DELETED, attempt survives
server 503     /home -> /join   storage: token and id DELETED
network back   /home -> /join   still signed out; the card must be typed again
```

(`N3-wifi-home.png`, `N3-serv-home.png`, `N3-wifi-recovered.png`, `N3-serv-recovered.png`.)

The *run* URL is offline-tolerant — a child already inside a run can reload it with no network
and keep working from the local copy (`N3-wifi-run.png`, and I drove three more decisions in
that state). But home is not, and home is where a child goes. A thirty-second wifi blip →
signed out → sign in again with the card → **the sign-in clears the device's attempts**
(finding B1) → in Run the Pop-Up the work is gone. That is a two-step chain from a dropped
access point to a lost lesson.

### c. The server has no attempt at all but the device does — **handled correctly**
Mia Evans played the opening of Eight Weeks with every `PUT /me/attempt` answered `503`, so the
server never learned she had started. On reload the gate received `{"has":false}` and the local
run was kept intact (`N2-02-mia-run.png`). The local copy correctly wins. The only blemish is
that her home said *"Start"* rather than naming the run.

### d. The class changes under a running run
There is no way in this build for a teacher to change an existing class's assignment — the
objective and story controls only exist on the *create* form (`A-02-teacher-classes.png`), so
the literal case cannot arise. The two roster changes that can:

- **Card reissued mid-run** (`R1-01`…`R1-04`): the student's session dies, they land on the
  join form with no explanation, they sign in with the new card, and Eight Weeks resumes
  correctly from the server. Signing in again also clears the device's attempts, per B1 — for a
  pop-up student that is the same total loss.
- **Taken off the list mid-run** (`R2-01`…`R2-03`): home 401s to the join form, but the run URL
  **still opens their run from the local copy** and they can carry on making decisions in a run
  that can never be turned in. Nobody tells them.

### e. One in-progress attempt slot per student per class
`GET /me/attempt?classCode=…` returns **one** record with **one** `worldId` (I logged the raw
response), and the class list carries a single `inProgress: {worldId, stage, updatedAt}`.
Finished runs are held separately — Vic's home showed a completed pop-up run *and* a new
in-progress one side by side — but there is only one in-progress slot per (student, class), so a
child who tries one story and switches to the other must overwrite the first story's checkpoint.
I could not drive that to a conclusion in the browser, because the regression above stops a child
switching stories at all; flagging it as the shape of the risk rather than a measured loss.

---

## What I could not fault

- Eight Weeks cross-device resume, repeatedly, on a cold profile.
- The resume line's *wording* — stage names read like a child's place in the story
  ("Saturdays 2 and 3", "The first plan", "Choosing a booth"), not like state ids.
- The B1 shared-computer fix, on the exact path the red team walked.
- Refresh, tab-close and second-tab behaviour, including the run lock and its recovery button.
- The run's own offline tolerance once you are inside it.
- The submission retry queue, when the child is left alone long enough to reload.
- The honest half of the escape-hatch copy: before a run is submitted it says plainly that
  leaving cannot be undone, and it means it.

---

## Can a school run this on shared and rotating devices?

**No — not until Run the Pop-Up resumes, because on today's build a child who chooses the market
and then signs in again anywhere, including on their own laptop at the end of a normal school
day, loses everything they did, while three separate screens tell them and their teacher that
nothing was lost.**

---

*Verified 2026-08-19, 00:07–02:00 UTC, snapshot `300ce62`, class G94MX on a durable file store.
Drivers: `.scratch/resume/`. Receipts: `gauntlet/receipts/resume/`.*
