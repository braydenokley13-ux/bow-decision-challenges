# BOW Decision Challenges — V2.1 Interaction-Design Review

**Status:** Targeted change set to the accepted V2 master specification  
**Scope:** Student interaction, calculation load, Pressure Test, no-conditional-income path, affected evidence rules, and affected acceptance criteria  
**Not changed:** Product thesis, official alignment, six concepts, 100-point grading architecture, educator product, standalone-resource positioning, Week 5 event, privacy approach, MVP boundary, or event-sourced explainability

This document does not replace the V2 master specification. It replaces only the interactions and rules identified in Section 8 below. All V2 content not explicitly changed here remains authoritative.

---

# 1. Student-experience audit

## 1.1 Overall finding

V2 has the correct educational target and consequence structure. Its remaining weakness is that the interface sometimes asks the student to describe the mathematics of a plan **after the financial state already contains that evidence**.

The highest-risk sequence is:

> enter at-risk income → set four floors → rank reduction order → enter capacity → enter uncovered amount → run the test

To a curriculum designer, those are distinct evidence points. To a first-time Grade 6–8 student, they are five representations of one question:

> “If this money disappears, what would I change?”

The revised experience should ask that question once and let the student's alternate financial state answer it.

## 1.2 Screen-by-screen audit

| V2 moment | First-time student experience | Finding | V2.1 decision |
|---|---|---|---|
| Product entry and seat code | Ordinary classroom administration | Low cognitive load | **KEEP** |
| Mission-loading screen followed by a separate role/goals screen | Two screens before the financial situation begins | One transition too many; no evidence gained | **COMBINE** mission and role into one screen |
| Four income cards | Contract terms are concise and consequential | Necessary information, not a quiz | **KEEP** |
| Enter `$200 × 8 = $1,600` | Calculates an actual fixed cost needed by the plan | Meaningful recurring-cost calculation | **KEEP**, but place it inside the Working Plan rather than on a disconnected contract worksheet |
| Calculate two setup totals | Student needs comparable full costs before choosing | Strong C2 evidence; numbers affect Week 5 | **KEEP** |
| Enter reliable floor `$500 + $4,500 = $5,000` | Simple, but it establishes the dependable base before optional income | Unique C1 evidence and realistically necessary | **KEEP**, integrated into the Income Rail |
| Toggle conditional sources | A genuine strategy choice | Strong; the choice changes resources and risk | **KEEP** |
| Enter “money to allocate” after the app already knows income, setup, and essentials | Reproduces a value the system must calculate anyway | Redundant; the later plan balance proves finite-resource use more directly | **REMOVE** numeric entry; display the amount automatically |
| Allocate goal, reserve, flexible money, and unassigned cash | Four labels create ambiguity between “flexible” and “unassigned” | Too many near-duplicate categories | **MERGE** unassigned cash into **Flexible cash**; retain three adjustable categories |
| Confirm whether to keep an unassigned remainder | Feels like reconciling a worksheet | Caused by the redundant fourth category | **REMOVE** |
| Automatically treat the first `$400` of flexible money as Weeks 1–4 spending | Student must remember a rule unrelated to a decision they made | Artificial, hard to explain, and unnecessary because setup/essentials already provide locked money | **REMOVE** the `$400` rule and all dependent fields/formulas |
| Enter at-risk income | App already knows which source switches are on | Duplicate evidence | **REMOVE** entry; show the computed amount prominently |
| Set minimum floors for four categories | Student has to reason in terms of an assessment model rather than the character's situation | Abstract and mechanically dense | **REMOVE** |
| Rank categories first/next/last | Adds another representation of the same intended cuts | Redundant; actual changes reveal priority | **REMOVE** |
| Enter fallback capacity | Sum of changes the student is already constructing | Duplicate evidence | **REMOVE** |
| Enter uncovered exposure | Difference the interface can show from the student's state | Duplicate evidence | **REMOVE**; show live **Still exposed** |
| Press “Run pressure test” after already building it | A sixth procedural step to reveal a state the app can display continuously | Unnecessary ceremony | **REMOVE**; saving the alternate plan is the submission |
| Automatic Week 5 fallback execution using saved reduction order | Makes the system decide which student priority changes when the actual event differs from the test case | Mechanically neat but less authentic and less assessable | **REPLACE** with the student's saved alternate plan as a visible reference that the student can apply or revise |
| Week 5 gap calculation | Requires combining lost income and new personalized costs | Strong C5 numerical evidence and realistically needed before repair | **KEEP**, but calculate the total change once before direct repair; do not ask the student to reproduce amounts already shown by the Plan Board |
| Enter final available funds after choosing the `$500` opportunity and `$800` payment | Income Rail already knows the exact source state | Redundant data entry | **REMOVE**; source choices update the rail automatically and the student must reconcile the resulting plan |
| Build another floor-based `$800` minimum plan | Repeats the Pressure Test's abstract machinery | Necessary competency, wrong representation | **KEEP THE RISK CHECK**, but use the same direct alternate-Plan-Board interaction; prefill from the student's own earlier fallback when possible |
| Evidence tiles and 2–4 sentence defense | Reduces writing load while requiring use of the student's own numbers | Strong C6 evidence | **KEEP** |

## 1.3 Working-memory audit

V2 asks the learner to hold all of the following simultaneously during the Pressure Test:

- original allocations;
- which money is conditional;
- the amount selected;
- what has already been spent;
- four minimum floors;
- a reduction order;
- the sum of possible reductions;
- the remaining uncovered amount.

That is more a test of managing the interface model than of managing financial uncertainty. V2.1 reduces the live mental model to:

- **This money may disappear.**
- **These costs cannot move.**
- **These three future amounts can move.**
- **This is how much remains exposed.**

## 1.4 Mechanics that are already excellent

- **KEEP** educator-selected worlds.
- **KEEP** fictional roles and world-native setup risks.
- **KEEP** conditional-income switches as strategy rather than right/wrong answers.
- **KEEP** one evolving Plan Board.
- **KEEP** setup-dependent Week 5 costs.
- **KEEP** the optional `$500` opportunity with a visible time cost.
- **KEEP** the ability to submit an unresolved plan so weak evidence is preserved instead of blocked.
- **KEEP** attempts, supports, snapshots, trajectory, and transparent grading.
- **KEEP** human review of the final 10 reasoning points.

---

# 2. Exact recommended interaction changes

## 2.1 Simplified financial state

The opening Plan Board has two locked cards and three adjustable cards.

### Locked

- Selected setup
- Eight-week essentials

### Adjustable

- Future course goal
- Safety reserve
- Flexible cash

**Flexible cash** means money not committed to the course or reserve. It replaces both V2's “Flexible money” and “Unassigned cash.” A student may put any amount, including `$0`, in any adjustable category. No category is morally preferred.

The live rail shows:

- Funds in this plan
- Locked
- Assigned to future priorities
- Still unassigned or overcommitted

The student does not enter a separate allocatable total. The board calculates and displays it from the student's income-source state, setup, and essentials. The student demonstrates finite-resource planning by bringing the live balance to `$0` and saving the plan.

## 2.2 Removed `$400` early-spending rule

Delete `spentEarlyFlex = min(openingFlex, 400)` and every reference to Weeks 1–4 flexible spending.

The distinction between locked and adjustable money is already authentic:

- the setup is committed;
- all eight weeks of essentials remain required;
- Week 5 required costs become locked when revealed;
- course, reserve, and flexible cash remain adjustable.

This is enough to assess C4.2 and C5.2. The `$400` rule adds memory load without adding a unique financial concept.

## 2.3 One state, three modes

Do not build separate worksheet-style representations. The same Plan Board has three modes:

1. **Working Plan** — the student's opening plan.
2. **Fallback Version** — a copy with selected conditional income removed.
3. **Week 5 Plan** — the committed plan after the event, revised by the student.

The mode changes the available income and locked costs; it does not change the interaction grammar. Students always work by changing the actual category amounts.

## 2.4 Week 5 uses the saved fallback as student work, not an automatic formula

Remove the automatic reduction-order execution.

If a student saved a Fallback Version, Week 5 displays its category amounts as ghost targets beside the current plan:

> **Your saved fallback**  
> Course `$1,100` • Reserve `$600` • Flexible cash `$1,600`

The student can:

- apply the saved version;
- apply one category amount at a time;
- ignore it and build a different response.

Using a fallback the student previously created is not a scaffold. It is evidence that the plan was executable. Because the actual Week 5 change includes new costs and may differ from the earlier income-loss case, the student must still adapt.

## 2.5 Final remaining-income check

If the final plan still counts the `$800` completion payment, the student selects **Preview without `$800`**. The same Plan Board removes that source and displays the remaining exposure live.

- If the earlier saved fallback still works with the revised plan, its compatible amounts appear as the starting version.
- If it no longer works, the student changes the three adjustable categories directly.
- No floors, reduction order, capacity entry, or uncovered entry appears.

If the student excludes the `$800`, the final plan must balance without it and no preview is required.

---

# 3. Revised Pressure Test interaction

## 3.1 When it appears

The opening Pressure Test appears only when the Working Plan counts at least one conditional income source.

The app computes exposure from the selected source cards. The student does not enter it.

## 3.2 Exact screen transition

The Working Plan remains visible for one beat, then the striped conditional segments slide or fade out of the income rail. Reduced-motion mode changes the state immediately.

Student-facing copy:

> **What if this money does not arrive?**  
> Your working plan counts **`$X`** that depends on a condition. Build the version you would use without it. Setup and essentials cannot move. Your future course goal, reserve, and flexible cash can.

Persistent summary:

> Money that may not arrive: **`$X`**  
> Amount freed: **`$Y`**  
> Still exposed: **`$Z`**

Where:

```text
exposure = selected conditional income
openingAdjustable = openingGoal + openingReserve + openingFlexibleCash
fallbackAssigned = fallbackGoal + fallbackReserve + fallbackFlexibleCash
amountFreed = openingAdjustable - fallbackAssigned
stillExposed = max(0, exposure - amountFreed)
fallbackUnassigned = max(0, amountFreed - exposure)
```

## 3.3 What the student does

The student directly changes:

- Future course goal
- Safety reserve
- Flexible cash

Original amounts remain visible in small text on each card. The student may reduce one category, several categories, or reallocate between them. The resulting Fallback Version must use exactly the lower amount of available income to balance.

Locked setup and essentials remain visible but cannot move. An attempted change records `LOCKED_MOVE_ATTEMPTED` and shows:

> This cost is already committed. Change future money instead.

The message does not name which future category to change.

## 3.4 Submission states

### Balanced fallback

When `stillExposed = 0` and `fallbackUnassigned = 0`:

> **Fallback ready**  
> This version works without the `$X` conditional income.

Primary action: **Save fallback**.

### Money still exposed

When `stillExposed > 0`:

> This version is still **`$Z` short** if the conditional money does not arrive.

Primary action: **Keep adjusting**.  
Secondary action after one meaningful attempt: **Save with `$Z` still exposed**.

The secondary action opens one confirmation:

> You are saving a fallback that is still `$Z` short. You can continue, but this will affect what happens later.

### Too much removed

When `fallbackUnassigned > 0`:

> You freed `$Y`, which is `$fallbackUnassigned` more than the income removed. Put that money back into a future category so this version accounts for every dollar.

This feedback identifies the state contradiction without prescribing a personal priority.

## 3.5 What is no longer asked

The student does **not**:

- enter the at-risk amount;
- define protected floors;
- rank a reduction order;
- calculate capacity;
- calculate uncovered exposure;
- press a separate Run button.

The saved Fallback Version is the answer. The difference between the opening and fallback states is the evidence.

## 3.6 Why rigor is preserved

The student still has to:

- recognize that selected money can disappear;
- preserve committed costs;
- choose which future priorities change;
- free the correct net amount;
- produce a lower-income plan that reconciles;
- accept an explicit residual if the plan remains incomplete.

What disappears is only the requirement to translate those decisions into assessment vocabulary and duplicate calculations.

---

# 4. Revised handling for students using no conditional income

## 4.1 Remove the artificial `$800` minimum

Delete `pressureTarget = max(800, exposure)`.

If the Working Plan uses no conditional income, the app states:

> **Income check complete**  
> This plan uses only money Avery/Maya already has or is guaranteed. There is no income fallback to build right now.

The student continues. They do not receive C4 credit merely for avoiding conditional income.

## 4.2 Where C4 evidence comes from instead

The authentic Week 5 event supplies the contingency problem for confirmed-income plans.

After the student calculates the event's total financial change, and **before** the optional `$500` opportunity appears, the same Plan Board enters **First Response** mode:

> **Use your current plan first.**  
> A new cost created a `$X` gap. Change future course, reserve, or flexible cash to cover as much as you can. Setup, essentials, and the new required cost cannot move.

Live state:

> Amount freed: **`$Y`**  
> Gap remaining: **`$Z`**

The student saves this First Response. This is the primary C4 observation for the no-conditional path.

Only after that snapshot is saved does the optional `$500` opportunity appear and the broader C5 repair continue.

## 4.3 Path-aware evidence rule

| Opening strategy | Opening C4 evidence | Week 5 C4 evidence | Maximum C4 points available |
|---|---|---|---:|
| Uses conditional income | Fallback Version is the primary observation | First Response is a second observation and trajectory evidence | 20 |
| Uses confirmed income only | Not observed at opening | First Response is the primary observation | 20 |

For the confirmed-only path, C4 remains **Not observed** until Week 5. It is not zero and it is not automatically demonstrated. If the student never reaches Week 5 because of a technical interruption, use Not observed under the existing V2 rule.

## 4.4 Why this is comparable without being identical

The financial risk differs because the student made a different strategy choice. The evidence opportunity remains comparable:

- a concrete amount must be covered;
- locked money cannot move;
- the same three future categories can change;
- the student must produce or explicitly fail to produce a viable lower-resource state;
- attempts, support, residual exposure, and trajectory are recorded identically.

Students who use confirmed income face an authentic `$700 / $850 / $1,050` Week 5 cost, depending on setup. Students who use conditional income may face larger exposure, but they also chose to plan with more money. BOW should compare mastery rules and usability by path during pilot testing rather than force identical visible tasks.

---

# 5. Calculation keep/remove table

| Student-entered calculation in V2 | Financial concept revealed | Already observable elsewhere? | Would removal weaken application evidence? | Realistically needed for the decision? | V2.1 decision |
|---|---|---|---|---|---|
| Setup B full cost | Recurring + one-time total cost | No; selecting the option alone does not prove the total was understood | Yes | Yes, to compare setups | **KEEP** |
| Setup C full cost | Unit cost × quantity | No | Yes | Yes, to compare setups | **KEEP** |
| Eight-week essentials: `$200 × 8` | Converting a recurring obligation into the plan horizon | Partly; the board could provide it, but then the student would not show this calculation | Yes, modestly | Yes, the total must be budgeted | **KEEP**, integrated into Working Plan |
| Reliable floor: `$500 + $4,500` | Identifying the amount available regardless of future conditions | Not fully; source switches show strategy but not the dependable total | Yes | Yes, it establishes the base plan | **KEEP** |
| Money available after setup and essentials | Subtracting fixed commitments from income | Yes; the Plan Board and balance state compute the exact remainder | No | A real planner needs the number, but the financial interface can display it from already-entered inputs | **REMOVE/AUTOMATE** |
| Selected at-risk income | Summing conditional sources | Yes; the source switches fully determine it | No | The learner needs to see it, not re-enter it | **REMOVE; DISPLAY `$X`** |
| Fallback capacity | Total of category reductions | Yes; it is the difference between opening and fallback Plan Boards | No | The student needs to free money, not name “capacity” | **REMOVE; DISPLAY Amount freed** |
| Uncovered exposure | Exposure minus reductions | Yes; live state determines it | No | The student needs to know the remaining risk, but the interface can display it | **REMOVE; DISPLAY Still exposed** |
| Week 5 total financial change | Combining lost planned income with required and setup-dependent costs | No; final balancing alone could be achieved by following a visible gap without interpreting the event | Yes | Yes, the student must understand what changed before repairing it | **KEEP** as one visual gap-builder calculation |
| Post-fallback gap as a second entered number | Prior gap minus reductions | Yes; the Plan Board displays remaining gap after direct changes | No | No | **REMOVE; DISPLAY Gap remaining** |
| Final available funds after `$800`/`$500` choices | Adding source cards the Income Rail already controls | Yes | No | The total is needed, but the rail can calculate it immediately | **REMOVE/AUTOMATE** |
| Final balance | Whether revised resources cover revised commitments | The live Plan Board is the balance | A separate entry adds no evidence | The learner must see and close it, not copy it | **KEEP AS LIVE STATE; DO NOT ASK FOR ENTRY** |
| Completion-payment fallback capacity | Total reductions in the no-`$800` preview | Yes; direct alternate-plan state proves it | No | The learner needs a workable version, not a capacity calculation | **REMOVE; USE DIRECT PREVIEW** |

The resulting experience has five purposeful numeric entries in the normal path:

1. Setup B total
2. Setup C total
3. Eight-week essentials
4. Reliable income floor
5. Week 5 total financial change

Everything else is demonstrated through the state the student constructs.

---

# 6. Updated student flow

| V2.1 state | Purpose | Student action | Evidence |
|---|---|---|---|
| **S0 Entry** | Join assigned challenge | Enter class/seat code | Session only |
| **S1 Role + contract** | Establish role, goal, four income terms, and the eight-week problem | Review concise cards and begin | Context viewed |
| **S2 Setup comparison** | Compare full costs and world-native tradeoffs | Calculate B/C; select one | C2 calculations and choice state |
| **S3 Working Plan** | Establish dependable funds, fixed costs, income strategy, and opening allocation | Enter reliable floor and essentials; select conditional sources; adjust three future categories until balance is `$0`; save | C1 + C3 opening evidence |
| **S4 Fallback Version — conditional path only** | Build the plan without selected conditional income | Directly adjust the same three categories; save balanced or explicitly exposed version | Primary C4 evidence for conditional path |
| **S5 Time transition** | Commit opening state and advance to Week 5 | Continue | Opening/fallback snapshots |
| **S6 Week 5 update** | Reveal lost outcome income, required `$700`, and setup-dependent cost | Build one total-change calculation from event tiles | C5.1 + C5.3 |
| **S7 First Response** | Use the current plan before adding new income | Apply/revise saved fallback if available; directly change adjustable categories; save response | C4 evidence for all; primary C4 for confirmed-only path; C5 trajectory |
| **S8 Opportunity + final repair** | Decide on `$500` opportunity and remaining `$800`, then finish adaptation | Accept/decline opportunity; include/exclude completion payment; adjust same board to `$0` | C1.3 + C5.2/C5.4/C5.6 |
| **S9 Remaining-risk preview — only if `$800` is counted** | Verify the final plan without the remaining conditional payment | Review prefilled prior fallback if compatible; adjust three categories until exposure is `$0` or submit residual | C5.5 and later C4 evidence |
| **S10 Defense** | Explain the student's own strategy | Select evidence tiles; write 2–4 sentences | C6 educator review |
| **S11 Submitted** | Confirm completion and preserve evidence | Review summary or exit | Structured result; reasoning pending |

Student-facing progress labels:

1. Setup
2. Working Plan
3. Plan Check, shown only when conditional income is used
4. Week 5
5. Defense

The target completion language becomes:

> **Target completion: approximately 12–15 minutes, to validate through Grades 6–8 usability testing.**

The simplification may reduce median time, especially for students using conditional income, but V2.1 makes no completion-time claim before testing.

---

# 7. Necessary mastery and evidence-rule changes

## 7.1 Concepts and weights remain unchanged

| Concept | Points | V2.1 status |
|---|---:|---|
| C1 Use income by reliability | 15 | Same concept and weight; C1.2 becomes state-based rather than an exposure-entry calculation |
| C2 Calculate and compare full cost | 10 | **KEEP unchanged** |
| C3 Construct a viable budget | 15 | Same weight; remove allocatable entry and merge flexible/unassigned categories |
| C4 Build an executable contingency | 20 | Same weight; evidence comes from alternate/current plan states rather than floors, order, and capacity calculations |
| C5 Adapt after conditions change | 30 | Same weight; keep one event calculation and score the constructed repair, not a duplicate final-income entry |
| C6 Defend with financial evidence | 10 | **KEEP unchanged** |

Structured evidence remains `/90`; educator-reviewed reasoning remains `/10`.

## 7.2 Revised micro-skill rules

| Micro-skill | V2.1 observable success rule |
|---|---|
| **C1.1 Reliable floor** | Student enters `$5,000` from savings + base pay |
| **C1.2 Treat at-risk income as removable** | If conditional income is selected, the Fallback Version removes exactly those sources; if none is selected, the saved Working Plan contains no conditional dollars. No exposure-total entry is required. |
| **C1.3 Handle income after the event** | Outcome payment is absent after cancellation; the final plan either excludes completion pay or contains a viable no-`$800` version |
| **C2.1 / C2.2 Full cost** | **KEEP V2 rules** |
| **C3.1 Carry fixed costs into the plan** | Student calculates `$1,600` essentials; selected setup and essentials appear once as locked costs |
| **C3.2 Avoid or repair overcommitment** | First saved Working Plan does not use more than available funds; attempts and support retain V2 scoring behavior |
| **C3.3 Account for all available money** | Working Plan balance is `$0` across locked costs, future goal, reserve, and flexible cash |
| **C4.1 Construct a fallback/first response** | Student directly creates a lower-resource state by changing actual adjustable categories |
| **C4.2 Preserve committed money** | Student's saved state changes only future goal, reserve, or flexible cash; locked-move attempts are retained |
| **C4.3 Recognize remaining exposure** | Student saves a state with live residual `$0`, or explicitly acknowledges the exact nonzero residual before continuing |
| **C4.4 Produce a workable contingency** | Saved Fallback Version or Week 5 First Response has no remaining exposure; partial credit when a known residual remains |
| **C5.1 Calculate personalized Week 5 change** | Student correctly totals applicable lost outcome income + `$700` + setup-dependent cost before repair |
| **C5.2 Use only adjustable money during repair** | Final repair changes only permitted future categories; locked attempts affect trajectory under existing rules |
| **C5.3 Incorporate all Week 5 information** | Gap-builder includes every applicable event tile with the correct sign |
| **C5.4 Finish with a viable plan** | Final Plan Board balances at `$0` or preserves an explicit unresolved amount |
| **C5.5 Handle remaining `$800` risk** | If counted, direct no-`$800` preview balances; if excluded, final funds and commitments balance without it |
| **C5.6 Use the optional opportunity coherently** | The final state reconciles under the accepted/declined `$500` choice and its time consequence remains visible; neither choice earns preference points |
| **C6.1–C6.4** | **KEEP V2 human rubric** |

## 7.3 Live feedback and independence

The following are standard state visibility and do **not** count as direct support:

- Amount freed
- Still exposed
- Gap remaining
- Unassigned or overcommitted amount
- Original versus current category amounts
- Applying the student's own previously saved fallback

These displays reveal the consequence of the student's action but do not tell the student what category to change.

Direct support remains:

- highlighting a category that should be reduced;
- proposing exact replacement amounts;
- auto-balancing a fallback;
- supplying the event equation;
- applying a system-generated, rather than student-generated, plan.

The existing 5/4/3/2/0 scoring scale remains. A meaningful attempt occurs only when the student selects **Save plan**, **Save fallback**, **Save first response**, or **Submit**. Exploratory slider movement before saving is not a failed attempt.

## 7.4 Path-aware C4 status

- Conditional path: opening Fallback Version is the first observation; Week 5 First Response and any final `$800` preview provide later evidence.
- Confirmed-only path: Week 5 First Response is the first observation.
- A later independent workable state can improve current status while the first checkpoint's points and trajectory remain visible.
- C4 dashboard drill-down must display the observation context: **Opening income fallback** or **Week 5 cost response**.

## 7.5 Updated C4 misconception tags

| Tag | Deterministic rule | Teacher-facing wording |
|---|---|---|
| **Partial fallback** | `stillExposed > 0` when fallback/first response is saved | “The student changed the plan but left part of the financial risk uncovered.” |
| **Locked money attempted** | Student attempted to change setup, essentials, or required event cost | “The student tried to reuse money that was already committed.” |
| **Conditional money still supports fixed plan** | Conditional income is removed and saved alternate commitments still exceed available funds | “The lower-income version still depends on money that may not arrive.” |
| **No alternate state completed** | Student reached the checkpoint but supplied no usable saved fallback/first response, including Show and continue | “The student did not construct a usable lower-resource plan.” |

Delete the V2 misconception **Capacity miscalculated** because students no longer enter capacity.

---

# 8. Exact replacement text/sections for the V2 specification

## 8.1 Global time-language replacements

Replace every V2 claim of “11–13 minutes,” every “10–15 minute” product estimate, and the statement that 11–13 minutes is expected performance with:

> **Target completion: approximately 12–15 minutes, to validate through Grades 6–8 usability testing.**

In the Educator Challenge Brief, use:

> Grades 6–8 • Target 12–15 minutes • Post-instruction application assessment

In acceptance criteria, do not set a passing median before testing. Use the Section 9 language below.

## 8.2 Replace V2 Section 8.1, “Experience target,” with

> Students should feel, “I am handling this situation,” not, “I am filling out financial fields.” The experience uses one evolving Plan Board in Working Plan, Fallback Version, and Week 5 modes. Whenever the student's constructed state already proves a relationship, the interface shows the derived number rather than asking the student to reproduce it.
>
> **Target completion: approximately 12–15 minutes, to validate through Grades 6–8 usability testing.** Simplification may reduce completion time, but BOW will treat that as a hypothesis until student testing.

## 8.3 Replace the final bullet of V2 Section 8.6, “Reading and calculation load,” with

> Students enter five decision-relevant calculations: two setup totals, eight-week essentials, the reliable income floor, and the Week 5 total financial change. Allocatable funds, at-risk income, fallback reductions, residual exposure, updated income, and final balance are computed from the financial state and displayed live. These displayed values remain assessment evidence because they result from the student's source choices and constructed plan.

## 8.4 Replace V2 Section 9.5 Step B through Section 9.6 with

### Determine the working resources

The student enters the reliable floor:

`$500 savings + $4,500 base pay = $5,000`.

Each conditional card has a **Count in working plan** switch. The Income Rail updates automatically. The student does not enter plan funds or at-risk income.

The selected setup and the student's `$1,600` essentials total appear as locked cards. The board automatically displays:

> Available for future priorities: **`$X`**

### Construct the Working Plan

The student assigns the available amount to:

- Sports-media course goal
- Safety reserve
- Flexible cash

The student can change amounts in `$100` increments. A live balance shows **Still unassigned** or **Overcommitted**. The student saves when the balance is `$0`; they may also submit an unresolved state after the existing support sequence. No separate allocatable-total entry or unassigned-cash category appears.

### Pressure Test — only if conditional income is counted

> **What if this money does not arrive?**  
> Your working plan counts **`$X`** that depends on a condition. Build the version you would use without it. Setup and essentials cannot move. Your future course goal, reserve, and flexible cash can.

The same Plan Board enters Fallback Version mode. Conditional income disappears from the rail. Original category amounts remain visible while the student directly changes the three adjustable categories.

Persistent live state:

> Money that may not arrive: **`$X`**  
> Amount freed: **`$Y`**  
> Still exposed: **`$Z`**

The student saves a balanced Fallback Version when `Still exposed = $0`, or explicitly saves a version with a known residual after at least one meaningful attempt. The saved alternate state is the assessment response.

Do not ask for protected floors, reduction order, capacity, uncovered exposure, or a separate Run action.

### Confirmed-income branch

If no conditional income is counted:

> **Income check complete**  
> This plan uses only money Avery already has or is guaranteed. There is no income fallback to build right now.

The student continues. C4 is not observed at this checkpoint and is assessed during the Week 5 First Response.

## 8.5 Replace the fallback-execution and gap portions of V2 Section 9.7 with

The Week 5 update removes the `$1,000` showcase payment if the Working Plan counted it and adds the required `$700` cost plus the selected setup's `$0 / $150 / $350` consequence.

The student constructs one event calculation:

```text
Week 5 financial change
= planned outcome income that disappeared
+ required $700 cost
+ setup-dependent cost
```

The interface supplies the student's applicable amount tiles but not the equation result. After the student submits, the Week 5 Plan Board displays that personalized gap.

If a Fallback Version was saved, its category amounts appear as **Your saved fallback**. The student may apply it, apply parts of it, or build a different response. The app does not execute an assessment-generated reduction order.

Before the `$500` opportunity appears, the student directly changes course goal, reserve, and flexible cash and saves a **First Response**. Live state shows Amount freed, Gap remaining, and any unassigned amount. This is a second C4 observation for conditional-income plans and the primary C4 observation for confirmed-only plans.

## 8.6 Replace the repair calculation paragraphs of V2 Section 9.8 with

The optional opportunity and remaining `$800` completion payment appear after the First Response is saved. Accepting or declining the opportunity and including or excluding completion pay update the Income Rail automatically. The student does not enter final available funds.

The student continues changing the same three future categories until the Week 5 Plan Board balances at `$0`, or explicitly submits a known unresolved amount.

If the final plan counts the `$800` completion payment, **Preview without `$800`** opens the same board in alternate mode. A compatible prior fallback may prefill from the student's own saved work. The student reviews or changes the three category amounts until the no-`$800` version balances, or submits a known residual.

No floor, reduction-order, capacity, uncovered-exposure, or final-income entry appears.

## 8.7 Replace V2 Fashion Sections 10.5–10.8 interaction mechanics with

Fashion uses the exact Working Plan, Fallback Version, Week 5 calculation, First Response, Opportunity, Final Repair, and remaining-`$800` interactions specified for Basketball. Fashion retains its own source conditions, production setups, event narrative, course goal, and opportunity/time tradeoff. The shared interaction does not replace fashion-native causes or consequences.

## 8.8 Replace the affected V2 mastery-table language with

| ID | Revised micro-skills; points unchanged |
|---|---|
| C1 | C1.1 calculate reliable income floor; C1.2 treat selected conditional income as removable through source and alternate-plan state; C1.3 remove unavailable outcome income and handle the remaining completion condition |
| C3 | C3.1 calculate and carry fixed essentials into the plan; C3.2 avoid or repair overcommitment; C3.3 account for all money across locked costs, goal, reserve, and flexible cash |
| C4 | C4.1 construct a fallback or first response by changing actual adjustable amounts; C4.2 preserve committed money; C4.3 recognize exact remaining exposure; C4.4 produce a workable lower-resource plan |
| C5 | C5.1 calculate the personalized Week 5 change; C5.2 use only adjustable money; C5.3 incorporate every applicable event component; C5.4 balance the repaired plan; C5.5 handle remaining `$800` risk through a direct preview; C5.6 construct a viable state under the selected optional-opportunity choice |

C2, C6, all concept weights, status labels, trajectory, and the 5/4/3/2/0 structured scoring scale remain unchanged.

## 8.9 Replace V2 Section 11.1's permanent parity language with

Basketball and Fashion are parallel MVP forms. For this first build, they retain matching financial magnitudes, operation types, event-cost tiers, evidence rules, and approximate interaction time so BOW can compare the two forms cleanly.

Long-term equivalence does **not** require identical dollar amounts, stage counts, decisions, or event structures. It requires equivalent opportunity to demonstrate the same financial competency at comparable cognitive, mathematical, reading, and adaptation demand.

The architecture therefore separates:

- `AssessmentBlueprint` — concept, micro-skill, evidence quality, support, trajectory, and grading requirements;
- `WorldScenario` — dollar amounts, decision graph, source conditions, event sequence, and world copy;
- `EvidenceMapping` — how each world-specific interaction satisfies each required micro-skill.

A future world can use a different structure only when its evidence mapping shows that every required concept has a comparable independent application opportunity. V1 Basketball and Fashion continue using the current parallel values.

## 8.10 Replace V2 Section 12.1 with the V2.1 flow

Use the exact state table in Section 6 of this document. Delete the separate V2 S8/S9 floor-and-capacity sequence, automatic fallback ledger step, and final-available-funds entry. Retain all existing persistence, stage locking, accessibility, unresolved-submission, and support states.

## 8.11 Replace affected educator-demo evidence

### C4 dashboard micro-skill labels

| C4 micro-skill | Full independent evidence | Needed support | Partial/not demonstrated |
|---|---:|---:|---:|
| Constructed a fallback or first response | 17 | 7 | 4 |
| Changed only adjustable, uncommitted money | 18 | 6 | 4 |
| Recognized the exact remaining exposure | 14 | 8 | 6 |
| Produced a workable lower-resource plan | 11 | 8 | 9 |

### C4 headline

> **Teach next: Build a complete fallback**  
> 14 of 28 students saved a plan with money still exposed.  
> 5 later closed the gap during Week 5; 9 still need follow-up.

### Seat 04 evidence replacement

> Seat 04's plan used `$1,800` of conditional income.  
> The student reduced future categories by `$1,200`.  
> Live residual shown and acknowledged: `$600`.  
> Direct scaffold used: Yes.  
> Final Week 5 plan: `$350` short.

Remove all dashboard references to a student-entered capacity total or student-entered uncovered amount.

## 8.12 Replace affected Seat 14 fixture text

- Working income: `$6,800`, including both conditional payments
- Opening allocation: course `$1,200`; reserve `$900`; flexible cash `$2,100`
- Fallback Version: course `$1,100`; reserve `$600`; flexible cash `$1,600`
- Amount freed: `$900`; still exposed: `$900`; student continued
- Week 5 total change: lost `$1,000` + `$700` required cost + `$350` rides = `$2,050`
- Student first entered `$1,950`, then independently corrected to `$2,050`
- Applied the saved `$900` fallback; gap remaining: `$1,150`
- Accepted `$500` clinic and reduced future categories by another `$650`
- Final plan: working funds `$6,300`, including `$800` conditional; locked `$3,650`; course `$800`; reserve `$400`; flexible cash `$1,450`; balance `$0`
- No-`$800` preview: course −`$300`; reserve −`$200`; flexible cash −`$300`; balance `$0`

Keep Seat 14's C4 at `17/20`:

- C4.1 constructed fallback: 5
- C4.2 used only adjustable money: 5
- C4.3 recognized and explicitly continued with the exact `$900` residual: 5
- C4.4 opening fallback remained incomplete: 2

Later independent no-`$800` work can still support **Demonstrated independently — corrected after consequence** while preserving the opening 17/20.

Keep C5 at `29/30`, structured evidence at `85/90`, reasoning at `9/10`, and final grade at `94/100`.

## 8.13 Replace the affected V2 data architecture fields

### Remove

- `allocatableInput`
- `unassignedCash` as a separate plan category
- `spentEarlyFlex`
- category floors
- reduction order
- `capacityInput`
- `computedCapacity`
- `uncoveredInput`
- minimum `$800` pressure target
- `fallbackLedger` generated from a reduction order
- `finalAvailableInput`
- completion floors

### Add

- `openingFlexibleCash`
- `computedAllocatable`
- `computedExposure`
- `fallbackGoal`, `fallbackReserve`, `fallbackFlexibleCash`
- `amountFreed`, `stillExposed`, `fallbackUnassigned`
- `fallbackSnapshot`, `fallbackSaveStatus`
- `week5ChangeInput`, `week5Change`
- `firstResponseGoal`, `firstResponseReserve`, `firstResponseFlexibleCash`
- `firstResponseSnapshot`, `firstResponseGap`, `firstResponseUnassigned`
- `savedFallbackApplied` and per-category source markers
- `previewGoal`, `previewReserve`, `previewFlexibleCash`, `completionExposureRemaining`
- `c4ObservationContext: opening_income_fallback | week5_cost_response`

### Event vocabulary

Add:

`FALLBACK_AMOUNT_CHANGED`, `FALLBACK_SAVED`, `FALLBACK_SAVED_WITH_EXPOSURE`, `SAVED_FALLBACK_APPLIED`, `FIRST_RESPONSE_SAVED`, `REMAINING_RISK_PREVIEWED`.

Remove:

`FLOOR_CHANGED` and any event whose only purpose is reduction-order ranking or capacity entry.

## 8.14 Replace V2 technical formulas with

### Opening plan

```text
reliableFloor = 500 + 4500
exposure = selectedCompletion(800) + selectedOutcome(1000)
planFunds = reliableFloor + exposure
fixedOpening = setupCost + 1600
computedAllocatable = planFunds - fixedOpening
openingAssigned = openingGoal + openingReserve + openingFlexibleCash
openingBalance = planFunds - fixedOpening - openingAssigned
```

### Conditional-income Fallback Version

```text
fallbackFunds = planFunds - exposure
fallbackAssigned = fallbackGoal + fallbackReserve + fallbackFlexibleCash
fallbackBalance = fallbackFunds - fixedOpening - fallbackAssigned
amountFreed = openingAssigned - fallbackAssigned
stillExposed = max(0, -fallbackBalance)
fallbackUnassigned = max(0, fallbackBalance)
```

A complete fallback has `fallbackBalance = 0`.

### Week 5 update and First Response

```text
lostPlannedIncome = includeOutcome ? 1000 : 0
requiredEventCost = 700 + setupEventCost
week5Change = lostPlannedIncome + requiredEventCost

week5AvailableBeforeOpportunity =
  5000 + (includeCompletion ? 800 : 0)

week5Locked = setupCost + 1600 + requiredEventCost
firstResponseAssigned =
  firstResponseGoal + firstResponseReserve + firstResponseFlexibleCash
firstResponseBalance =
  week5AvailableBeforeOpportunity - week5Locked - firstResponseAssigned
firstResponseGap = max(0, -firstResponseBalance)
firstResponseUnassigned = max(0, firstResponseBalance)
```

### Final repair

```text
finalAvailable =
  5000
  + (includeCompletionFinal ? 800 : 0)
  + (includeOptionalWork ? 500 : 0)

finalLocked = setupCost + 1600 + 700 + setupEventCost
finalAssigned = finalGoal + finalReserve + finalFlexibleCash
finalBalance = finalAvailable - finalLocked - finalAssigned
```

### No-`$800` preview

```text
previewAvailable = finalAvailable - 800
previewAssigned = previewGoal + previewReserve + previewFlexibleCash
previewBalance = previewAvailable - finalLocked - previewAssigned
completionExposureRemaining = max(0, -previewBalance)
```

Run the preview only when `includeCompletionFinal = true`.

## 8.15 Replace affected technical components

- Replace `PressureMeter`, floor-enabled `AllocationCard`, and `ReductionOrder` with `PlanModeHeader`, `LiveExposureSummary`, and alternate-state support in `PlanBoard`.
- Replace automatic `FallbackLedger` with `SavedFallbackReference`, which shows the student's own original and alternate amounts.
- Keep `GapBuilder`, but use it once for the Week 5 total change.
- Extend `MoneyRail` to show Working, Fallback, Week 5, and no-`$800` preview modes.
- Preserve all keyboard, stepper, direct-entry, screen-reader, focus, and reduced-motion requirements.

## 8.16 Replace affected tests

Remove tests for:

- minimum `$800` pressure target;
- floor validation;
- reduction-order permutations;
- capacity and uncovered inputs;
- `$400` early-flex cases;
- automatic fallback execution order;
- final-available-funds input.

Add tests for:

- exposure display for `0 / 800 / 1000 / 1800`;
- conditional branch shown only when exposure is nonzero;
- no-conditional C4 remains Not observed until Week 5;
- direct alternate-state balance and live freed/exposed amounts;
- saving complete and incomplete fallback states;
- locked-move attempts in fallback and Week 5 modes;
- saved fallback application without support downgrade;
- over-application creating an unassigned amount rather than a negative gap;
- one Week 5 total-change calculation for every setup/income branch;
- First Response as primary C4 evidence for no-conditional plans;
- direct no-`$800` preview;
- all V2.1 Seat 14 amounts and unchanged 94/100 result;
- future `WorldScenario` configurations with different amounts/decision graphs mapping to the same `AssessmentBlueprint` in a test fixture.

---

# 9. Updated acceptance criteria affected by V2.1

Replace only the affected V2 acceptance criteria with the following.

## 9.1 Application-assessment acceptance

- The student's Working Plan, Fallback Version or Week 5 First Response, Final Plan, and written defense remain the primary assessment responses.
- No student enters an amount that the same screen already derives from the student's source choices and plan state unless the entry provides distinct evidence identified in the calculation audit.
- The conditional-income Pressure Test contains no floors, reduction-order ranking, capacity entry, uncovered-exposure entry, or separate Run step.
- Live Amount freed, Still exposed, Gap remaining, and balance values do not identify which personal priority the student should change.
- A student cannot earn full C4.4 without saving a balanced lower-resource state.
- A student may earn full C4.3 while explicitly recognizing a nonzero residual, but the same residual prevents full C4.4.
- Live feedback is treated as state visibility; an auto-balanced or system-proposed plan remains direct support or answer supply under the V2 support rules.

## 9.2 No-conditional-income acceptance

- `exposure = 0` does not launch an artificial dollar target.
- A confirmed-only Working Plan earns no automatic C4 points or status.
- The Week 5 First Response provides all four C4 micro-skill opportunities before the optional `$500` resource appears.
- Maximum C4 points remain 20 on both evidence paths.
- Dashboard and individual evidence views name the C4 observation context so an educator can distinguish an opening income fallback from a Week 5 cost response.
- Automated tests prove that selecting confirmed income only neither adds nor removes points directly.

## 9.3 Calculation acceptance

The normal student path contains no more than five entered calculations:

1. Middle setup full cost
2. Lowest setup full cost
3. Eight-week essentials
4. Reliable income floor
5. Week 5 total financial change

Any proposed sixth calculation requires a written evidence justification answering all four audit questions in the user request. A displayed derived number is not counted as an entered calculation.

## 9.4 Direct-manipulation acceptance

- Working, fallback, Week 5, and remaining-risk states use the same three adjustable category controls.
- A saved financial state can be reconstructed exactly from the event log.
- The difference between opening and alternate/current states generates C4 evidence without a second student-entered representation.
- Setup, essentials, and event costs remain visibly locked; attempted changes are recorded.
- Students can save a known unresolved state and continue.
- Applying the student's own saved fallback does not reduce independence status.
- A system-generated fallback, exact amount suggestion, or auto-balance action does reduce or eliminate independent evidence under the existing support taxonomy.

## 9.5 Cognitive-load and usability acceptance

- The Pressure Test presents no more than three adjustable financial categories and three live summary values.
- A student never has to remember a hidden or arbitrary `$400` spending rule.
- In Grade 6–8 usability testing, record whether students describe the task in situation language (“what I would change”) rather than testing-mechanism language (“calculate capacity” or “set floors”).
- Record completion time by grade, world, conditional-income path, support use, and device.
- Use **approximately 12–15 minutes** only as a target to validate. Do not state that a median or completion threshold has been achieved before testing.
- The simplified design is hypothesized to reduce Pressure Test time and requests for teacher clarification; report the result rather than assuming it.

## 9.6 Mastery and grading acceptance

- Six concepts, 18 structured micro-skills, `/90` structured evidence, `/10` educator-reviewed reasoning, concept statuses, and trajectory remain present.
- Every revised C1/C3/C4/C5 micro-skill resolves to a saved state, source decision, calculation attempt, support event, or explicit residual acknowledgement.
- Removing an entered calculation does not silently award its old points; the relevant points move to the defined state-based evidence rule.
- Seat 14's revised event/state ledger reconciles to C1 `15/15`, C2 `9/10`, C3 `15/15`, C4 `17/20`, C5 `29/30`, structured `85/90`, reasoning `9/10`, and final `94/100`.
- Educator misconception tags contain no reference to a capacity calculation students no longer perform.

## 9.7 World architecture acceptance

- V1 Basketball and Fashion retain the parallel amounts and evidence opportunities defined in V2, except for the shared V2.1 interaction changes.
- The code does not treat identical numbers or identical stage structure as a permanent definition of equivalence.
- `AssessmentBlueprint` is separate from `WorldScenario` and `EvidenceMapping`.
- A test-only future world can use different dollar values, a different decision graph, and a different event sequence while mapping valid evidence to all six concepts.
- Future equivalence reviews compare competency, evidence opportunity, support, reading load, mathematical demand, adaptation demand, and completion behavior—not surface-number identity alone.

## 9.8 Final V2.1 decision

Adopt the simplified Plan Board interaction.

The V2 Pressure Test is educationally sound but over-specified as an interface. Floors, ranking, capacity, and uncovered-entry fields do not add enough unique evidence to justify their cognitive load. The V2.1 version is stronger because the learner's actual lower-resource plan becomes the answer.

The assessment remains rigorous:

- students still choose which income to use;
- conditional-income plans still require a saved fallback;
- confirmed-only plans still have to demonstrate C4 against an authentic Week 5 cost;
- every student still calculates and responds to a personalized event;
- final plans still have to balance or preserve a visible unresolved amount;
- educators still receive concept-specific, explainable evidence and trajectory.

What changes is the student experience: fewer translations, fewer duplicate entries, and more direct financial decision-making.
