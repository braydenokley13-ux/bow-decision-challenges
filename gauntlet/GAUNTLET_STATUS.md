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
| 3 — Build / attack loops | **IN PROGRESS** — round 2 of N |
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

### In flight

- The educator surfaces: the projected private note, the share-out's missing world, the three
  disagreeing counts, the roster-shaped export.
- Feedback as a sequence rather than a single record; the grade band; the seat-number
  instructions; the worst string.
- Client persistence, the write-up draft, the tab lock, and the er3 remainder blocker.

### Not yet started

Decision density (the costed five-fix plan in `gauntlet/critiques/decision-density.md`) ·
the terminology ladders · visual pass · accessibility fixes · Golden E2E journeys ·
six-verdict judges.

## Largest remaining gap

**J1.** Both worlds are more reading than deciding, and both understate their own word counts
in their own tests. Everything else on this page is a defect; this one is the product's shape.
