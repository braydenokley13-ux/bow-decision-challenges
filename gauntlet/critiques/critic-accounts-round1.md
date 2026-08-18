# Critic — Accounts, Student Home, Live View, Feedback, Gradebook, Share-Out (Round 1)

**Reviewer:** fresh-context critic, no builder rationale, no prior involvement.
**Target:** the running artifact — app `http://127.0.0.1:4173`, class API `http://127.0.0.1:4180`.
**Class under test:** `M7KAX` "Period 3 · Grade 7", my own teacher account (`critic@example.org`),
mixed-world assignment (`studentChoosesWorld: true`), roster of five: Ana R., Marcus O.,
Priya S., Dev K., Leila H.
**Screenshots:** `gauntlet/screens/critic-accounts/`
**Scripts:** `.scratch/ca_*.mjs`, `.scratch/critic_seed*.test.ts`

> **Note on conditions.** The repo was being edited by the builder throughout this review, and
> `:4173` is a Vite dev server that hot-reloads from the working tree. Mid-review the whole
> educator surface white-screened for several minutes (`DEMO_LABEL` renamed to
> `DEMO_CLASS_LABEL` without updating `EducatorShell.tsx` / `EducatorPages.tsx`). I have **not**
> counted that against the product — it is an in-flight commit, not a defect. Every finding
> below was re-observed after the tree settled, and the headline finding was reproduced
> independently on two different builds an hour apart.

---

## SUMMARY

The scaffolding is real. Token signing, cross-teacher isolation, cross-kind token rejection,
feedback authorisation, XSS escaping, card reissue, seat removal, and class-wide sign-out are
all correctly implemented and I could not break any of them. The gradebook rewrite is
defensible: absences are genuinely blank rather than zero, and a Pop-Up student really does get
the same columns as a Basketball student.

But the identity layer has a hole at the exact point it was built to close. **Two students
signing in one after the other on a shared Chromebook — each tapping their own name and typing
their own card — become one account.** The card is verified and then discarded in favour of
whatever token was already in `localStorage`. I reproduced this twice; the result is that a
student's own phone, which nobody else touched, shows a different named classmate's work and
that classmate's teacher feedback, and the merged account can turn work in under the other
student's seat and be accepted with `202`. This is the failure mode the join flow's own comments
say it was designed to prevent.

Around that sit three more things that are load-bearing and wrong: the live class view can
*never* report "still working", because nothing in the shipped client writes a checkpoint; the
share-out projects the teacher's private note onto the wall while its own documentation says
that note is "visible to them and to nobody else"; and 40 join attempts from one school IP in
ten minutes locks the whole room out of the lesson with a message that says "wait a minute".

The three headline counts on the teacher's own class page disagree with each other in one
viewport.

---

## WHAT I PERSONALLY REPRODUCED

Everything below I drove myself, against the running services. No finding here is a code reading;
source is cited only to explain a behaviour I had already observed.

**Setup.** Created a teacher account, a class, a mixed-world assignment, and a five-name roster
via the documented `curl` calls. Seeded real finished work through **authenticated student
sessions** (`.scratch/critic_seed.test.ts`): seats 1–3 Basketball, seat 4 Pop-Up, seat 5 left
absent. Later added a truncated Pop-Up run for seat 5 (`.scratch/critic_seed2.test.ts`).

**Join, played as a twelve-year-old** (390 × 844): wrong code, lowercase code, a code containing
a zero, a short code, an already-claimed name, a wrong card code, a lowercase card code, backing
out with "Not me" and "Different class", and a page refresh on each of the three steps.

**Shared device:** signed in as one student then another in the same browser with nothing
cleared, twice, on two different builds — plus a second browser context standing in for the
first student's own phone.

**Accounts and authorisation, by real request:** a second teacher against my class (read, write,
delete, sign-out, reissue, share-out); a student token on five teacher routes; a teacher token on
three student routes; a token with its payload edited to `kind: teacher` and its expiry extended;
signature stripped; alg-none shape; garbage; expired. A token after class deletion, after the
seat was removed, after the card was reissued, and after the teacher pressed sign-out.
Brute-forced the join endpoint to the rate limit and past it.

**Live class view:** had a student actually start a run in a browser and stop mid-way, then
opened the teacher's class page while she was still on screen in another context.

**Gradebook:** clicked the real "Copy … for a gradebook" button and read the clipboard.

**Share-out:** chose items, reordered, renamed a reason, toggled names, presented, drove it with
arrow keys, ran past the end, pressed Escape, and measured the computed font size and visibility
of every rendered leaf node in present mode on a 1920 × 1080 viewport. Also opened the share-out
of two unrelated Pop-Up-only classes to isolate a world-parity question.

**Feedback:** sent as teacher; attempted as student and anonymously; against an attempt that does
not exist; empty; 16,200 characters; and containing `<img onerror>` + `<script>`. Verified on the
student's screen.

**Accessibility:** the full join → home journey keyboard-only at 390 px, and `/join` and `/home`
at 200 % zoom.

---

## FINDINGS

### CRITICAL 1 — Two students on a shared Chromebook become one account; a student's own device then shows a classmate's work

**Detail.** `POST /classes/:code/join` verifies the card code, and then ignores whose card it
was. It prefers the account id carried by whatever session token the browser already had:

```js
// server/identity.ts, claim()
let id = studentId ?? entry.studentId;   // caller's ambient token wins over the seat's own owner
...
if (entry.studentId && entry.studentId !== id) {
  await store.unlinkSeatFromStudent(entry.studentId, { classCode: entry.classCode, seatCode: entry.seatCode });
}
await store.putRosterEntry({ ...entry, studentId: id, ... });
```

So the second student to sign in on a cart Chromebook does not get their own account — they
capture the first student's, and drag it onto their own seat. Both students then *are* that one
account. Nothing on either screen indicates it.

**Evidence — run 1** (`.scratch/ca_04_hijack.mjs`). Leila H. signs in on the cart Chromebook at
"9am"; her token is also loaded into a second context standing in for her own phone. Both show
`Leila H.` with nothing turned in
(`20-leila-own-home-before.png`, `21-leila-phone-before.png`). Priya S. — who has already turned
in work — then picks up the *same* cart Chromebook, taps **her own name**, and types **her own
card code**. Her screen is correct (`22-priya-on-cart.png`). Leila's phone, reloaded and
otherwise untouched, now reads:

```
Priya S.   Not you?
PERIOD 3 · GRADE 7
Eight Weeks to the Showcase
Turned in 8/18/2026. Your teacher has it.
```
→ `23-leila-phone-shows-priya.png`

**Evidence — run 2, on a later build** (`.scratch/ca_25_hijack_recheck.mjs`). Dev K. signs in on
the cart, account `s_78a8e750…`. Ana R. then signs in on the same machine with her own card —
same account, `s_78a8e750…`, `SAME ACCOUNT? true`. Dev's own device, holding his own token, now
shows **Ana R.** and Ana's Basketball submission; Dev's Pop-Up work and the feedback his teacher
wrote him have vanished from his screen → `88-devs-device-shows-ana.png`.

**Evidence — roster corruption.** After two such collisions the store holds one account per two
seats, which the code comment above `claim()` explicitly says must never happen. Raw roster
records for `M7KAX`:

```
seat 1 Ana R.    -> s_f8acce8973dc426d9ffb5fd378af2831
seat 2 Marcus O. -> s_f8acce8973dc426d9ffb5fd378af2831   ← same account
seat 3 Priya S.  -> s_757c7e544b6348c1a83881bbc32d052c
seat 5 Leila H.  -> s_757c7e544b6348c1a83881bbc32d052c   ← same account
```
The unlink cleans the *student → seat* index only; the other seat's *roster → student* pointer is
left pointing at the captured account.

**Evidence — it lets one student submit as another.** Leila then signs in cleanly on a fresh
device with her own card (account `s_757c7e…`, `/me/classes` shows only her own seat 5 — the
damage is invisible to her). Because that account also holds seat 3, a submission posted under
**seat 3** with her token is accepted:

```
POST /classes/M7KAX/submissions   Authorization: Bearer <Leila>
{"seatCode":"3", "sessionId":"leila-posting-as-priya", ...}
→ {"seatCode":"3","submittedAt":1787085298824}   STATUS:202
```

The teacher's submission list, reading queue, debrief and gradebook export then all carry that
work under **Priya S.** Priya's own student home shows two turned-in Basketball attempts, one of
which she did not make (observed in `.scratch/ca_24_signout_ui.mjs` output).

**Why it loses.** The product's stated threat model is the cart Chromebook — the join screen's
own comment says a long-lived session on a shared machine "is how the next student ends up inside
the last one's attempt", and the device question exists to address it. The device question does
not address it: this happens on the default `shared` setting, within one lesson, with both
students doing exactly the right thing. A twelve-year-old opening BOW at home and finding a
classmate's name, a classmate's plan and a classmate's private teacher feedback on their own
phone is a student-data incident, not a bug report. Work attributed to the wrong named child is
the one failure an assessment product cannot survive — every downstream surface in this review
(live view, reading queue, debrief, share-out, export) faithfully propagated the mis-attribution.
There is no in-product signal that any of it happened.

---

### HIGH 2 — Forty join attempts from one school IP lock the whole room out of the lesson, with wrong advice and no way out

**Detail.** The join rate limit is keyed `join:${clientId}:${code}`, 40 attempts per 10 minutes,
and `clientId` is the source IP (`server/index.ts`). A class of thirty sits behind one NAT.
Thirty successful joins plus ten mistyped five-character card codes is forty.

**Evidence.** After my brute-force probe consumed the bucket, I stopped attacking and simply
signed in normally at 390 px (`.scratch/ca_21_lockout.mjs`). Leila H., tapping her own name and
typing her **correct** card `WYXW6`:

```
Type the code on your card.
Leila H.
…
Lost your card? Ask your teacher — they can print a new one.
Too many tries. Wait a minute and try again.
```
→ `83-locked-out-390.png`

Dev K., a **different** student with his own correct card `7AM3X`, on the same screen:
`Too many tries. Wait a minute and try again.` → `84-second-student-locked-out.png`

Confirmed by API that a correct card is refused while the bucket is full:
```
POST /classes/M7KAX/join {"seatCode":"1","joinCode":"7PJGJ"}   ← the real, current card
→ {"error":"too_many_attempts"}   STATUS:429
```

**Why it loses.** Three separate failures compound. The limit is *per class*, so one child's
typos lock out their classmates. The message says **"Wait a minute"**; the window is **ten**. And
the only other advice on the screen — "Lost your card? Ask your teacher — they can print a new
one" — is actively wrong: a freshly printed card is refused identically, so the teacher's
remediation makes the room look more broken. Enumerating every control on that screen leaves
`Go in` (fails again) and `Not me` (returns to the name list, which leads straight back). This is
the dead-end the brief asked about, and it takes the lesson with it.

---

### HIGH 3 — "Still working" is structurally impossible; the live view reports a mid-run student as "Not started"

**Detail.** `LiveState` derives "still working" entirely from `progress`, which is the server's
attempt-checkpoint list. Nothing in the shipped client ever writes one:

```
$ grep -rn "checkpointAttempt\|readMyAttempt" src --include=*.ts --include=*.tsx | grep -v "session.ts"
(no output)
```

Both functions are exported from `src/student/session.ts` and called from nowhere.

**Evidence.** Leila H. signed in and played the Basketball run through six real interactions in a
browser (`.scratch/ca_06_leila_run.mjs`, `40-run-step-00..03.png`), and was left mid-run with her
tab open. The teacher's class page, loaded at that moment in another context:

```
RIGHT NOW / WHERE THE ROOM IS
TURNED IN 4    STILL WORKING 0    NOT STARTED 1
Not started: Leila H..
```
→ `43-teacher-live-while-midrun.png`

Server side, after the run: `GET /classes/M7KAX/submissions` returns `"progress": []`, and there
is no `checkpoints` directory in the store.

Two consequences beyond the count. The student home's resume branch — `entry.inProgress ?` →
*"You stopped at …"* / **"Carry on"** — can never render; Leila's home showed the untouched
**"Start"** card both before and after her six-step run (`41-leila-home-after-partial-run.png`).
And `GAUNTLET_STATUS.md` lists "cross-device resume, server-side attempt checkpoints" as shipped.
The endpoints exist; nothing reaches them.

**Why it loses.** The panel's own documentation says it exists because "a teacher walking the room
could not see who had not started, who was mid-run, or who had stopped on Tuesday and not come
back." It answers exactly one of those three, and answers the other two with a confident number
that is always zero and a named accusation that is false. A teacher who trusts "Not started:
Leila H." walks over to a child who is twenty minutes into the work. A live view that is wrong in
this direction is worse than no live view, which is the standard the component's own comment sets
for itself.

---

### HIGH 4 — The teacher's private share-out note is projected to the room

**Detail.** `ShareOut`'s documentation: *"there is a present mode: one item at a time, big enough
to read from the back, driven by arrow keys, with the teacher's own note visible to them and to
nobody else."* The editor labels the field **"WHY THIS ONE — FOR YOU, NOT THE ROOM"**. Present
mode renders it.

**Evidence** (`.scratch/ca_16_note_visible.mjs`, 1920 × 1080). Every rendered leaf in present
mode, with computed style:

```
ON SCREEN    12px vis=visible op=1  y=  30  "2 of 3"
ON SCREEN    15px vis=visible op=1  y=  16  "Done"
ON SCREEN  41.6px vis=visible op=1  y= 408  "Plan B"
ON SCREEN  38.4px vis=visible op=1  y= 466  "I kept the backup money because the bonus is not guaranteed…"
ON SCREEN    15px vis=visible op=1  y= 637  "Eight Weeks to the Showcase"
ON SCREEN    15px vis=visible op=1  y=1020  "← Back" / "Next →"
ON SCREEN    14px vis=visible op=1  y=1032  "Start here — she protected the backup money"   ← .present__note
```

The note I typed as the teacher's private reason is bottom-right on the projected screen →
`68-present-note-visible.png`.

**Why it loses.** There is no second screen here — present mode *is* the projector. The field is
labelled as private and documented as private, so a teacher will write in it the way they think
about students: *"she protected the backup money"*, *"Ana's is the one to open with"*, *"this is
the misconception I flagged on Tuesday"*. Anonymity is the feature this surface is built around —
"Plan A" and "Plan B" exist precisely so the room cannot identify the author — and the note
undoes it in the same frame. The gendered pronoun in my own note narrowed the field on my first
attempt without my intending it to.

Related, same surface: the note is **pre-filled with BOW's machine-generated reason** ("Decided
differently from the plan beside it, in Eight Weeks to the Showcase"), which is then projected
under a heading that says the note is the teacher's own. And on a 1920 × 1080 projector only the
quote (38 px) and title (42 px) meet "big enough to read from the back"; the counter is 12 px and
the controls and note are 14–15 px.

---

### HIGH 5 — The share-out silently excludes the entire Pop-Up world in a mixed-world class

**Detail.** In `M7KAX` — assignment created with `allowedWorldIds: ["basketball","food-truck"]`
and `studentChoosesWorld: true`, the configuration the product invites — the share-out offers
four candidates and **all four are Basketball**. Dev K.'s completed Pop-Up run, with a real
write-up, is not offered. Neither is Leila's.

**Evidence** (`.scratch/ca_18_mixed_recheck.mjs`):
```
mentions "Run the Pop-Up"? false
mentions Dev K.? false   Leila H.? false   Seat 4? false   Seat 5? false
```
→ `63-shareout-full.png`

This is **not** a general world-blindness. I opened the share-out of two unrelated Pop-Up-only
classes and Pop-Up candidates appear normally, with their own reasons
(`70-popup-only-2subs-shareout.png`):
```
Seat 21 · Run the Pop-Up — "Two of the Run the Pop-Up explanations, as far apart as this class got."
Seat 22 · Run the Pop-Up — …
```
And the same class's **reading queue is world-complete** — I paged all six items and Dev K. (5 of
6) and Leila H. (6 of 6) are both there. The **debrief** also reads Pop-Up writing aloud in §5.
So the evidence exists, two neighbouring surfaces use it, and only the share-out drops it, only
when the class is mixed.

**Why it loses.** The gradebook was rewritten specifically because "it only existed in one world…
a class that let students choose put a number beside half the room and an explanation beside the
other half." That principle was applied to the export and then not applied to the brand-new
surface shipped beside it. In a choose-your-world class the Pop-Up students can never be put in
front of the room — not because their thinking is weaker, but because of a world they were
invited to choose. The debrief compounds it by telling the teacher outright: *"Two market plans
side by side is not built yet."*

---

### HIGH 6 — A second feedback note silently destroys the first, and the student never sees it

**Detail.** Feedback is stored one record per `(class, seat, session)`. Writing again overwrites.
The teacher's composer labels the second write **"Say something else"**, and the student home
renders `entry.feedback.map(...)` as a list — both imply accumulation.

**Evidence.** Note 1 to seat 4 → `201`. Note 2 to the same attempt → `201`. The store then holds
one file, `feedback/4:session-00000004.json`, containing only note 2. Dev K. signed in at 390 px
(`.scratch/ca_23_second_note.mjs`):

```
FROM YOUR TEACHER
Second note: also show me the number you used for the cushion.
8/18/2026
```
`number of notes shown: 1` → `85-dev-second-note-only.png`

The first note — *"Dev — your cushion-first argument is the strongest one in the room. Next time
say what it costs you."* — was never seen by Dev and no longer exists anywhere.

**Why it loses.** This is the loop the whole release is named for: *"The student never sees
anything come back."* A teacher adding a follow-up on Friday to a note they wrote on Tuesday
deletes the Tuesday note, is told "Sent", and the child receives the follow-up without the praise
it was following up on. Silent destruction of a teacher's own writing, on the one path the
release exists to build, with UI copy that promises the opposite.

---

### MEDIUM 7 — Three different answers to "how many turned in", two of them in one viewport

**Evidence** (`43-teacher-live-while-midrun.png`, `90-overview.png`). One screen, scrolled once:

```
5 turned in. 5 written explanations are still to read…      ← counts submission records
TURNED IN 4   STILL WORKING 0   NOT STARTED 1               ← counts distinct seats  (sum = 5)
```
The live roster at that moment was **four** seats (seat 2 removed). Later, with six records:
`6 turned in` in the headline, `TURNED IN 5` in the tile, against the same four-seat class.

Mechanism, from `LiveState`: `done = new Set(turnedIn)` is not filtered against the live roster,
so a student the teacher **removed** still counts as turned in, while `notStarted` is computed
only over live seats. Removing a student therefore makes the panel report a class larger than the
class. The headline counts records, so any seat with two attempts adds one more.

On the same screen: **"Counts across 0 of 5 with a usable result"** sits directly above a table
reading **"4 demonstrated · 1 still incomplete"**. And "EVERY STUDENT WHO TURNED IN" lists
**Priya S. twice** and **Seat 2** (removed, unnamed) among named classmates.

**Why it loses.** This is the first thing a teacher reads, and it is the number they will repeat
to a head of department. Three counts of one class, none labelled as counting a different thing.

---

### MEDIUM 8 — The gradebook export is not roster-shaped: absent students have no row, removed students do

**Evidence.** Clipboard contents of the real "Copy Period 3 · Grade 7 for a gradebook" button
(`.scratch/ca_08_export.mjs`, `50-export-button.png`), five rows for a five-name roster:

```
Seat  Student     World                        Turned in   Req met  short  never   …  Reasoning(/10)  …
1     Ana R.      Eight Weeks to the Showcase  2026-08-18   8  0  1                        (blank)
2                 Eight Weeks to the Showcase  2026-08-18   8  0  1                        (blank)
3     Priya S.    Eight Weeks to the Showcase  2026-08-18   7  0  2                        (blank)
3     Priya S.    Eight Weeks to the Showcase  2026-08-18   8  0  1                        (blank)
4     Dev K.      Run the Pop-Up               2026-08-18   8  0  1                        (blank)
```

- **Leila H. (seat 5, on the roster, did not turn in) has no row at all.** The design principle is
  "Absences, not zeros" — but an absence here is not a blank, it is a missing line. A teacher
  pasting this beside their own roster column gets a silent off-by-one for every absentee.
- **Seat 2, whom the teacher removed from the roster, does have a row**, with a blank name.
- **Seat 3 appears twice with contradictory numbers** (`7 0 2` vs `8 0 1`, and "still incomplete"
  vs "demonstrated" on the same competency) and there is **no session or attempt column** in the
  TSV to tell them apart — `sessionId` is computed into `GradebookLine` and then not emitted.

**Why it loses.** This is the one artefact that leaves BOW and lands somewhere nothing can explain
it. A paste that omits the absent, includes the removed, and duplicates one child with two
different answers is worse than no export, because the teacher cannot see any of it happening.

---

### MEDIUM 9 — Any five-character class code returns the class's full list of student names, unauthenticated

**Evidence.**
```
$ curl -s http://127.0.0.1:4180/api/classes/M7KAX/roster       # no Authorization header
{"roster":[{"seatCode":"1","displayName":"Ana R.","claimed":true},
           {"seatCode":"2","displayName":"Marcus O.",…},
           {"seatCode":"3","displayName":"Priya S.",…},
           {"seatCode":"4","displayName":"Dev K.",…},
           {"seatCode":"5","displayName":"Leila H.",…}],
 "joinMode":"roster","label":"Period 3 · Grade 7"}   STATUS:200
```
A second teacher's token is correctly refused on every other route in the class — submissions,
feedback, delete, sign-out, card reissue, share-out all `403` — but the roster is open to
everyone, including a signed-in teacher from a different school.

**Why it loses.** The class code goes on a whiteboard and gets photographed, read aloud, and typed
into group chats. The join screen promises *"No name, no email, nothing about your real money"*
and the source says "BOW does not know whether any of them is real" — but the product is
nonetheless publishing a roster of children's names and class label to anyone holding a code that
was designed to be shouted across a room. The names are needed on the door, but the current design
hands the whole list to an unauthenticated GET rather than, say, requiring a card to resolve one.

---

### MEDIUM 10 — The share-out offers the same submission twice, with two contradictory reasons

**Evidence** (`60-shareout.png`, `63-shareout-full.png`). Seat 2's single submission appears as
two cards, with the same paragraph and mutually exclusive explanations:

```
Seat 2 · Eight Weeks to the Showcase
  "Decided differently from the plan beside it, in Eight Weeks to the Showcase."
  "I counted the completion bonus because I am going to finish…"

Seat 2 · Eight Weeks to the Showcase
  "Made the same call as the plan beside it, and gave a different reason for it."
  "I counted the completion bonus because I am going to finish…"       ← identical text
```

Choosing either marks **both** "Chosen" (items are keyed by `sessionId`, not by reason), so a
teacher who deliberately picked two things gets one and is never told. And the removed student
(seat 2) is being offered for projection at all.

**Why it loses.** The entire premise of this surface is *"candidates with BOW's reason for
offering each one"* — Smith & Stein's *select*. A reason a teacher cannot trust is worse than no
reason; two opposite reasons for one paragraph, on screen together, tells a teacher the
recommendation engine does not know what it is looking at.

---

### MEDIUM 11 — Two routes do the same job, from adjacent buttons, with different contents

**Evidence** (`90-overview.png`, `90-debrief.png`). The class page footer offers
**"Open the debrief"** and **"Pick what the room sees"** side by side. `/debrief` §5 is
*"Read these explanations aloud"* — four Basketball quotes plus the Pop-Up quotes, unfiltered,
unordered, no reasons. `/share-out` is *"Pick what the room sees"* — up to five, ordered, with
reasons, Basketball only. Both select student writing to put in front of the room; neither says
which to use; the newer one has strictly less coverage than the one it was built to replace. The
debrief also tells the teacher a section is unbuilt: *"Two market plans side by side is not built
yet."*

Vocabulary drifts across the same surfaces: `Not assessed yet` / `Nobody is assessed yet` /
`still incomplete` / `not observed` / `demonstrated` / `awaiting your reading` / `still to read`
all describe the state of one piece of work; identity alternates between `Ana R.` and `Seat 2`
inside a single list; the same candidate kind is worded *"Decided differently from the plan
beside it"* in Basketball and *"Two of the Run the Pop-Up explanations, as far apart as this class
got"* in Pop-Up. The student side has four controls for "this is not me" — `Not you?` on the
home, a second `Not you?` on the challenge sign-in gate, `Not me` on the card step, and
`Different class` on the name step — plus `Go in` meaning "claim this seat" on the join screen and
"start the challenge" on the challenge screen.

---

### LOW 12–18 — smaller things, all observed

- **Focus is never moved on a join step change.** After Enter on the class code, and after
  choosing a name, `document.activeElement` is `<BODY>`; a keyboard user must Tab from the top of
  the document at each of three steps and a screen-reader user is told nothing
  (`.scratch/ca_20_a11y.mjs`).
- **`Not started: Leila H..`** — a trailing period is appended to a display name that already ends
  in one (`43-teacher-live-while-midrun.png`).
- **390 px header wraps badly**: `Ana`/`R.` and `Not`/`you?` each break across two lines
  (`88-devs-device-shows-ana.png`).
- **Short class code + Next is a silent no-op** — the button is `aria-disabled` with no hint that
  five characters are needed (`04-short-code-noop.png`).
- **Refreshing on join step 2 or 3 returns to step 1** and the class code must be retyped
  (`05-refresh-on-who.png`). Recoverable, but a refresh is the first thing a stuck child does.
- **Teacher sign-out drops the student to the class-code screen with no message** — token cleared,
  no explanation of what happened (`86-after-teacher-signout.png`).
- **A 16,200-character feedback note is truncated to 400 mid-word and answered `201`.** Through the
  UI the textarea is `maxLength={400}` with no counter, so a teacher writing a longer note simply
  stops being able to type.

---

## WHAT HELD UP

I attacked these and could not break them. They are the reason this review is a rejection of
specific things rather than of the release.

- **Token integrity.** Payload edited to `kind: teacher` with the original signature → `403`;
  signature stripped → `401`; alg-none shape → `401`; garbage → `401`; expiry edited → `401`.
  The HMAC is doing its job.
- **Cross-teacher isolation.** A second teacher against my class: submissions `403`, feedback
  `403`, delete `403`, sign-out `403`, card reissue `403`, share-out read and write `403`.
- **Cross-kind tokens.** Student token on five teacher routes → `403`/`401`. Teacher token on
  `/me/classes` and `/me/attempt` → `401`.
- **Feedback authorisation and validation.** Student `403`, anonymous `403`, non-existent attempt
  `404` *"No attempt from that seat."*, empty body `400` *"Write something for them to read."*
  Messages are plain and correct.
- **XSS.** `<img src=x onerror=…><script>alert(1)</script>` sent as feedback renders as literal
  text on the student's home; zero injected nodes; no dialog; `document.title` unchanged
  (`30-priya-home-feedback.png`).
- **The feedback loop itself works end to end** — teacher writes, student sees it at the top of
  their home, and the turned-in card changes to *"Your teacher has written back."*
- **Card reissue.** Old card `401`, new card works, and the seat's existing submission is still
  attached to the student afterwards.
- **Seat removal.** Card `404` *"That name is not on this class list."*; the work is preserved;
  the student door stops listing the name.
- **Class-wide sign-out.** `{"signedOut":5}`, every student token immediately `401` on
  `/me/classes` and `/me/attempt`.
- **Deleted class.** The student's token stays valid, `/me/classes` returns `[]`, and the home
  shows *"You are not in a class yet."* with a way back in — no dead-end.
- **Join brute force is rate-limited** (40 / 10 min) — the ceiling is correct even though its
  blast radius is not (finding 2).
- **Submission authorisation.** A rostered class refuses work that cannot say who it is from.
- **The export's world parity is real.** A Pop-Up student and a Basketball student get identical
  columns; I also seeded a deliberately truncated run and the competency list stayed stable, so
  the header and rows stayed aligned. **Absences are genuinely blank, not zero.** There is no
  composite, and every column is traceable to a named thing. This part of the rewrite is
  defensible and I could not find a claim in it the evidence does not support.
- **Present mode's edges.** Arrow keys work; pressing past the last item sticks at "3 of 3"
  instead of breaking; Escape returns to the editor.
- **200 % zoom.** No horizontal overflow on `/join` or `/home` (`scrollWidth == clientWidth`).
- **Join copy for the common mistakes.** Lowercase class codes and lowercase card codes are both
  accepted and up-cased in the field; a wrong class code says *"No class with that code."*; a
  wrong card says *"That did not match. Check it and try again."*
- **The reading queue is world-complete** — all six attempts, both worlds, in order.

---

## VERDICT

**REJECT** — signing in on a shared classroom Chromebook merges two students into one account, so
a child's own device shows a named classmate's work and teacher feedback, and that account can
turn work in under the other child's seat and be accepted.
