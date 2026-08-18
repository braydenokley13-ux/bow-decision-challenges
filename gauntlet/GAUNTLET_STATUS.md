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
| 3 — Build / attack loops | **IN PROGRESS** — round 1 of N |
| 4 — Six-verdict judges | not started |

## Round 0 — twenty fresh critics, all reported

Twelve recon critics drove the running product; eight researchers established external bars.
Every finding in `gauntlet/DEFECTS.md` was reproduced by a critic against the running app —
none is a code reading. Reports: `gauntlet/critiques/`, `gauntlet/research/`.

The **D26 district red team** returned **GO WITH CONDITIONS**, having played two complete runs
by hand and operated every teacher surface: *"a better-built thing than I expected, and I came
in intending to reject it… a product that scores its own scaffolding as a non-demonstration
was built by someone who understands what assessment is for."* It then named three blockers.

## Round 1 — shipped so far

| Commit | What it closed |
| --- | --- |
| `ad7e554` | Student and teacher accounts, rosters, sessions, cross-device resume, server-side attempt checkpoints, class deletion, CSPRNG credentials, authenticated submissions, CORS allowlist, rate limits. 27 new tests. |
| `8d80510` | Teacher overrides now change what every surface says. Marks refused against writing that does not exist. Mixed-class denominators fixed in both directions. The 100-point composite removed and replaced with a world-neutral, exportable gradebook line. Teacher→student feedback. A live "where the room is" view. Seats have names. |
| `f689a23` | Nine standards-honesty defects: the guide no longer badges an unassessable objective "Primary"; the grade band is named; a `full` mapping resting on an optional requirement is closed; four over-claimed mappings downgraded; grade-band code collisions refused. |

Deterministic gates after each: `tsc -b` · `eslint` + `stylelint` · **887 unit tests**, all green.

## In flight

- **Client persistence & the er3 blocker** — reload data loss (including the whole written
  explanation), double-click event duplication, two-tab clobber, shared-device hijack, the
  missing pop-up escape hatch, and making `plan-within-income.er3` observable on a
  hand-balanced board. That last one is D26's largest gap: the one objective BOW claims to
  assess can silently fail to be assessed for a student who did everything right.
- **Share-out** (Smith & Stein select/sequence, Desmos-style anonymised projection) — lead.

## Not yet started

Student home and the account sign-in flow · demo/real unification · game decision density
(Basketball Weeks 1–4, Pop-Up Saturdays 2 and 3, Pop-Up's ending) · copy pass · visual pass ·
accessibility fixes · six-verdict judges.

## Largest remaining gap

The student never sees anything come back. Feedback now exists on the teacher's side and
reaches the service; the student-facing home that shows it is not built yet.
