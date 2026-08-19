# GAUNTLET STATUS

**Run:** BOW Decision Challenges — Autonomous Gauntlet Loop · **Lead:** Opus 5
**Branch:** `claude/bow-decision-challenges-gauntlet-pg1522`
**Rule:** the status file is not evidence. The running artifact is evidence.

---

## Phase

| Phase | State |
| --- | --- |
| 0 — Reconstruct the product | **DONE** |
| 1 — Research the external bar | **DONE** — 8 reports, `gauntlet/research/` |
| 2 — Rank the gaps | **DONE** — `gauntlet/DEFECTS.md`, 60 reproduced defects |
| 3 — Build / attack loops | **IN PROGRESS** — round 3 of N |
| 4 — Six-verdict judges | not started |

## Round 0 — twenty fresh critics

Twelve recon critics drove the running product; eight researchers established external bars.
Every finding in `gauntlet/DEFECTS.md` §A–G was reproduced by a critic against the running
app — none is a code reading. Reports: `gauntlet/critiques/`, `gauntlet/research/`.

The **D26 district red team** returned **GO WITH CONDITIONS**, having played two complete runs
by hand and operated every teacher surface, then named three blockers.

## Round 1 — shipped

| Commit | What it closed |
| --- | --- |
| `ad7e554` | Student and teacher accounts, rosters, sessions, cross-device resume, server-side attempt checkpoints, class deletion, CSPRNG credentials, authenticated submissions, CORS allowlist, rate limits. 27 new tests. |
| `8d80510` | Teacher overrides now change what every surface says. Marks refused against writing that does not exist. Mixed-class denominators fixed both ways. The 100-point composite removed, replaced with a world-neutral exportable line. Teacher→student feedback. A live "where the room is" view. Seats have names. |
| `f689a23` | Nine standards-honesty defects. |
| `29a9340` | Share-out: select, sequence, project, anonymised. |
| `d9ca777` | The student's own door and home screen. |
| `01f7f20` | Share-out present mode. |

## Round 2 — three fresh critics were pointed at Round 1's own work

They were given the goal, the bar and the running artifact, not the builder's reasoning, and
were told they were allowed to reject.

| Critic | Verdict | Single largest reason |
| --- | --- | --- |
| Accounts, home, live view, feedback, gradebook, share-out | **REJECT** | Two students signing in one after the other on a shared Chromebook become one account, so a child's own device shows a named classmate's work and teacher feedback — and that account can turn work in under the other child's seat and be accepted. |
| Game design / decision density | **REJECT** | The reading-to-decision ratio makes the run unplayable in the period it is sold for: 3,167 measured words buy about ten decisions, 21 minutes of reading at the product's own assumed rate against a declared 18m15s budget. |
| Copy, whole product | 9 CRITICAL · 22 MAJOR · 12 MINOR | Four ladders of vocabulary where there should be one, a grade band that disagrees with itself, and four teacher surfaces instructing teachers to hand out seat numbers the student flow no longer asks for. |

Every finding is in `gauntlet/DEFECTS.md` §H–K, with the "considered and not accepted" table
underneath — one claim was half-refused, with the reason.

### Closed since, and verified by the lead in a real browser

- **H1 — the account merge.** The card decides whose seat it is, and nothing else does.
  `claim()` no longer reads the browser's ambient session. What it costs: a student in two BOW
  classes signs in twice. Two tests now encode the failure directly, including one that proves a
  captured session cannot post under another child's seat.
- **H3 — the class door published the class list.** `GET /classes/:code/roster` without a
  teacher key now returns `{label, joinMode}`. The card resolves the seat by itself, which also
  took a step out of the join: two typed codes, no name grid.
- **H4 — a rostered class refused every submission the product produced.** The evidence
  transport now signs its requests. The old typed-code door in `OpeningStage` is deleted; the
  challenge route resolves the student from their session or sends them to `/join`. Verified by
  playing a complete run through the real door and watching the submission land.
- **H2, H5, H6 — the limiters and the join mode.** Join charges only failed attempts, per class,
  and says ten minutes because the window is ten. A removed student is told they were removed
  rather than told to re-check a correct code. Join mode is stored on the class, so an open class
  stays open and a rostered one stays rostered. Class creation is counted per signed-in teacher.
- Card lookup is a keyed blind index rather than a scrypt scan over the whole roster — the
  honest version of "resolve the seat from the card" for a class of sixty arriving at once.
- **J5** — a verdict no longer reads "No effect" above a line saying Avery paid more, and a test
  now fails any verdict that does.

### Closed since, second batch

- **The whole of the client-persistence workstream (D1–D14)**, including D26's stated largest
  gap: the opening board will not close over a row nobody has answered for, so a student who
  never opened the savings line is no longer reported as having set a figure on it.

  **This paragraph used to end "…so the one NYSED objective BOW claimed to assess can no longer
  silently fail to be assessed for a student who did everything right", and that is not true.**
  A student who types all three rows until the board balances answers for every row and closes
  the plan without naming which row took the last of the money — and one of three rows is always
  the arithmetic residual of the other two, so nothing in that run can say whether the savings
  figure was chosen or worked out. `plan-within-income.er3` reads `null` for those students and
  the competency reads *incomplete*, which is the honest answer and is what
  `evidence/plannedSavings.ts` argues at length. The golden run, Seat 14, is one of them.
  Forcing a closing statement was considered and is worse: it turns "put the rest in savings",
  used as a shortcut to enter a figure the student had already decided, into a scored zero —
  the exact inversion the rule was rewritten to remove. The gap is real, it is on the board
  rather than on the rule, and it is stated here rather than closed. Also: nothing that reached the evidence log waits for a
  debounce; one press writes one event; a second tab is told rather than allowed to overwrite;
  and a student sitting down at somebody else's unfinished run gets their own.
- **The educator surfaces.** The teacher's private note no longer reaches the projector. The
  share-out offers both worlds in a mixed class, one card per submission, no removed seats. One
  function now defines the class, the student and the attempt, and every count on the page is
  derived from it. The export is roster-shaped: absentees are blank rows, removed seats are
  gone, two attempts by one student are distinguishable.
- **Feedback is a sequence.** A second note used to silently destroy the first — on the one
  path this release exists to build. Notes accumulate, can be edited in place, can be taken
  back, and the length limit refuses rather than truncating.
- **The vendor review's code findings** — see §L. The disk is sealed, the retention promise is
  executed, one child can be erased without destroying the class, and an unauthenticated caller
  can no longer post a fabricated run into a teacher's evidence room.
- **The class list has a screen**, which is how a teacher actually runs a rostered class. Every
  route behind it had shipped and nothing could reach any of them.
- **Every challenge screen fits a phone.** 266px of horizontal scroll at 360px, on all
  nineteen. And a teacher who zooms can award full marks again.
- **`sort-by-need-want-goal` is becoming assessable** — Basketball's dead Weeks 1–4 is now one
  real decision, which takes the product from one assessable NYSED objective to two.

## Round 3 — three more fresh critics, pointed at Round 2's own work

Same discipline: the goal, the bar and the running artifact, not the builder's reasoning, and
told they were allowed to reject. All three reproduced their claims in a real browser against a
frozen snapshot of HEAD, because the tree was being committed to while they worked.

| Critic | Verdict | Single largest reason |
| --- | --- | --- |
| Student red team — five simulated 12–14-year-olds, played to the end | **REJECT** | On a shared classroom computer the second student to sign in lands inside the first student's run — reads their finished plan and their private written explanation — and then cannot turn in their own work at all. Reproduced twice, once by accident and once deliberately with two clean seats. |
| Teacher experience — a real teacher's five periods | **REJECT** (1 BLOCKER · 6 MAJOR · 5 MINOR) | A teacher has no account. Classes live only in one browser's `localStorage` plus a secret URL the product itself says "is not shown again"; a census of all four educator routes found zero password fields, zero sign-in controls — while `POST /api/auth/teacher` and `POST /api/classes/:code/claim` both worked when called directly. A reimaged laptop permanently destroys 28 children's assessed work. |
| Product coherence — is this one product | **REJECT** (6 BLOCKER · 21 MAJOR · 11 MINOR) | The two stories are not one product: the share-out projects a claim the run did not produce, the Pop-Up's evidence trail prints raw event vocabulary (`popup-spot`, `POPUP_SUM_SUBMITTED`, `event-5`) where Basketball prints English, and the two worlds end in two different endings. |

The student red team's closing finding is the one that decides this round: **the product told
children and teachers four things about those children that were not true**, and one thing in
the other direction — it told a teacher that a child who asked for help and was given it had
failed.

### Closed and verified since Round 3 opened

- **B1 — a shared computer handed one child another child's private writing.** Signing in as a
  different student now clears the device's attempts before the run mounts. Proved by deleting
  the rule and watching `src/student/sharedDevice.test.tsx` go red, then restoring it. `0ea8372`
- **B2 — "You worked this out", to a child who had just pressed *Show the answer*.** The board
  now branches on whether the figure was produced or supplied. The log always carried the
  difference; only the screen pretended otherwise. `300ce62`

### Routed, in flight

Every remaining finding from the three Round 3 critics is with a builder or a verifier, each
given the critic's evidence verbatim rather than the lead's summary of it:

- **The run must ask for a decision** — a 71.6-second shortcut-only run scored a competency
  DEMONSTRATED; an untouched savings line read as "the line held a figure the student set,
  **Independently**" for three students who never touched it; the Week 3 decision answerable by
  spending nothing and tapping one chip; the answer printed 120px below the box asking for it;
  a writing gate that blocks `idk` and admits forty characters of `aaaa`.
- **The last Saturday must be playable** — an unrecoverable dead end on the biggest crowd of the
  market, which the product then headlines **PAID OFF** and tells the student *"No other standing
  order beats it on these four crowds."*
- **Cross-device resume, verified rather than assumed** — a fresh verifier is establishing
  whether "Carry on" now keeps its promise on a second device, and what the new server-authoritative
  resume machinery does when the two copies disagree.
- **A second security and privacy review** — the first reviewer's BLOCKER is claimed closed by
  the lead, which is exactly the claim a fresh critic has to settle. Same brief: find a reason a
  district should refuse.
- The teacher's live panel reporting **Turned in** for children who never played · one student
  with two attempts read against the wrong run · the phone findings (the only escape control from
  a data-loss state renders at `left: -271px` on a 390px viewport) · the student who wants a
  second go and has no button.

### In flight

Run the Pop-Up's four Saturdays and its ending verdicts, plus the market's own competing-claims
beat so the two worlds stay equal · the prose cut, second pass · the accessibility findings ·
one vocabulary in place of four · the eight golden end-to-end journeys · a teacher-experience
critic, a student red team and a product-coherence critic, all running against the product now.

### Not yet started

The six-verdict judges and the adversarial synthesis.

## Round 4 — two verifiers sent at the two claims a product cannot make about itself

Both were given the brief and the running artifact and told they were allowed to reject. Both
reproduced everything they filed; neither was allowed to touch product code.

| Verifier | Verdict | Single largest reason |
| --- | --- | --- |
| Security & privacy, round 2 — *"find a reason a district should refuse"* | **REFUSE** | "There is no deployable configuration of this product that is both functional and encrypts children's data the way the product says it does." Round 1's blocker was closed on one of three drivers and reopened, in two new shapes, on the other two. |
| Standards — NYSED's own text, established before any repo document was opened | **HONEST WITH CORRECTIONS** | NYSED 1.1 was mapped `full` and is not: the objective names goals alongside needs, wants and values, and savings decisions alongside spending ones, and BOW collects none of that. The honest assessable count is **one**, not two. |

### What the security verifier found, and what closed it

The managed deployment — Vercel/Upstash, the exact path the first review signed off as a
defensible pilot — was broken both ways at once. With a store key set, `command()` sealed the
whole Upstash command envelope, so every request 400'd: the security-conscious configuration
was a total outage. Without one it ran, keeping every child's name and evidence as plaintext
JSON **and** the HMAC that signs every session token in the same store beside them — round 1's
blocker word for word. On the file store, confidentiality genuinely held and the verifier
proved it by grepping the whole data directory for planted names, keys and the secret and
finding nothing; its *tamper-evidence* did not, because `open()` passed any unsealed record
straight through, so one file write with no key at all forged a teacher account and opened the
evidence room. Two more: every per-address rate limit was off, because `X-Forwarded-For` was
read from the end the caller controls — three hundred wrong join-code guesses, none blocked —
and a rotated key read as an empty store while health reported the deployment ready.

All six closed at `8605d79`, with fourteen tests each proved to fail with its rule removed.
**None of it counts as closed until the same verifier reproduces it**, which is running now.

### What the standards verifier found

The parts that hold are worth stating as plainly as the correction: all 23 objective codes and
all 23 sentences are **verbatim exact** against both the official PDF and the official HTML,
diffed programmatically; topic names, NYSED's own topic definitions, alphabetical order,
per-topic counts and the Grades 5–8 band are correct; the pinned PDF re-downloaded to exactly
the recorded sha256, byte count and page count; and *"NYSED has not reviewed or endorsed BOW"*
is true — BOW appears zero times in NYSED's own instructional resources list.

The correction is that yesterday's claim of two assessable objectives was half right. Building
a real decision into Basketball's Weeks 1–4 genuinely made `sort-by-need-want-goal` observable.
The mapping row underneath it claimed `full` coverage of an objective BOW covers in part. It is
`partial` now, the count is one, and two tests that encoded the wrong claim are corrected with
the reason written into them. Two silences are also closed: that NYSED's requirement covers all
five topics taught by a certified teacher while BOW covers part of one, and that **NYSED does
not assess personal finance at all** — so nothing BOW produces is needed for the attestation a
district actually makes. Those were the two places a district was most likely to form a wrong
belief about an assessment product.


## Round 5 — three verifiers sent at three claims the product makes about itself

| Verifier | Verdict | Single largest reason |
| --- | --- | --- |
| Security & privacy, round 3 — sent back to **break the round-2 fixes** | **DEPLOY WITH CONDITIONS** (up from REFUSE) | Both HIGH holes closed on the bytes and could not be reopened. Three new MEDIUMs, all fixed since: a submission limiter keyed on an address, which one device on the school network emptied with junk posts until a real child's turn-in got a 429; a key canary that failed open when the file was deleted; and a sign-in that answered in 385ms for a real account and 5ms for an absent one, which is a directory of every teacher in the district. |
| Cross-device resume — twelve browser profiles as twelve devices, a real class, cards typed in like a child | **HALF** | *Eight Weeks to the Showcase* resumes on a second device exactly and reliably. **Run the Pop-Up does not resume at all** — the server hands the browser the whole run, eighteen events and her booth, and the browser throws it away and starts the market from Saturday zero with **NO SEAT YET** in the top bar. |
| Standards — NYSED's own text, established before any repo document was opened | **HONEST WITH CORRECTIONS** | See Round 4. |

### The finding that mattered most, and it was mine

The resume verifier pressed the teacher's **SIGN EVERYBODY OUT** control — offered under the
sentence *"One press ends every student session in this class, on every device. Nothing they did
is lost."* — with a student mid-run. The next morning that child typed her own class code and
her own card code on her own laptop, and every attempt and every draft on the device had been
deleted before she reached the screen.

The cause was the shared-device rule added a day earlier: it compares who is signing in with who
this browser last held, and signing out was removing the record of who was here along with the
session. Ending a session says *this session is over*; it does not say *somebody else is about
to sit down*, and only the second is a reason to throw work away. Fixed at `b54148b`, with the
test that asserted the old behaviour corrected and the reasoning behind the mistake written into
it rather than deleted.

### Still open from that verification, and routed

The same seat open on two devices diverges permanently and neither screen mentions the other —
one browser ends holding *"Only if a bonus rule is met $800"* and the other *"No bonus money
counted $0"*, both online, both refreshed, and whichever device the child finishes on is the
plan the teacher grades. *Leave this run* stopped meaning anything when the server became the
source of truth. And after a refused submission, both actions the product offers destroy the
retry queue, under a sentence saying the work is with the teacher.


## The container restart, and what it cost

At 02:00 UTC the container was restarted and every agent in flight was killed. Six were
working; none had committed. Their trees survived, their reports did not.

What that cost, honestly: **the reasoning behind roughly 2,700 lines of work.** The code, its
tests and its comments are all there and the unit suite came back green at **1,308 tests with
one failure** — a comment quoting a price the scenario owns, which the pricing scan caught — so
the work itself is intact and is now committed in five groups. What is gone is what each agent
had established but not yet written down: which of their own fixes they had verified in a
browser, what they had tried and rejected, and the answers to the questions I had asked them.

Those commits say so in their own messages rather than claiming the work as verified. A fix
marked closed by the agent that wrote it was never evidence; a fix committed by the lead with
the agent's evidence lost is less than that, and the commits say which is which.

**The durable lesson, already acted on:** every agent relaunched since carries an instruction to
commit and push in small increments rather than accumulate hours in a dirty tree, and to run
`scripts/verify-head.sh` before each push. That script exists for a different reason — HEAD broke
three times earlier tonight because `tsc`, `eslint` and `vitest` all run against a working tree
that is not what gets pushed — and it turns out to be the same discipline.

### The state at the restart

| | |
| --- | --- |
| Unit suite | **1,308 passing, 0 failing, 1 skipped** across 106 files |
| `npx tsc -b` | clean |
| `scripts/verify-head.sh` | HEAD builds from a clean checkout |
| Browser suite | **unknown** — being established now, for the first time tonight |

### What was in flight and is now committed

- **The instrument can tell a decision from a click.** A figure records how it arrived — typed,
  suggested, or determined by the arithmetic — and a row nobody touched produces no observation
  at all rather than a favourable one. This is the largest thing the student red team found and
  it is closed.
- **One page header across every educator surface**, and a brand mark that takes its tone from
  itself rather than from whatever wraps it.
- **A browser suite that imports the product's own tables** instead of restating them, plus two
  tests that were green while asserting nothing — one of them guarding an assessment-integrity
  rule.
- **Read-aloud and a glossary**, built and tested, not yet wired into a screen.


## Round 6 — eighteen at once

The instruction was to stop capping parallelism, so the loop is now as wide as the work
allows: **five builders and thirteen critics running simultaneously**, on a tree that is green
at 1,315 unit tests and builds from a clean checkout.

The critics are read-only and write only their own report and receipt directory, so they never
collide with each other or with a builder. The builders hold non-overlapping territory and have
each been told to commit and push in small increments — the lesson from the restart, which cost
six agents' reasoning and nothing of their code.

### The five builders

| | |
| --- | --- |
| **The market must come back on a second device** | The one known-open blocker: the server hands the browser the whole run and the browser starts the market from Saturday zero. Plus Saturday 4's crowd becoming a stated range rather than a number, which is my ruling on MAJOR-39. |
| **A run must survive the school day** | The same seat on two devices diverging permanently with neither screen mentioning the other; *Leave this run* meaning nothing since the server became the source of truth; and a refused submission whose two offered actions both destroy the retry queue. |
| **Reading tools, wired** | Read-aloud and a glossary onto every screen of both stories, and three accessibility repairs an audit specified and nobody took — including an erase confirmation that lands focus on the safe button by positional luck. |
| **The browser suite, run for real** | Nobody has yet had an honest number from it. |
| **The season stops contradicting itself** | Six coherence findings about Basketball that were orphaned when the restart killed the agent they were routed to — including a Week 5 that may charge a student for a plan they did not build. |

### The thirteen critics, and the ground each is on that nobody has walked

Three replay the whole product with fresh eyes on current HEAD: a **student red team** of five
children, a **teacher** running five sections, and **District 26** answering their own five
questions from the software rather than from the documentation.

The other ten are on ground no round has touched:

- **Keyboard and screen reader** — nobody has ever completed a run without a mouse, or written
  down what a blind student actually hears in order.
- **Economics and pedagogy** — nobody has attacked the money. Whether the arithmetic reconciles,
  whether the financial concepts are *true*, whether it is age-right, and how it reads to a child
  whose family is short this week.
- **Assessment validity** — the question the whole product rests on. Not "does it work" but
  whether a mark out of it means what it claims about a child.
- **Engineering** — would the second engineer survive here, and which of the claimed boundaries
  are enforced rather than asserted in a comment.
- **School hardware** — a throttled Chromebook on loaded school wifi, and the print output nobody
  has looked at.
- **World-class product** — the reader with no constituency, asked where it stops being designed
  and starts being assembled.
- **Copy and voice, round two** — told to go and find the fifth thing this product says that is
  not true.
- **Resilience** — breaking it the way a Tuesday breaks it, on a durable store, with the disk
  full and the clock moved.
- **Cold clone and data officer** — following the documentation as a stranger, and then answering
  a parent who asks for their child's work to be deleted, proving it on the bytes.
- **Security, round five** — sent back at the key-rotation command and the enumeration limit that
  answered their round-four findings.


## What twenty agents cost, and the number the box actually holds

Twenty ran for about fifteen minutes and then the container died. Load average was 25 on four
cores — which is fine, they queue — but free memory oscillated between 190 MB and 1.5 GB with
Chromium instances spiking, and that is the number that kills. It took every agent's uncommitted
reasoning with it for the second time tonight.

**The honest ceiling on this box is about eight**, and the loop runs there now, refilling as
agents land rather than stacking. That is not caution: past the memory line the next agent does
not add throughput, it trades against an existing one and eventually against all of them.

**What survived, and why.** Every builder launched after the first crash carried an instruction
to commit and push in increments. The path-traversal fix below exists because the reviewer who
found it messaged the lead instead of holding it in a working tree; it was fixed and pushed
within minutes of being reported. Nothing that had been committed was lost either time.

### The worst defect in the gauntlet, found and fixed between the two crashes

A signed-in **student** could permanently destroy any other teacher's class by sending a session
id shaped like a path. `readSubmission()` checked length and not characters; the file store built
a submission's filename out of `${seatCode}:${sessionId}`; a session id of
`aaaaaaaa/../../../<victim's code>/class` walked out of the submissions directory and overwrote
the victim's `class.json`. **HTTP 202.** The victim teacher, holding their own teacher key, then
got a 403 on their own class — a term of thirty children's evidence permanently unreachable —
and health reported the store as fine, because the blob was valid ciphertext.

To do it: a class code off a whiteboard, and a student session anybody can self-serve by joining
any open class. No store key. No disk access. The same primitive reached the key canary, the
teacher accounts, and every roster and evidence file the server can write.

Fixed at `c1f09bf` in two layers, because one validator is how it happened: identifiers a client
chose must match a character set at the door, and the file store now **throws** rather than
sanitises when anything client-influenced is about to become part of a path. Two tests, one per
layer; the second matters more, because the door's rule can be got wrong again and the store's
refusal is the guarantee that the next time it is, this is not the consequence.


## Largest remaining gap

**No longer J1.** The reading load was the largest measured gap for two rounds and it is now
inside its budget, on the instrument that found it rather than on an assurance. Running
`src/stages/readingLoad.test.tsx` against HEAD:

| | measured words | at 150 wpm | at 120 wpm + declared interaction | declared |
| --- | --- | --- | --- | --- |
| Eight Weeks to the Showcase | 2,367 (was 2,714) | 15.8 min | **25.9 min** | 20–28 minutes |
| Run the Pop-Up | 2,139 | 14.3 min | **22.6 min** | 20–28 minutes |

Every stage in both worlds is now under its own budget, and the declared range covers the slow
case rather than only the optimistic one. The duration moved as well as the prose — 20–25 became
20–28 — because a number that survives only by assuming a fast reader is the same defect wearing
a different hat.

**The largest gap is now what Round 3 named: the product says things about children that are not
true.** Four of them, in the student red team's list, plus one in the other direction. Two are
closed. The rest are routed, and none of them is closed until a critic who did not build the fix
reproduces it. A run that can be finished in 71.6 seconds by pressing the biggest button on every
screen, and is then reported to a teacher as a demonstrated competency, is the same defect at the
assessment layer: the instrument cannot tell a decision from a click, so its report on a child is
not evidence of anything.
