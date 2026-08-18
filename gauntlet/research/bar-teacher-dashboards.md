# The Bar: Teacher Dashboards, Live Monitoring, and Progress Reporting in K-12 EdTech
### An external, inspectable quality bar for BOW Decision Challenges' teacher surface

Compiled from vendor documentation, help centers, and named-author pedagogy sources. Every claim below is either a direct quote/paraphrase of a cited page or a direct observation of a BOW screenshot on disk. Where a source would not yield a concrete UI detail after fetching, that gap is marked rather than filled with a guess.

BOW screenshots referenced: `/home/user/bow-decision-challenges/gauntlet/screens/lead-teacher/01-my-classes.png`, `02-class-mixed.png`, `03-reading-queue.png`, `04-debrief.png`, `05-student-basketball.png`, `06-student-popup.png`, `07-map.png`, `08-objectives.png`, and the baseline set `/home/user/bow-decision-challenges/gauntlet/screens/baseline/1366-15*.png`.

---

## 1. Top-level signal set — comparison table

"Above the fold for a whole class" = what's visible on first load of the primary teacher screen, before any click or scroll, per that product's own documentation/marketing.

| Product | Above-the-fold signals (3–5) | Source |
|---|---|---|
| **Desmos Classroom** | (a) Pacing ribbon of activity-screen thumbnails showing where the class is/where it's going; (b) per-screen checkmark/dot/X/dash correctness summary across all students; (c) Anonymize toggle (top-left "show fake names" icon); (d) Snapshot tray for curated student work | [Introducing the New Desmos Activity Dashboard](https://blog.desmos.com/articles/introducing-the-new-desmos-activity-dashboard/) — designers explicitly say the summary view "should show as little as it had to"; [K20 Center walkthrough](https://k20center.ou.edu/externalapps/monitoring-students) — check = correct, dot = correct non-text/needs written-response read, X = incorrect, dash = no work required |
| **Formative** | (a) Color-coded grid, one row per student × one column per question, live; (b) live-presence green/gray dot on each student's avatar; (c) icons on cells flagging teacher-attention items; (d) Active-students-first sort | [View and Score Responses](https://help.formative.com/en/articles/6198532-view-and-score-responses); [Live Presence Indicator](https://help.formative.com/en/articles/6023282-live-presence-indicator) |
| **Nearpod** | (a) Participant list with join/response status; (b) per-slide response tally; (c) raised-hand/reaction icons; (d) toggle between Student View and Teacher View | [Live lesson Teacher Dashboard](https://nearpod.zendesk.com/hc/en-us/articles/4416963117972-Live-lesson-Teacher-Dashboard) |
| **Pear Deck** | (a) Student name + live response per prompt; (b) highlight/hide-from-projector control per response (hidden turns grey); (c) private teacher-only view separate from the projected view | [The Teacher Dashboard](https://help.peardeck.com/en/the-teacher-dashboard); [View Student Responses](https://help.peardeck.com/how-do-i-see-student-responses) |
| **Google Classroom** | (a) Assigned / Turned in / Graded / Returned counts as clickable headers; (b) roster inside each bucket; (c) grade entry inline | [View all your students' work](https://support.google.com/edu/classroom/answer/9157286) |
| **Kahoot!** | (a) Podium/leaderboard; (b) per-question % correct; (c) per-player final score; (d) downloadable report | [Kahoot! quiz reports](https://kahoot.com/blog/2020/05/06/analytics-new-free-kahoot-reports-formative-assessment/) |
| **Quizizz (Wayground)** | (a) Class average; (b) per-question breakdown of where students struggled; (c) Standards tab (if questions are tagged); (d) Longitudinal Growth Graph across assignments | [Reports on Quizizz](https://support.quizizz.com/hc/en-us/articles/115000886691-Reports-on-Quizizz); [Wayground AI reports](https://support.quizizz.com/hc/en-us/articles/34146131043481-Analyze-Reports-with-Wayground-AI) |
| **Blooket** | (a) Homework completion state per student: finished / in-progress / not-started; (b) most-missed questions; (c) automated reminders to unfinished students | Search-aggregated vendor documentation, `blooket.com` dashboard guides |
| **Edpuzzle** | (a) Grade per assignment; (b) a thin bar under the grade showing % of video watched (this is the in-progress signal, distinct from the grade); (c) auto-refreshing page (no manual reload needed); (d) "Graded and completed" auto-archive section | [How does the Gradebook work?](https://support.edpuzzle.com/hc/en-us/articles/360007261212-How-does-the-Gradebook-work); [Track Student Success with Edpuzzle](https://www.timetotalktech.com/2024/10/track-student-success-with-edpuzzle.html) |
| **Khan Academy** | (a) Activity/Skills/Mastery tabs; (b) color-coded bar per skill; (c) time-on-task and skill comprehension metrics | [Activity overview report tabs](https://support.khanacademy.org/hc/en-us/articles/360031052391-How-do-I-use-the-Activity-Skills-and-Mastery-tabs-on-the-Activity-overview-report) — a genuine gap: Khan Academy does not appear to publish a documented single-glance "who needs me right now" screen; its dashboard is report-oriented, not live-monitoring-oriented |
| **IXL** | (a) Class Diagnostic levels at a glance for math and English; (b) flag for students who haven't completed an initial Diagnostic; (c) per-strand breakdown; (d) auto-generated Action Plans per student | [The IXL Real-Time Diagnostic](https://www.ixl.com/diagnostic/info); [IXL Analytics for Teachers](https://www.ixl.com/materials/us/IXL_Teacher_Analytics.pdf) |
| **i-Ready** | (a) Instructional Grouping Report clustering students into a handful of need-profiles, not 30 rows; (b) count of students per profile; (c) priority-skill call-outs per profile | [Instructional Grouping Report](https://app.alludolearning.com/m/activities/138903-i-ready-instructional-grouping-report) |
| **Zearn** | (a) Progress bar per student showing % of Independent Digital Lessons complete in the current Mission; (b) Tower Alerts flag for students who repeatedly struggle in the "Tower of Power" (Zearn's built-in retry/struggle checkpoint) | [Zearn reporting suite](https://help.zearn.org/hc/en-us/articles/29008224450967-Zearn-reporting-suite) |
| **NWEA MAP Growth** | (a) Donut chart of RIT-score test status (valid / unofficial / invalid / no data); (b) achievement-percentile color-coded quintiles; (c) class histogram in 10-point RIT bands; (d) rapid-guessing % flag | [How to engage with your first Class Profile report](https://www.nwea.org/blog/2026/how-to-engage-with-your-first-map-growth-class-profile-report/) |
| **CommonLit** | (a) Class-level summary at top of the Assignment Report ("how your class performed as a whole"); (b) students needing support surfaced from that summary; (c) short-answer scores included alongside multiple-choice | [5 Ways CommonLit Helps Teachers Monitor Understanding](https://www.commonlit.org/blog/5-ways-commonlit-helps-teachers-monitor-student-understanding-d17c58566413/) |
| **Newsela** | (a) Classroom Data report; (b) Power Words vocabulary-growth report; (c) per-student drill-down from the same binder | Search-aggregated: [Newsela Help Center — Reviewing and Grading Student Work](https://help.newsela.com/en/articles/13656248-assignments-and-reports-reviewing-and-grading-student-work) |
| **Gradescope** | (a) Answer groups — the whole class's submissions to one question collapsed into a handful of clusters, each shown once; (b) progress bar of grading completion; (c) rubric panel that updates every group retroactively when edited | [AI-assisted grading and answer groups](https://support.csuchico.edu/TDClient/1984/Portal/KB/PrintArticle?ID=114632); [Grading submissions with rubrics](https://guides.gradescope.com/hc/en-us/articles/22249389005709-Grading-submissions-with-rubrics) |
| **BOW (current)** | (a) A single competency-state headline sentence ("Nobody is assessed yet."); (b) turned-in count + unread-writing count in the sub-head; (c) a "WHAT THEY DECIDED" module of class-wide decision distributions (e.g., "3 of 8 took the Saturday clinics"); (d) a per-skill "where the class is" table; (e) a flat list of every student who turned in, one row each, headed "Seat N" | `lead-teacher/02-class-mixed.png` |

**What this table shows:** every other product in this list puts a *judgment-relevant aggregate* above the fold — a distribution, a flag, a percentile, a completion bar. BOW's above-the-fold is a single sentence plus two counts, and the substantive content (decision distributions) appears in a second scroll-length "WHAT THEY DECIDED" section that most of these competitors would treat as the headline, not a footnote.

---

## 2. How "needs attention" is computed and shown — who decides

Two families exist, and it matters which one a product picked:

**A. Rule-based, product-computed, teacher-facing as a flag.**
- **Formative**: icons appear directly on color-coded cells "to indicate a need for the teacher's additional attention" — computed from correctness against the question's key, shown inline, no teacher setup required. ([View and Score Responses](https://help.formative.com/en/articles/6198532-view-and-score-responses))
- **Zearn**: Tower Alerts fires "when students repeatedly struggle" at a specific, product-defined checkpoint (the Tower of Power). The threshold and the checkpoint are Zearn's, not the teacher's. ([Zearn reporting suite](https://help.zearn.org/hc/en-us/articles/29008224450967-Zearn-reporting-suite))
- **NWEA MAP**: flags rapid-guessing (a validity signal, not a mastery signal) as its own column, and separately reports RIT-score status (valid/unofficial/invalid/no data) — these are statistically defined, not teacher-set. ([Class Profile report](https://www.nwea.org/blog/2026/how-to-engage-with-your-first-map-growth-class-profile-report/))
- **IXL** flags students who have not yet completed an initial Diagnostic — a completion-based rule. ([IXL Real-Time Diagnostic](https://www.ixl.com/diagnostic/info))
- **Edpuzzle**: no named "attention" flag was found in documentation; the % watched bar is the substitute — a continuous signal a teacher reads as attention-worthy at their own threshold, not a binary the product decides for them.

**B. Teacher-decided, product-only-sorts.**
- **Kahoot!** and **Quizizz** were searched specifically for an automatic "needs help" flag and none was documented — both surface *sortable* per-question and per-player tables ("use column headers as filters," [Kahoot! reports](https://kahoot.com/blog/2020/05/06/analytics-new-free-kahoot-reports-formative-assessment/)) and leave the judgment of who needs help to the teacher scanning the sorted list.
- **i-Ready**'s Instructional Grouping Report groups students by need-*profile*, but the profiles themselves and the "priority" skill call-outs are the product's synthesis of diagnostic data, closer to family A.

**BOW today**: needs-attention is computed but framed entirely around *unassessed-ness*, not around risk or misconception. The class headline is literally the count of ungraded writing ("15 turned in · 15 awaiting your reading"), and the roster below it says "Not assessed yet" for every single row (`02-class-mixed.png`). This is technically a rule (unread submissions), but it never distinguishes a strong plan from a weak one, or a stuck student from a fine one, until the teacher does 15 individual reads. No competitor in this table makes "have I graded this" the entire attention signal — they all compute something about the *work itself* first (correctness, RIT band, watch-time, struggle-repeat) and reserve human reading for what genuinely requires human judgment (open-ended writing, in BOW's case).

---

## 3. Clicks: CLASS → individual student → their ACTUAL WORK

Counted as click events from the primary class-level screen to the screen showing that one student's actual submitted content (not a summary card).

| Product | Clicks | Path | Source |
|---|---|---|---|
| **Formative** | 2–3 | Responses grid → click student name/score cell → right-side panel opens with all their responses (or: click a question → click a response tile) | [View and Score Responses](https://help.formative.com/en/articles/6198532-view-and-score-responses) |
| **Google Classroom** | ~3 | Classwork → assignment → click "Turned in" count → Student Work list → click the assignment thumbnail for one student | [View all your students' work](https://support.google.com/edu/classroom/answer/9157286) |
| **Desmos Classroom** | 1–2 | Teacher dashboard already shows a per-student thumbnail grid on the Teacher tab; click one student's tile to expand their screen/graph/text response | [How do you use the teacher dashboard in class?](https://blog.desmos.com/articles/how-do-you-use-the-teacher-dashboard-in-class/) |
| **Nearpod** | 1–2 | Teacher Dashboard → click a slide's response tally → individual responses listed; View Progress → arrows step through students | [Live lesson Teacher Dashboard](https://nearpod.zendesk.com/hc/en-us/articles/4416963117972-Live-lesson-Teacher-Dashboard) |
| **Edpuzzle** | 2 | Gradebook → click the assignment column → who-watched-what list opens | [How does the Gradebook work?](https://support.edpuzzle.com/hc/en-us/articles/360007261212-How-does-the-Gradebook-work) |
| **Gradescope** | 2 (to a group), 3 (to one specific student inside a group of >1) | Assignment → click an answer group → sample submission shown; if that student isn't the sample, one more click through the group's roster | [AI-assisted grading and answer groups](https://support.csuchico.edu/TDClient/1984/Portal/KB/PrintArticle?ID=114632) |
| **BOW (current)** | 2 clicks to a judgment summary ("Seat 20" evidence trail, `06-student-popup.png`), 3 clicks to the raw plan/explanation content via the "The plan" / "The explanation" tabs | My classes → class row → Seat-N row in "EVERY STUDENT WHO TURNED IN" → (tab click for raw artifact) | `01-my-classes.png` → `02-class-mixed.png` → `06-student-popup.png` |

BOW is competitive on raw click count (2–3, same tier as Formative, Google Classroom, Gradescope), but it is the **only product in this table with exactly one class to click into** — every competitor's class-level screen is built to hold and scan many classes and many students inside one class without leaving the page; BOW's `01-my-classes.png` shows a single-class list literally captioned "Your class." (singular) with a "Start another class" form beneath it, because classes live in that one browser's localStorage rather than a server-side roster.

---

## 4. What makes a dashboard scannable in under 10 seconds — real evidence

- **Nielsen Norman Group's F-shaped/F-pattern eyetracking research** (232 users, thousands of pages) found people scan a horizontal band across the top, a shorter horizontal band lower, then a vertical strip down the left — meaning the *first row and first column* of any layout carry disproportionate scan weight; content buried past that gets skipped, not read. ([F-Shaped Pattern of Reading on the Web](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/), [F-Pattern video](https://www.nngroup.com/videos/f-pattern-reading-digital-content/))
- **Desmos's own design team**, redesigning their dashboard, stated the summary view "should show as little as it had to in order to help teachers do their work" — i.e., they treat minimalism as a load-bearing design constraint, not an aesthetic preference. ([Introducing the New Desmos Activity Dashboard](https://blog.desmos.com/articles/introducing-the-new-desmos-activity-dashboard/))
- **Pre-attentive color/icon coding**: Formative's grid is scannable because correctness is color, not text — a teacher reads color before reading any number ([View and Score Responses](https://help.formative.com/en/articles/6198532-view-and-score-responses)). Desmos's check/dot/X/dash system does the same with four symbols instead of colors, which additionally works for colorblind teachers and black-and-white printouts. ([K20 Center](https://k20center.ou.edu/externalapps/monitoring-students))
- **Named "actionability" design principle**: "rich data does not mean rich insights" — designers can be "mesmerized by novel presentations… and lose track of what your user is trying to achieve." The prescribed fix is to design toward Understand → Decide → Action, not toward maximum data density. ([Eleven Principles for Actionable EdTech Dashboards](https://enablinginsights.com/how-to-design-more-actionable-edtech-dashboards-eleven-principles/))
- **Collapsing N students into K groups is itself a scannability technique**, not just a grading shortcut — see Q7 below (Gradescope, i-Ready).

Applied to BOW: `02-class-mixed.png` is roughly 4000px tall in its full-page capture — far more than one screenful, meaning nothing on it can be "scanned in 10 seconds" by NNG's own definition, because the F-pattern only covers what's visible without scrolling. The headline sentence and two counts ARE scannable; the "WHAT THEY DECIDED" grid of 5–6 small-multiple cards is also reasonably scannable (it uses the check/X-style pattern of numbers-as-labels Desmos and Formative rely on); but the flat "EVERY STUDENT WHO TURNED IN" list of 15 identical "Not assessed yet" rows is the opposite of pre-attentive coding — every row reads the same because every row *is* the same, which means the eye has nothing to differentiate on and must read all 15 to find out anything (there is nothing to find: they're identical).

---

## 5. Asynchronous / multi-day / homework work — "in progress since yesterday" without surveillance

The strongest pattern across the research is a **three-state model — not-started / in-progress / submitted — paired with a magnitude, not a timestamp or an activity log**:

- **Blooket**: teachers "see who's finished, who's in progress, and who hasn't started" for homework, with automated reminders — the state is coarse (three buckets) and actionable (a reminder button), not a granular timeline of when the student opened/closed the app.
- **Edpuzzle**: the in-progress signal is a thin bar showing % of video watched, sitting under the (still-blank) grade — it tells a teacher "this student is partway through," and nothing about session count, time-of-day, or how long they were away. The page "refreshes automatically," so the teacher never has to manually poll for updates. ([Track Student Success with Edpuzzle](https://www.timetotalktech.com/2024/10/track-student-success-with-edpuzzle.html))
- **Formative**'s live-presence dot is explicitly framed by Formative's own help center as a *diagnostic aid, not a surveillance tool*: "If a student's response is not coming in, you can check the live indicator to see if the student is within the formative assignment at that particular moment" — its purpose is disambiguating "stuck" from "absent," which is the single most useful async signal for a teacher, and it's a binary present/not-present, not a log of every window-switch. ([Live Presence Indicator](https://help.formative.com/en/articles/6023282-live-presence-indicator))
- **Nearpod** explicitly separates Live Participation mode from Student-Paced mode, and its Student-Paced teacher dashboard is described as letting teachers "monitor student progress in real time, even when students are working asynchronously" — the same dashboard vocabulary (started/how far/responses) is reused across sync and async, so a teacher isn't learning two interfaces. ([Live lesson Teacher Dashboard](https://nearpod.zendesk.com/hc/en-us/articles/4416963117972-Live-lesson-Teacher-Dashboard))
- **Zearn**'s progress bar is a % of Mission complete — again a magnitude, not a history.

**The non-surveillance design rule that recurs**: show *how far*, not *how long*, *when*, or *how many attempts before now*. None of the fetched documentation for any of these products describes exposing session timestamps, idle time, or tab-switch counts to teachers in the main dashboard — that class of signal (where it exists at all, e.g. Formative's District-license "overlapping session" / LockDown Browser flags) is gated behind higher-tier proctoring features and explicitly hedged by Formative's own docs: "doesn't necessarily indicate cheating... check the details... to properly identify the situation." ([Live Presence Indicator](https://help.formative.com/en/articles/6023282-live-presence-indicator))

**BOW today has no in-progress state at all.** `02-class-mixed.png`'s roster is captioned "EVERY STUDENT WHO TURNED IN" — there is no bucket for started-but-not-submitted, no bucket for not-started, because (per the task brief) student progress lives only in the student's own browser until submission. A teacher checking BOW mid-assignment on day 2 of an 8-week challenge sees nothing different from checking it before the assignment was given — the dashboard cannot distinguish "0 of 30 have opened this yet" from "28 of 30 are deep into Week 5 and 2 haven't started," which every one of the five products above can distinguish today.

---

## 6. Dashboard theatre — what it looks like, and how the best products avoid it

**Definition found directly in the literature**: vanity metrics are "broad counts or aggregates (total page views, overall time on platform, number of forum posts) that... lack a clear call to action;" a named example given is average video-watch time, "interesting but doesn't tell the teacher what to do." ([Eleven Principles for Actionable EdTech Dashboards](https://enablinginsights.com/how-to-design-more-actionable-edtech-dashboards-eleven-principles/), synthesizing an [8allocate](https://8allocate.com/blog/ai-learning-analytics-dashboards-for-instructors-turning-data-into-actionable-insights/) analysis of legacy LMS dashboards)

**What theatre looks like in practice**: charts of clicks, logins, time-online, and other engagement tallies presented with equal visual weight to mastery/correctness data, so a dashboard *looks* rich without telling a teacher what to do next.

**How the cited products avoid it**:
- Desmos deliberately **removed** detail from its dashboard redesign rather than adding — "show as little as it had to."
- Formative's design ties every visual signal (color, icon) directly to a pending teacher action (grade this, this student is stuck) rather than to raw activity counts.
- The "eleven principles" source frames the fix as **Understand → Decide → Action**: every element on the dashboard should map to one of these three, and elements that map to none of them are theatre by definition.
- i-Ready and Gradescope avoid theatre by **compression**: instead of showing 30 rows of raw scores (which looks busy but says nothing at a glance), they show a handful of profiles/groups, each with an explicit "what to do" attached (priority skill, rubric feedback).

**Where BOW risks theatre, and where it doesn't**: BOW's per-judgement student page (`06-student-popup.png`) is the *opposite* of theatre in one respect — every single stat line ("Covers what is required first," "Uses only money that can still move," etc.) is directly tied to a rule with a plain-English restatement and a link to override it ("I read this differently"). That is unusually action-tied for this category — closer to Gradescope's live rubric than to a vanity-metric wall. But the class-level Map screen (`07-map.png`) risks theatre in the other direction: "MARKED TAUGHT 0 of 23," "ASSESSED 0 of 1," "NEED ATTENTION 0" are three big bolded numbers above the fold that are *all zero in the same class the teacher is actively using* — three prominent stats that currently communicate nothing actionable, which is close kin to the "interesting but doesn't tell the teacher what to do" pattern the literature warns about, just in the opposite direction (emptiness-as-theatre rather than noise-as-theatre).

---

## 7. Presenting a class of 30 without 30 rows

Four distinct techniques recur in the sources, in increasing order of aggregation:

1. **Icon/color compression per cell, not per row** (Desmos check/dot/X/dash; Formative color-coded grid) — still 30 rows, but each row is scannable at a glance because the payload per cell is a single glyph, not a full sentence.
2. **Sortable, filterable tables that let the teacher choose the lens** (Kahoot!, Quizizz — "use column headers as filters... sorting options and search functions") — still 30 rows, but the teacher self-selects which 3–5 matter right now (e.g., sort by lowest score) instead of reading all 30 in list order.
3. **Clustering into a handful of groups, discarding row-per-student entirely for the grading/grouping task** — this is the strongest technique found:
   - **Gradescope's answer groups**: "group similar answers and grade them once, instead of grading each individually" — a class of 30 can collapse into 5–8 answer clusters, each graded (and re-gradeable) as a unit; every subsequent change to a rubric item "automatically updates" every submission in every group it was applied to. ([AI-assisted grading and answer groups](https://support.csuchico.edu/TDClient/1984/Portal/KB/PrintArticle?ID=114632); [Grading with rubrics](https://guides.gradescope.com/hc/en-us/articles/22249389005709-Grading-submissions-with-rubrics))
   - **i-Ready's Instructional Grouping Report**: "quickly identify and group students with similar instructional challenges," reporting "how many students fall into each profile" rather than listing all of them. ([Instructional Grouping Report](https://app.alludolearning.com/m/activities/138903-i-ready-instructional-grouping-report))
4. **Anonymize + sample, not full roster, for the discussion moment** — Desmos's Snapshot tool never shows the class as 30 rows during discussion; a teacher pre-selects 3–5 pieces of work into a sequenced Collection, and that curated set — not the roster — is what's presented (see Q1 detail below). ([Collections and Snapshots](https://blog.desmos.com/articles/collections-and-snapshots/); [dy/dan: Orchestrate More Productive Mathematics Discussions](https://blog.mrmeyer.com/2018/orchestrate-more-productive-mathematics-discussions-with-desmos-snapshots/))

**BOW today uses none of these.** The "EVERY STUDENT WHO TURNED IN" section of `02-class-mixed.png` is 15 rows, unsorted (by seat number, not by anything actionable), unfiltered, unclustered, and — because every row currently reads "Not assessed yet" — uncompressible by any of the above techniques as currently built, since there's no per-student signal yet to cluster or sort *by* until the reading queue is done. The "WHAT THEY DECIDED" module above it, notably, already does technique 3 correctly for decisions (it groups 8 students into "2 chose X / 3 chose Y / 3 chose Z" rather than listing 8 rows) — the class-decision aggregation is genuinely there; it's the assessment-status roster that regresses to one row per student.

---

## 8. In-progress vs. submitted — what server-side state that minimally requires

Synthesizing the mechanisms documented above (Blooket's three-state homework model, Edpuzzle's % bar, Nearpod's async dashboard, Formative's live-presence, Zearn's Mission-% bar), the minimum server-observable state to render *any* of them is:

1. **A student-to-assignment binding that exists before submission** — i.e., the assignment must be represented server-side as something a student "has," not only as something a teacher can see aggregated after handoff. Google Classroom's "Assigned" bucket is the floor version of this (binary: assigned vs turned-in); Blooket's three-state and Edpuzzle's % bar require one field beyond that.
2. **A monotonically-increasing progress fact written server-side as the student works** — not merely a local draft. Edpuzzle's "% of video watched" and Zearn's "% of Independent Digital Lessons complete" both require the *server* to know a fractional position mid-task, which means each meaningful checkpoint (not every keystroke) needs to sync, not just the final submit event.
3. **A last-seen/presence signal, updated on a short heartbeat, decoupled from the progress fact** — this is what lets Formative distinguish "stuck" from "absent" and is the one piece of state genuinely orthogonal to progress-%; it requires either a lightweight ping while the assignment tab is open or a session-start/session-end event pair.
4. **Per-student identity that survives across devices/sessions**, so that "in progress since yesterday" can be attributed to the same student today — trivial for logged-in products (all of the above), but this is precisely the piece BOW's current architecture (progress lives only in the originating browser's storage until submit) does not have: with no server-side write until the final submit event, there is no fact 1, no fact 2, and no fact 3 to display, by construction — not a UI gap but a data-model gap. Fixing the visible "no in-progress state" (Q5, Q7) requires this server-side change first; it cannot be designed around in the UI layer alone.

---

# THE BAR

Eight to twelve testable sentences a best-in-class K-12 teacher progress surface satisfies, each grounded in a cited product above.

1. The class-level screen shows, without any click, at least one signal computed from the *content* of student work (correctness, mastery band, RIT percentile, or a struggle flag) — not only a submission count. *(Formative's color grid, Desmos's check/dot/X/dash, NWEA's RIT histogram all satisfy this; a bare "N turned in" count does not.)*
2. A class of 30 is never presented as 30 undifferentiated rows for a task that has a smaller natural grain — grading collapses into answer-groups (Gradescope), instructional need collapses into profiles (i-Ready), decisions collapse into distributions. *(Gradescope: "group similar answers and grade them once.")*
3. Work in progress and work not yet started are each their own visible state, distinct from "not submitted," expressed as a magnitude (% complete, a bar) rather than a timestamp/activity log. *(Blooket's finished/in-progress/not-started; Edpuzzle's watch-% bar.)*
4. A presence or "are they in it right now" signal exists specifically to answer "is this student stuck or just not here," and is explicitly documented by its own vendor as non-punitive. *(Formative Live Presence Indicator, explicitly framed as disambiguation, not proctoring.)*
5. Every element above the fold maps to one of Understand → Decide → Action; a stat that maps to none of the three (a count of activity with no threshold, no comparison, no recommended next step) is cut. *(Eleven Principles for Actionable EdTech Dashboards.)*
6. Class → one student's actual submitted work is reachable in 2–3 clicks, not more, from the primary teacher screen. *(Formative, Google Classroom, Gradescope, Edpuzzle all measured at 2–3.)*
7. A "needs attention" signal, where the product computes one, is computed from a rule the vendor can name in one sentence (correctness against a key, repeated-struggle at a defined checkpoint, rapid-guessing threshold, incomplete-diagnostic) — never a black box, and never simply "ungraded." *(Zearn's Tower Alerts, NWEA's rapid-guessing flag, Formative's per-cell icon.)*
8. A teacher can put two or more pieces of real, current student work side by side for a live discussion in under a minute, sequencing and annotating them first — not improvising by walking the room with a phone. *(Desmos Snapshots, built explicitly around Smith & Stein's 5 Practices — anticipate, monitor, select, sequence, connect.)*
9. Anonymizing student identity for a public/projected view is a single click that applies consistently everywhere names would otherwise appear (roster, thumbnails, individual screens) — not a partial or per-screen toggle. *(Desmos: "switching back to real names mode is just a click away," applies across "sidebar... thumbnail previews... individual graph screens and text responses.")*
10. The dashboard supports the same core vocabulary (started / how far / flagged / done) whether the work is happening live in front of the teacher or asynchronously over days — a teacher does not have to learn two different mental models for sync vs. homework monitoring. *(Nearpod's shared Live/Student-Paced dashboard model.)*
11. Aggregate class statistics that read as impressive (large counts, big round numbers) are cross-checked against whether they currently communicate anything the teacher would act on today, especially when the true current value is uniform (all-zero or all-identical) — a uniform stat block should visually recede, not lead. *(Contrast: enablinginsights' vanity-metric critique.)*
12. A rubric or grading criterion, once edited mid-session, retroactively updates every already-graded instance of that criterion rather than leaving old grades stale. *(Gradescope: rubric edits "automatically apply to all individual answers or answer groups... even after grades have been distributed.")*

---

# TESTABLE CRITERIA (numbered pass/fail)

1. **PASS/FAIL**: Loading the primary class screen with zero clicks/scrolls shows at least one signal derived from student *work content* (not just a submission or attendance count).
2. **PASS/FAIL**: For a class of 20+ students, the default view of any per-student list groups, sorts, or clusters by something other than roster/seat order, OR the product provides a one-click sort/filter that a teacher would reach for before reading the list top to bottom.
3. **PASS/FAIL**: There exists a visible state meaning "started but not submitted," distinguishable in the UI from both "not started" and "submitted," for any assignment that spans more than one class period.
4. **PASS/FAIL**: The in-progress signal (#3) is expressed as a magnitude/bar/%, not as a raw timestamp, session count, or activity log, in the default teacher-facing view.
5. **PASS/FAIL**: There is a presence-style signal ("in it right now") separate from the progress signal, OR the product explicitly does not attempt one (a documented, deliberate choice, not a silent gap).
6. **COUNT**: Number of clicks from the class list screen to one specific student's actual submitted artifact (not a summary). Target: ≤3.
7. **PASS/FAIL**: Every "needs attention" indicator can be described in one plain sentence naming the rule that triggered it (e.g., "flagged because 2+ wrong on this skill," not "flagged because the algorithm said so").
8. **PASS/FAIL**: No "needs attention"/flag is computed *only* from whether a teacher has read/graded something — grading status and content-derived risk are two different signals, not one conflated signal.
9. **PASS/FAIL**: A single control anonymizes student identity everywhere on the current screen (roster, thumbnails, individual work) in one click, and a single click reverses it.
10. **COUNT**: Number of distinct clicks/drags to select 2+ pieces of student work, put them in a chosen order, and present them to the class. Target: comparable to Desmos's 3-step flow (mark → open collection tab → drag to sequence).
11. **PASS/FAIL**: Every bolded/large above-the-fold statistic, when its true current value is zero or uniform across the whole class, is either suppressed, deprioritized visually, or paired with a next action — never left as a prominent standalone zero with no next step attached.
12. **PASS/FAIL**: Editing a scoring rule/rubric criterion after some students are already scored updates those existing scores rather than leaving them stale against the new rule.
13. **PASS/FAIL**: A teacher can identify, within 10 seconds of landing on the class screen (no scrolling), which specific students (by name or ID) need attention right now, if any do.
14. **PASS/FAIL**: The vocabulary and layout used for monitoring a live, synchronous activity are the same vocabulary/layout used for monitoring a multi-day asynchronous one (no separate mental model to learn).
15. **PASS/FAIL**: Server-side state exists for "assigned-but-not-yet-submitted" work such that a teacher can distinguish, without asking the student, "hasn't opened it yet" from "is partway through it" from "is done."

---

# WHERE BOW LIKELY LOSES

Direct comparisons to the cited bar, each anchored to a specific screenshot.

- **No in-progress state exists at all (fails Criteria 3, 4, 15).** `02-class-mixed.png`'s only roster is titled "EVERY STUDENT WHO TURNED IN" — there is no bucket for started-not-submitted and none for not-started. Per the task brief this is because progress lives only in the student's browser until the final submit write, which is exactly the missing server-side fact identified in Q8/Criterion 15. Every other product surveyed that supports multi-day work (Blooket, Edpuzzle, Nearpod, Zearn) shows this state as a bar or bucket, not silence.
- **A single class in a single browser, not a roster the teacher can rely on (fails Criterion 6 in spirit, and undermines "class → student" entirely).** `01-my-classes.png` is captioned "Your class." (singular), with the explanation "Saved in this browser. Opening a class from its private link on another computer adds it there too." Every competitor surveyed treats "my classes" as a server-side, multi-class, multi-device list; BOW's is local storage with a "Forget these classes on this computer" reset button sitting right there. A teacher who grades on a different device, or whose browser storage clears, loses the class list itself — not just a convenience feature but the entry point to everything above.
- **The class-level roster is 15 undifferentiated rows (fails Criterion 2, and is the direct opposite of Gradescope's/i-Ready's grouping technique from Q7).** In `02-class-mixed.png`, all 15 "EVERY STUDENT WHO TURNED IN" rows read identically: "Not assessed yet / Written explanation not read yet." There is nothing here to sort, filter, or cluster by, because BOW currently has no content-derived signal until a human reads the writing — meaning the class-level screen cannot do what Formative, Desmos, Kahoot!, and Quizizz all do above the fold: show the teacher *something about the work* before they've read anything.
- **Needs-attention is entirely grading-status, never content-risk (fails Criteria 7 and 8 in the two places BOW could distinguish them).** BOW's headline is "Nobody is assessed yet," and the Map screen's "NEED ATTENTION" stat reads "0" in `07-map.png` — not because nothing needs attention, but because the concept hasn't been computed for anything yet in this class. Every product in the "needs attention" section of this report (Formative, Zearn, NWEA, IXL) computes a content-derived flag automatically, independent of whether a teacher has personally read anything; BOW's only automatic signal right now is "has a human looked at this."
- **Prominent all-zero stats sit above the fold with no next step attached (the theatre-in-reverse case from Q6, failing Criterion 11).** `07-map.png` leads with three bold numbers — "MARKED TAUGHT 0 of 23," "ASSESSED 0 of 1," "NEED ATTENTION 0" — in the exact F-pattern top band NNG's eyetracking research says gets read first. All three are zero in a class the teacher is actively running a challenge in. None is paired with a call to action (e.g., "mark 1.3 as taught" is buried below, not linked from the stat itself).
- **Identity is seat numbers with no server-anchored roster behind them, which is a different problem than Desmos's anonymize toggle (fails Criterion 9's spirit — asymmetric, not reversible by the teacher).** Desmos's anonymize mode is a *reversible* privacy choice a teacher makes and un-makes with one click, applied consistently, with real names available underneath at all times. BOW's "Seat 21" (`06-student-popup.png`, `05-student-basketball.png`) is not a toggle over real identities — per the task brief, it is the only identity BOW has, because there's no server-side name mapping. This looks superficially similar to Desmos's anonymize feature but is structurally the opposite: Desmos anonymizes *by choice, reversibly*; BOW cannot show a real name *even if the teacher wants one*.
- **No cross-device, no in-progress, and single-class-list together mean BOW cannot yet support the single most basic async-monitoring question every other product answers: "who hasn't started yet, today, two days into an 8-week challenge?"** None of BOW's screens (`01` through `08`) can answer that question — the closest is the turned-in/not-yet-turned-in split, and even that only exists retroactively once the assignment window has closed enough for anyone to submit.

---

# WHAT BOW MIGHT ALREADY WIN ON

Specific, not generic — where BOW's screenshots show something no competitor in this survey documents doing.

- **Per-judgement rule transparency, at a granularity none of the surveyed products expose.** `06-student-popup.png`'s "EVERY JUDGEMENT ON THIS ATTEMPT" section lists five to ten named criteria per skill (e.g., "Covers what is required first," "Uses only money that can still move"), each with: a one-sentence rule definition, a plain-English restatement of *why this specific student's plan* satisfied or didn't, an "Independently / Never came up" provenance tag, and an "I read this differently" override link *per judgement*, not per assignment. Gradescope's rubric comes closest (dynamic, retroactive, per-criterion) but is written by the instructor for a single assignment; BOW's rules are apparently baked into the product itself and explained back to the teacher inline, which is a stronger transparency claim than any surveyed competitor documents making.
- **The class evidence is decisions, not scores, and this is structurally different from every other product surveyed.** The "WHAT THEY DECIDED" module in `02-class-mixed.png` ("2 chose Gym District Sublet, 3 chose Teammate Share, 3 chose Cousin's Spare Room," with seat numbers attached to each) is not a score distribution or a correctness histogram — it's a distribution of *choices under constraint*, which is the actual pedagogical content of a decision-simulation and something none of Kahoot!, Quizizz, Formative, or Google Classroom have an analogous view for, because those products' underlying task type (answer a question) doesn't produce this kind of data. This is BOW's most defensible above-the-fold differentiator, and per Q7's grouping analysis it is already using the right technique (grouped counts, not 30 rows) — it just needs to move higher and be joined by an equivalent for the assessment-status roster.
- **The debrief screen (`04-debrief.png`) pre-writes discussion-ready material directly from real class data**, including two full named-and-numbered student plans side by side ("SEAT 1: Cousin's Spare Room" vs "SEAT 2: Teammate Share," with matched line items — course seat, Saturdays, backup money) and a script of discussion-opening questions with the real class's numbers already filled in ("2 chose Gym District Sublet, 3 chose Teammate Share, 3 chose Cousin's Spare Room"). This is functionally adjacent to what Desmos Snapshots exists to produce (side-by-side student work, sequenced, annotated, for live discussion) but BOW appears to generate a first draft of it automatically from the class's actual data rather than requiring the teacher to manually mark, collect, and sequence pieces in real time the way Desmos's 3-step Snapshot flow (camera icon → Snapshots tab → drag to sequence) requires.
- **The objective/standards map (`08-objectives.png`, `07-map.png`) is explicit about what it cannot yet claim** — "BOW can assess 1 of the 23 in this framework today. The rest are matched to a skill and waiting for a challenge that can observe it," and separately, "22 objectives are matched to a skill BOW cannot observe yet. They report as coming, never as nobody having demonstrated them." This is a stated design guarantee against a specific failure mode (silently implying non-coverage means non-mastery) that none of the surveyed standards-tagging features (Quizizz Standards tab, NWEA instructional areas) document making explicit; most standards dashboards are silent about what they cannot yet measure.

---

## Sources

- [Desmos: Collections and Snapshots](https://blog.desmos.com/articles/collections-and-snapshots/)
- [Desmos: "How do you use the teacher dashboard in class?"](https://blog.desmos.com/articles/how-do-you-use-the-teacher-dashboard-in-class/)
- [Desmos: Anonymize the Dashboard](https://blog.desmos.com/articles/anonymize-the-dashboard/)
- [Desmos: Introducing the New Desmos Activity Dashboard](https://blog.desmos.com/articles/introducing-the-new-desmos-activity-dashboard/)
- [dy/dan (Dan Meyer): Orchestrate More Productive Mathematics Discussions with Desmos Snapshots](https://blog.mrmeyer.com/2018/orchestrate-more-productive-mathematics-discussions-with-desmos-snapshots/)
- [Alice Keeler: Get Real-Time Insights into Student Thinking](https://alicekeeler.com/2024/03/24/get-real-time-insights-into-student-thinking/)
- [K20 Center: Monitoring Students with Desmos](https://k20center.ou.edu/externalapps/monitoring-students)
- [Formative: View and Score Responses](https://help.formative.com/en/articles/6198532-view-and-score-responses)
- [Formative: Live Presence Indicator](https://help.formative.com/en/articles/6023282-live-presence-indicator)
- [Nearpod: Live lesson Teacher Dashboard](https://nearpod.zendesk.com/hc/en-us/articles/4416963117972-Live-lesson-Teacher-Dashboard)
- [Nearpod: How to monitor student progress with real-time formative assessment data](https://nearpod.com/blog/monitoring-student-progress-formative-assessment/)
- [Nearpod: Build a Collaborate Board](https://nearpod.zendesk.com/hc/en-us/articles/360048806572-Build-a-Collaborate-Board)
- [Nearpod: How Teacher Moderation works for Student Accounts](https://nearpod.zendesk.com/hc/en-us/articles/4410238893588-How-Teacher-Moderation-works-for-Student-Accounts)
- [Pear Deck: The Teacher Dashboard](https://help.peardeck.com/en/the-teacher-dashboard)
- [Pear Deck: View Student Responses](https://help.peardeck.com/how-do-i-see-student-responses)
- [Google Classroom: View all your students' work](https://support.google.com/edu/classroom/answer/9157286)
- [Google Classroom: Grade & return an assignment](https://support.google.com/edu/classroom/answer/6020294)
- [Kahoot!: Kahoot! reports — how to assess kahoot results](https://kahoot.com/blog/2020/05/06/analytics-new-free-kahoot-reports-formative-assessment/)
- [Quizizz/Wayground: Reports on Quizizz](https://support.quizizz.com/hc/en-us/articles/115000886691-Reports-on-Quizizz)
- [Quizizz/Wayground: Analyze Reports with Wayground AI](https://support.quizizz.com/hc/en-us/articles/34146131043481-Analyze-Reports-with-Quizizz-AI)
- [Edpuzzle: How does the Gradebook work?](https://support.edpuzzle.com/hc/en-us/articles/360007261212-How-does-the-Gradebook-work)
- [Time to Talk Tech: Track Student Success with Edpuzzle](https://www.timetotalktech.com/2024/10/track-student-success-with-edpuzzle.html)
- [Khan Academy: Activity, Skills, and Mastery tabs on the Activity overview report](https://support.khanacademy.org/hc/en-us/articles/360031052391-How-do-I-use-the-Activity-Skills-and-Mastery-tabs-on-the-Activity-overview-report)
- [Khan Academy: Mastery goals progress reports](https://support.khanacademy.org/hc/en-us/articles/360031123551-How-can-I-view-my-students-progress-towards-their-Mastery-goals)
- [IXL: The IXL Real-Time Diagnostic](https://www.ixl.com/diagnostic/info)
- [IXL: IXL Analytics for Teachers (PDF)](https://www.ixl.com/materials/us/IXL_Teacher_Analytics.pdf)
- [i-Ready: Instructional Grouping Report](https://app.alludolearning.com/m/activities/138903-i-ready-instructional-grouping-report)
- [Zearn: Zearn reporting suite](https://help.zearn.org/hc/en-us/articles/29008224450967-Zearn-reporting-suite)
- [DreamBox: Educator Dashboard Overview](https://dreamboxlearning.zendesk.com/hc/en-us/articles/27281410377107-DreamBox-Math-Educator-Dashboard-Overview)
- [NWEA: How to engage with your first MAP Growth Class Profile report](https://www.nwea.org/blog/2026/how-to-engage-with-your-first-map-growth-class-profile-report/)
- [CommonLit: 5 Ways CommonLit Helps Teachers Monitor Student Understanding](https://www.commonlit.org/blog/5-ways-commonlit-helps-teachers-monitor-student-understanding-d17c58566413/)
- [Newsela: Assignments and Reports — Reviewing and Grading Student Work](https://help.newsela.com/en/articles/13656248-assignments-and-reports-reviewing-and-grading-student-work)
- [Gradescope: AI-assisted grading and answer groups](https://support.csuchico.edu/TDClient/1984/Portal/KB/PrintArticle?ID=114632)
- [Gradescope: Grading submissions with rubrics](https://guides.gradescope.com/hc/en-us/articles/22249389005709-Grading-submissions-with-rubrics)
- [Nielsen Norman Group: F-Shaped Pattern of Reading on the Web](https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/)
- [Nielsen Norman Group: F-Pattern in Reading Digital Content (video)](https://www.nngroup.com/videos/f-pattern-reading-digital-content/)
- [Enabling Insights: Eleven Principles for Designing More Actionable EdTech Dashboards](https://enablinginsights.com/how-to-design-more-actionable-edtech-dashboards-eleven-principles/)
- [8allocate: AI Learning Analytics Dashboards](https://8allocate.com/blog/ai-learning-analytics-dashboards-for-instructors-turning-data-into-actionable-insights/)
- Smith, M. S., & Stein, M. K. — *5 Practices for Orchestrating Productive Mathematics Discussions* (NCTM, 2nd ed. 2018) — [NCTM listing](https://www.nctm.org/Store/Products/5-Practices-for-Orchestrating-Productive-Mathematics-Discussions,-2nd-edition-(Download)/)

**BOW screenshots examined (local files, not URLs):**
`/home/user/bow-decision-challenges/gauntlet/screens/lead-teacher/01-my-classes.png`, `02-class-mixed.png`, `03-reading-queue.png`, `04-debrief.png`, `05-student-basketball.png`, `06-student-popup.png`, `07-map.png`, `08-objectives.png`
