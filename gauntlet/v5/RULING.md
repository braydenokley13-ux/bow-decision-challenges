# V5 product ruling

**Author:** Opus 5, product director · **Date:** 19 August 2026 · **Branch:** `claude/bow-d26-gauntlet-v2-0b3lbk`

Four recon agents read the product. This is what I am deciding on the strength of what they
found. Every claim below names the file it came from, because the charter's first rule is that
this document is not evidence — the running artifact is.

**Baseline, verified cold:** 1,958 tests pass, `vite build` succeeds. `tsc -b` **failed on a
clean tree** at HEAD (`gridFloors.test.ts:46`, `match[1]` possibly undefined); it passed
locally only off a stale `.tsbuildinfo`. Fixed in this run. That is the second time this
repository has shipped a non-building HEAD behind a green-looking local tree, and the first
time is §1 of `V4_STATUS.md`.

---

## 0. The finding that reorders everything

**There is no function that answers "which worlds can legitimately produce evidence for this
objective."** `grep` for `worldsFor|compatibleWorlds|worldsForObjective` returns nothing.
`worldsAssessing` exists (`availability.ts:226`) and has three call sites, none of them in the
standards layer or on any teacher screen.

Worse, the write path does not check either. `readAssignmentRequest`
(`platform/classes/assignments.ts:192`) validates `allowedWorldIds` against `BUILT_WORLD_IDS`
and **never checks those worlds produce the objective's competencies**. `MyClasses.tsx:124`
feeds it `PLAYABLE_WORLDS` — the *story* registry, which knows nothing about coverage.

And the deepest one: **no test generically asserts that a `BUILT_WORLD_COVERAGE` row is backed
by an observer route.** The recon agent proved it by executing the real functions — a
well-formed false row (world `credit` claiming all four required rows of `gross-to-net`,
correctly contract-stamped) makes `availableCompetencyIds`, `worldsAssessing`, `isAssessable`,
`assessableStandards` and `contractDrift` all pass, and the lie reaches `MODULE_COVERAGE.md`
and every educator surface. The only thing standing in the way is the world's *own*
`coverage.test.ts` — a file the next world's author has to remember to write.

Today this is harmless: two worlds, both producing all three built competencies. It stops being
harmless at world three, which this charter orders for next week.

**So the demo's central promise — "different worlds, the same goal, comparable evidence" — is
currently a true sentence with no mechanism under it.** Building the compatibility contract is
not a feature. It is the precondition for being allowed to show the magic trick at all. It is
Wave 1, item 1.

---

## 1. Student visual system — what changes

**Done in this run** (tokens re-pointed, every one of 4,300 lines of CSS moved at once):

- Identity moves from warm cream + athletic blue to **violet on deep navy**. `--violet-600`
  (`#6733e8`) carries white text at 6.5:1; the ramp is the only violet in the product, so the
  colour always means *this is BOW and this is the thing to press*.
- A real **dark ground** (`.ground-dark`) with the same semantic token names as the light one,
  so a component written against `--surface` renders correctly on either. This is what stops
  two products becoming two component libraries.
- Radii 3–5px → 6–22px, and two-part navy-tinted elevation. The old 5px ceiling is the single
  loudest reason every surface read as a printed document.
- **Ticket geometry retired.** The notch, the perforation and the cut edge were the
  "admissions pass" identity. `.ticket` survives as the card because a hundred call sites use
  it; the modifiers are no-ops.
- New mark: heavy `BOW` wordmark with a violet four-point star, painting its own colours so it
  cannot be repainted by an ancestor (the old one shipped three different renderings of itself,
  one at 1.05:1).
- **World art as code** (`WorldArt.tsx`). Every reference carries a world on a photograph and
  this product cannot: Chromebook carts, a school network, `connect-src 'self'`. Inline SVG
  scenes themed from `[data-world]` — one composition (graded sky, one light source,
  silhouetted subject, pool of light), different subject and light temperature per world. Zero
  network requests, no licensing, and a world's art cannot drift from its interface.

**Kept from the old system, because none of it was about hue:** a deliberately small palette;
four money colours and a stripe so the difference survives greyscale; AA on every ink/surface
pair including sunken and inset; no webfont request.

**Still to do:** the student shell itself is still the teacher's shell. `.ground-dark` exists
and only the front door uses it. Motif HUDs do not exist.

## 2. Teacher visual system — what changes

Light, calm, dense, fast. White cards on `#f5f5fa`, near-black navy ink, violet reserved for
action and active state, semantic colour restrained to what money means.

The teacher product's problem is **not** its palette and never was. Recon found real substance
— cross-world "What they decided", per-competency class position, honest *Evidence not all in*
states, derived-not-authored headlines. The problem is that it is one long unstructured
document: no cards, no grouping, no drill-down, no progressive disclosure, no contextual
action. §15 of the live update is right — productize, do not delete.

**Explicitly refused from the references:** `Overall 78% Proficient`, `38 / 50`, `84% Overall
coverage`, and `Class impact this week +18% / +24% / +31%`. The composite score is the exact
thing this product removed deliberately and its own release gate treats as disqualifying.
Week-over-week deltas need two weeks of real data. Those are the mockups being wrong, which the
charter says to expect.

## 3. World hub — how central

**Central. It is the missing structural primitive, and it is presentation work over a model
that already exists** — which is why it is affordable.

Four of the reference hub's five locations already have real mechanics in Food Truck:

| Location | What already exists | Missing |
| --- | --- | --- |
| **Supplier** | `payForTrays` — a real purchase routine: affordability across two funding lines, floors to whole units, prices the order, returns the split | a place, a moving price, a second SKU |
| **Market** | three booths, different rent/traffic/economics, build-gated so none dominates; `MarketBackdrop variant="lane"` **already draws the lane** and is used as decoration at 28% opacity | the map being the instrument |
| **Festival** | Saturday 4 — biggest crowd, only stated range, only night Marisol can be hired, only night that can fail to happen; has its own balance harness | being a place you travel to |
| **Truck** | balance sheet, serve capacity 45/80, a rented generator that dies with a deposit held against it | truck state, equipment |
| **Bank** | — | everything. Three near-misses: the deposit, the cushion line, and receivables |

**The structural blocker is real and I am ruling on it now.** `STAGE_ORDER` is a linear array
and the reducer hard-codes transitions. `balance.ts`'s sweep is a claim about a *fixed*
strategy space — 174,339 states today — and every optional pot multiplies it.

**Ruling: the hub is a shell over the existing linear spine, not a replacement for it.** The
ten stages keep their order. The hub adds a persistent place, a persistent HUD, ambient events,
and stakeholder messages *around* them, and a read-only "the market so far" that is derivable
from `ledgerOf(state)` today. No optional pot ships until the balance harness can sweep it.
This buys the entire feeling of a world without touching `economy.ts`, `ledger.ts` or
`resolution.ts` — which is the clearest evidence the foundation is sound.

Every spatial surface ships with a linear equivalent that is not a lesser experience. The
reference already shows the pattern in its own bottom bar ("What would you like to do?"), and
that row is also the narrow-viewport and keyboard layout. Not a concession — the same product.

## 4. Flagship — **Food Truck**

Scores: Food Truck **7/10**, Basketball **7.5/10**. I am overriding the aggregate.

| | Basketball | Food Truck |
| --- | --- | --- |
| Realistic / abstract / generic interactions | 3 / 8 / 9 | **9 / 6 / 5** |
| Genuine uncertainty | none numeric; one hidden punitive threshold | **a told band that lands inside it** |
| Repeating operational loop | no | **yes** — order → sell → spoil → re-order |
| Hub locations with real mechanics | ~2 | **4 of 5** |
| Model depth | **better** — two currencies, instrument budget, rail, counterfactuals | good |

Basketball has the better *model*. Food Truck has the better *world*. Five reasons it takes the
flagship:

1. Its interaction ratio is already three times better, and the charter's first interaction law
   is "do the thing".
2. Four of five hub locations exist mechanically. Basketball's would be invented.
3. It owns the product's only genuine uncertainty.
4. **Both supplied world references are Food Truck.** Building toward a reference we have beats
   inventing one.
5. Its weaknesses are presentation-level (no place, five `binary-choice` moments, Saturdays 2–3
   resolved off-screen). Basketball's are model-level and expensive: a known-false ending family
   covering **1,676 of 6,552 reachable endings**, and a hidden-threshold fairness problem its
   own source comments apologise for in prose.

Basketball stays a first-class second world — it is what proves the choice is real — and gets
one fix now (§7).

## 5. Persistent student identity — and where I am stopping

Build everything **within a class**. Do not build a cross-class profile in this run.

What already exists and is better than expected: `StudentAccount` is already class-agnostic and
its own comment says a student can be on several rosters; `listSeatsForStudent` is a
many-classes index; `GET /me/classes` already renders across all of them; sessions are
revocable via `sessionGeneration`; `AttemptCheckpoint.payload` is an opaque blob the service
never reads, with a measured 256KB ceiling — exactly the shape carried world state wants; and
`runCopies.ts` already merges two divergent copies by ancestry with a symmetric fork tiebreak.

**Why I am stopping at the class boundary.** Three hard constraints, and they are promises
rather than bugs:

1. `legal/notice.ts:265` publishes: *"No behavioural profile that outlives the class, no
   cross-class picture of a child."* `dataInventory.test.ts:334` runs every inventory row
   against the live service and fails if one arrives unexamined.
2. A student account is *defined* by its seats and is deleted with the last one. A profile that
   outlives every class has no deletion trigger, and the retention sweep skips everything under
   `_` by construction.
3. Students have no email and no password **by design**. There is no credential a child could
   carry between classes, so cross-class identity needs a new one — a teacher-issued
   carry-forward card is the only model this product's privacy stance allows.

The charter asks for persistent identity carrying cash, inventory, reputation and relationships.
Everything it actually needs for the demo — account, class, assignments, chosen world, saved
world state, resume, decisions, reasoning, completion, evidence history — is achievable inside a
class today. Crossing the class boundary means editing a published privacy commitment to a
district, and that is a founder's decision, not a build task. **I am building up to that line
and flagging it, not stepping over it quietly.**

One live defect found on the way, and it is a real classroom failure: an **open-class student
cannot get back in**. Their join code is minted and returned once (`identity.ts:1206`) and
`Join.tsx` never renders it. Retyping their name next day creates a second seat, a second
account and an empty board — while the screen warns them about exactly that, pointing at a code
they were never shown. Roster classes are fine. Fixing this is Wave 1.

## 6. Keep / extend / refactor / replace

| System | Ruling | Why |
| --- | --- | --- |
| Evidence engine — competencies, requirements, observers, `observe.ts` | **KEEP** | The refusal to machine-score writing is structural (`observe.ts:112` discards a kind mismatch). `plannedSavings.ts` makes two worlds agree on one requirement. This is the asset. |
| `BUILT_WORLD_COVERAGE` → observer join | **EXTEND — urgently** | §0. The claim is real; nothing generic proves it. |
| Assignment model | **EXTEND** | Already first-class: own id, own store slot, own route, `objectiveRef`, `competencyIds`, `allowedWorldIds`, `studentChoosesWorld`, `closingQuestion`. Storage and API already carry many per class. Four named things block it being used. |
| `economy.ts` / `ledger.ts` / `resolution.ts` (Food Truck) | **KEEP — do not touch** | Derived-never-stored, swept over 174,339 states, build-gated against a dominant strategy. Six counterfactual verdicts each re-running the real ledger with one decision changed. |
| `PLAN_MODES` instrument budget | **KEEP** | A design constraint living in the model with a build gate on it. |
| Identity / class service / crypto / retention | **KEEP** | Sealed per record, canary key-loss detection that refuses every request on mismatch, timing-equalised auth, an allow-listed unauthenticated surface with a test that probes the real handler. |
| `runCopies.ts` two-device merge | **KEEP** | Ancestry not length, symmetric tiebreak, converges without either device hearing from the other. |
| Teacher evidence derivation | **KEEP** | Derived, not authored. Honest insufficiency states. Gated below 5 assessed. |
| Teacher evidence *presentation* | **REPLACE** | A document. §2. |
| Student shell | **REPLACE** | It is the teacher's shell with different words. |
| Visual token layer | **REPLACED** this run | §1. |
| Ticket geometry | **DELETED** this run | It was the old identity. |
| Front door | **REPLACED** this run | Was a text block and two bare cards. |
| `binary-choice` component | **REPLACE** | Five of Food Truck's decisions and most of Basketball's high-consequence ones. One component, so one fix. |
| Basketball's known-false ending family | **DEFER, do not hide** | 1,676 states. Needs its own sweep. Not before the demo; not concealed either. |

## 7. First "do the thing" interactions — the reference bar

In build order. Each replaces a `binary-choice` or a static screen with an instrument.

1. **The Supplier.** The reference screen, and the bar for everything else: enter a place,
   inspect goods carrying price against shelf life against quality against demand, move a
   quantity, watch a basket total, commit through a deliberate physical confirmation, watch
   cash and inventory update. Food Truck already has the purchase routine underneath.
   **Uncertainty rule: no projection states a certainty.** `Sales Impact +$84 this round` is the
   single most dangerous pixel in the reference set and we are not shipping it. A projection is
   a range, or conditioned on a crowd that has not happened, or it does not appear.
2. **Counting conditional money.** Today: two paragraphs and four buttons. Becomes chips you
   place on the plan board — the board's ceiling visibly rises, money that *might* turn up is
   drawn differently from money that is there, and the cover-line question becomes which line
   the chips fall out of rather than three words to pick between.
3. **Basketball's clinics, 0–4 Saturdays.** `clinicWeeks()` already returns four and
   `SaturdayBlocks` already *draws* them as tiles that are not pressable. Making them pressable
   turns the sharpest trade in that world from a binary into an instrument, and costs one
   multiplier in two functions.
4. **The tray order gate.** `PopUpSum key={trays}` re-arms the arithmetic gate on every stepper
   change, so exploring 3→4→5 trays forces re-answering the price each time. It taxes exactly
   the students who explore. Move the sum to the commit.

Deliberately **not** on this list: a Bank. It is the one absent location and inventing a loan
mechanic before the hub exists is the "overbuild infrastructure before proving worlds" failure.

## 8. The golden vertical slice

One assignment, one class, three students, three worlds, one teacher who understands what came
back. Accepted only end to end, in a browser, with no developer tools and no database edits.

```
TEACHER   sign in → class → create assignment → pick objective 1.3
                  → "let students choose" → BOW shows ONLY worlds it can PROVE are compatible
                  → checkpoints + closing question → evidence preview → publish
STUDENT A joins → sees the assignment → picks Food Truck → hub → supplier → buys stock
                  → market night → consequence → adapts → explains → submits
STUDENT B same assignment → picks Basketball → genuinely different mechanics → submits
STUDENT C same assignment → leaves mid-run → RETURNS NEXT DAY → resumes → submits
TEACHER   results → class understanding → cross-world comparison → student case file
                  → decisions, reasoning, evidence, consequences, standard → an action
```

Student C is not decoration. Resume across a session boundary is the claim a district will test,
and it is where the open-class defect in §5 lives.

## 9. Dispatch

Parallel where the work is genuinely independent; serialized for builds, browsers and suites.

| Workstream | Owner | Depends on |
| --- | --- | --- |
| **W1 · Compatibility contract** — `worldsProducingEvidenceFor`, generic coverage guard, write-path validation | Opus direct | nothing — it is the blocker |
| **W2 · Multi-assignment spine** — checkpoint key, student picks, `/me/classes` fix, teacher list | Sonnet | W1 types |
| **W3 · Assignment builder + evidence preview** | Sonnet | W1 |
| **W4 · Food Truck hub + HUD** | Sonnet | nothing |
| **W5 · Supplier interaction** | Sonnet, after a design war | W4 |
| **W6 · Student shell** — dark, launcher, resume | Sonnet | W2 |
| **W7 · Teacher case file + command centre** | Sonnet | W2 |
| **W8 · Open-class re-entry defect** | Haiku | nothing |
| **W9 · Basketball opening screen defect** | Haiku | nothing |
| **Courts** — evidence integrity, visual, accessibility, D26 red team | independent judges | the above |

No implementation agent certifies its own work. Opus holds the portfolio decision.

## 10. Acceptance test

The slice is accepted when every one of these is true, checked in a browser:

1. `npm run typecheck`, `npm test`, `npm run build`, `npm run lint` all pass **from a cold
   tree** — no `.tsbuildinfo`, because that is how HEAD broke twice.
2. A world appears in the builder's compatible list **only** if the code can prove it produces
   every required evidence row of the objective's competencies. A test adds a false coverage row
   and the build fails.
3. `readAssignmentRequest` refuses an `allowedWorldIds` containing a world that does not produce
   the objective's competencies.
4. One class carries two assignments; a student sees both and picks one; each keeps its own
   resume point.
5. Three students in three worlds against one objective produce evidence that lands in one
   comparable teacher view, with per-world denominators kept apart.
6. A student closes the browser mid-run and resumes the next day, in an **open** class.
7. No screen states a projected consequence as a certainty before the decision.
8. No surface shows a composite score, a coverage percentage BOW cannot source, or a
   week-over-week delta with one week of data.
9. Every spatial surface is fully operable by keyboard, at 1024×600 and at 200% zoom.
10. The teacher can reach, from a class: what a named student decided, why they said they did
    it, what it cost them, what it demonstrates, what it does **not** yet demonstrate, the
    NYSED objective, and one action.

Sunk cost carries zero weight. A surface that only looks good next to other education software
fails.
