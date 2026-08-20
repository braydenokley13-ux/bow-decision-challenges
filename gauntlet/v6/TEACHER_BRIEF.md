# The teacher product — from document to instrument

**Brief for the V6 gauntlet. Written from rendered evidence.**

## The failure, measured

Two surfaces carry the whole teacher product, and both are documents rather than instruments.

| surface | rendered height at 1366px wide | what that is |
| --- | --- | --- |
| `/educator/class/DEMO` — the class overview | **5,914 px** | ~7.7 screens |
| `/educator/class/DEMO/students/1` — one student's evidence | **7,285 px** | ~9.5 screens |

`gauntlet/v5/shots/08-demo-class.png` and `14-student-case.png` are the evidence. Open them.

Neither is *wrong*. The information is honest, the vocabulary is disciplined
(`src/educator/labels.ts` fails the build if two ladders reuse a word), and the assessment
integrity underneath is real. **The problem is that nothing is ranked.** Seven
`dashboard-section` blocks arrive at identical weight, and the answer to the only question a
teacher opens this page with is somewhere inside them.

`gauntlet/v5/QUALITY_DEBT.md` already named the causes, and they are still true:

- **A — every panel is the same material, so nothing is dominant.** The design system has one
  card. "Make this dominant" cannot currently be expressed, only faked with size.
- **B — long identical lists rendered as the product.** *Every student who turned in* is 18
  identical rows. The class objectives page is 23 identical rows. A database dump wearing a
  stylesheet.
- **C — numbered sections at equal weight**, procedural numbering standing in for hierarchy.
- **D — teaching prose conflated with the control**, at the same visual weight.
- **E — 12px type carrying the teacher product.** `--t-label` and `--t-micro` are both 0.75rem;
  on the dense teacher surfaces three of the four readable sizes cluster between 12 and 14px, so
  metadata, captions, counts and status all arrive at the same volume.

Two further findings from this gauntlet's own reading of the rendered pages:

- **F — the teacher's primary action is 7,000 px below the fold.** On a student's evidence page,
  *Write back* — the human-authored feedback box, the one thing only a teacher can do — is the
  last element on the page, under fourteen override controls and a full activity transcript.
- **G — the student's own writing is behind a tab.** The thing that most needs a human is
  demoted; BOW's own criterion-by-criterion judgements are what the page opens on.

## The ten-second test, which is the actual specification

A teacher walks in, opens their class on a Chromebook, and has ten seconds before twenty-eight
children need them. In those ten seconds the page must answer:

1. **Who needs me right now** — and *why*: stuck, not started, waiting on my reading, waiting on
   my feedback, or finished and fine.
2. **What is the one thing I should do next**, as a control I can press, not a paragraph.

Everything else on the page is reference material and may be one interaction away. Rank ruthlessly.

## The journey that must hold together

Teacher sign-in → class list → class → roster and student cards (issue, reissue, revoke) →
assignment → class progress → one student → their decisions, their evidence, their writing →
teacher judgement or override → private notes → human-authored feedback → the student receives
it → privacy, retention and deletion controls.

Every one of these routes exists today. Read them before redesigning anything:

    src/educator/MyClasses.tsx           the class list
    src/educator/RealClassPages.tsx      class overview + one student's evidence (1,649 lines)
    src/educator/Roster.tsx              cards: issue, reissue, revoke
    src/educator/AssignmentBuilder.tsx   the builder
    src/educator/ObjectivePages.tsx      objectives, and a second assign path (see below)
    src/educator/ReadingQueue.tsx        the writing that needs a human
    src/educator/Debrief.tsx             the class debrief
    src/educator/ShareOut.tsx            project to the room
    src/legal/DataProtection.tsx         privacy, retention, deletion

## The open product decision nobody has made

`gauntlet/v5/QUALITY_DEBT.md` closes on it: **there are two live paths to assigning work**, and a
comment in `ObjectivePages.tsx` insists there is one.

| entry | goes to | creates a class? |
| --- | --- | --- |
| `/educator/assign?code=1.3` → `AssignFlow` | `/educator/classes?objective=1.3` | yes, and sets the objective |
| the objective page's **Assign this** button | `/educator/assignments/new?objective=1.3` | the assignment builder |

Decide it. Either the builder is the single path — in which case `AssignFlow`, the `arriving`
block in `MyClasses.tsx` and its "Or start a new class" branch come out — or both exist and each
says when it is the right screen. Having both, with a comment claiming there is one, is the
defect. Record the decision in `gauntlet/v6/DECISIONS.md`.

## Non-negotiable

- **Teacher feedback is human-authored.** No AI writing analysis, no AI-generated feedback, no
  student writing sent to any model. There is no such call in the repository today and none may
  be added.
- **No composite student score, and no letter grade as a BOW result.** The gradebook line that
  exists is explicitly the *teacher's own* marks — "BOW adds nothing to it" — and that framing
  must survive any redesign.
- **Missing evidence is not zero. Supplied is not demonstrated. Incomplete is not failure.** The
  four states must stay visually distinguishable, and not by colour alone.
- **A teacher override must propagate everywhere the affected judgement appears** — class
  overview, objective standing, the student page, and anything the student sees.
- Every claim on screen must be derivable from stored evidence. No estimate presented as a fact.
- Do not claim teacher validation. `gauntlet/TEACHER_TEST_PACKET.md` exists to *prepare* testing;
  its existence is not evidence that testing happened, and nothing in the product or docs may
  imply real teachers have run it.

## Accessibility and platform

- WCAG 2.2 AA target. Keyboard-only operation of the whole journey, visible focus, logical order,
  accessible names, recoverable validation, focus restoration on dialogs.
- Reflow at 320px and 400% zoom with no horizontal scroll. The teacher surfaces are the densest in
  the product and the most likely to break here.
- Chromebook 1366×768 is the primary teaching device. 1024×600 must remain usable.
- State must never be carried by colour alone.
- **Stop solving density by shrinking.** Raise the floor on the teacher type scale and solve
  density with information architecture and progressive disclosure instead.

## The bar

A teacher opens the class and knows who needs them before they have finished sitting down. A
district administrator looks over their shoulder and sees an instrument a school could run on —
calm, fast, obviously designed — not a generated dashboard and not a report.
