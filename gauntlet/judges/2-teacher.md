GO WITH CONDITIONS

**Snapshot: `2feffa263925ecc2f311fa176c873ed8bd31a76e`.** Extracted with `git archive HEAD | tar -x -C /tmp/judge-teacher`, run at `app :4302 / api :4382`, `BOW_CLASS_STORE=file`. Every claim below is true of that SHA. (`HEAD` had moved to `a113918` by the time I committed this file; I did not re-run against it.)

I taught a period. Account, class, 28 children on a roster, cards printed, students working, some absent, one on a phone, one who turned in twice, marking, an overrule, a share-out, an export, and then a second class with students split across both stories. What follows is what happened.

---

## The strongest evidence for the verdict

**Ten seconds after opening the class page I knew who had turned in, who was working, who had not started — by name — and the page told me the next thing to do.**

```
http://127.0.0.1:4302/educator/class/FDQ3D?key=…
```
Loaded in 1292 / 916 / 844 ms across three loads. Above the fold (`receipts/judge-2/04-where-the-room-is.png`):

> **21 of 28 turned in. 21 of 21 still to read.**
> `[ Read the 21 explanations → ]`
>
> WHERE THE ROOM IS — TURNED IN **21 of 28** · WORKING RIGHT NOW **2 of 28** · NOT STARTED **5 of 28**
> Not started: Jordan Reyes, Nia Thompson, Sebastián Vargas, Leilani Kahale and DeShawn Carter-Wright.
> Ethan Murphy — Choosing where to live — just now
> Fatima Al-Rashid — Weeks 1–4 · Week 3's cash — just now

That is the whole job of that screen and it does it. I left two students genuinely mid-run in real browsers (`e2e/judge2d.spec.ts`) and the page named both of them and the beat they were stuck on. Signing in without starting does *not* count as working, which is the right call. **Next thing I do: walk to Ethan, who is still choosing a room while twenty-one people have finished.**

**Setup cost me almost nothing.** Paste of 28 names → 28 cards: **2985 ms, 3231 ms, 3349 ms** across three runs. The cards print three-across on three Letter pages with dashed cut lines, each carrying the child's name, the class code and their own code (`receipts/judge-2/01-printed-cards.png`, `16-cards.pdf`). I have cut up worse.

**Marking 21 explanations is four taps and a save, with no page load between students.** Round-trip on "Save and read the next", measured five times: **76, 103, 77, 75, 69 ms**. The writing is on the left, the four criteria on the right, and the screen says `You score the writing; nothing here is machine-scored.` At 1024×768 it still reads (`05-reading-queue-1024.png`); horizontal overflow measured 0 px on class, reading, share-out, debrief and roster at 1024, 1280 and 1440.

**The overrule is the thing that decides this verdict.** BOW marked Jayden Williams `Savings is a planned amount — Did not do it`. I disagreed. `I read this differently` → six levels → a **required** free-text reason under the heading *"WHY — THIS IS KEPT WITH THE JUDGEMENT / A judgement with no reason is a number nobody can check later."* After recording (`06-override-recorded.png`):

> BOW **Did not do it** · YOU **Right first time**
> *"Jayden set the course line to $900 in the first pass and only then balanced the other two rows — I watched them do it. BOW could not see the order; I could."* 8/19/2026
> Recorded beside BOW's.

Then I checked every other surface, and every one of them agreed with me:

| surface | before | after |
|---|---|---|
| Jayden's page, skill line | `Not yet` | `SHOWED IT` |
| Jayden's gradebook line | did it 10 | did it **11** |
| class page, "WHO NEEDS IT" | 9 chips incl. Seat 4 | **8 chips, Seat 4 gone** |
| class page, "Why this class" | `9 of 9 assessed (100%)` | `8 of 19 assessed (42%)` |
| export | — | column **"BOW judgements you overruled" = 1** |

An export column that counts the times I disagreed with the machine is more than my actual gradebook gives me. That is what makes this defensible on a second and third use.

**Erasing a child for a family who asked is complete.** Inline confirm: *"Their name, everything they turned in and everything you wrote back are deleted from BOW. It cannot be undone, and the rest of the class is not affected."* After erasing Grace Liu (who had work, marks and a skill verdict): roster 27→26, class page `26 students · 21 attempts`, every count re-based, and no row 21 in the export. No orphan, no ghost.

**Homework on another device, another day, works.** Fatima's card on a 390×844 phone, days later in her terms: *"You stopped at Weeks 1–4 · Week 3's cash." → Carry on →* resumed on that exact screen, 0 px horizontal overflow.

**The projection surface is one I would actually use.** Names default **off**; the room sees `Plan A` / `Plan B` in large type on a bare screen (`09-projection-names-off.png`). The debrief prints as a one-page lesson with my class's real numbers, two real anonymised plans side by side, and a 12-minute reteach (`11-printed-debrief.png`, `17-debrief.pdf`). I would carry that into a lesson.

**The assessment hygiene is teacher-grade.** `BOW does not describe a class from fewer than 5 runs.` `Never came up — This run never asked it of them. Absences, not zeros.` `Nothing is assessed yet — a student whose writing nobody has read has no usable result.` And the objective page volunteers *"BOW's bar here is higher than NYSED's own… A class that has not yet shown this has not failed NYSED's 1.3."* I can say all of that to a parent.

**The one privacy claim I could check on disk holds.** `grep -rl "Amara\|Boateng\|Isabella\|mom lost her job" .bow-classes/` returns nothing; every record is `{"v":1,"iv":…,"tag":…,"ct":…}`.

---

## The largest gap

**Two of the teacher's screens are lying to her about children, and both are a day of work to close.**

**1. "What they hear from you" is not what they hear from you.**
I wrote a note to Sofia, then thought better of it and wrote a correction. The teacher panel then showed exactly one note under the heading **"What they hear from you"** — my correction, and only that (`07-teacher-sees-one-note.png`). I signed in as Sofia with her card. Her home page showed **both**, stacked, under **FROM YOUR TEACHER** (`08-student-sees-both-notes.png`):

> *Sofia — the second run is much stronger…* 8/19/2026
> *Correction, Sofia: I mixed you up with another plan. Ignore what I said about the reserve…* 8/19/2026

`GET /api/classes/FDQ3D/submissions` confirms two feedback records. Enumerating every button on the teacher panel finds one that matches `/send|delete|remove|undo|edit|take/`: **"Send it"**. There is no way to withdraw a note, and the screen's own heading tells the teacher the old one is gone. The cost to close: render the full note history on the teacher's side, and add a delete. Two hours.

**2. The share-out nominates the sentence you must never project.**
`/educator/class/FDQ3D/share-out` opens with a section headed **WORTH SHOWING**, each card carrying a child's full name and their whole explanation with a `Show this` button. Among the eight it recommended (`15-share-out-picker.txt`):

> **Isabella Rossi · Eight Weeks to the Showcase** — Decided differently from another plan in this class.
> *"My mom lost her job last year so I know what it is like when money goes away. I left $400 spare and it saved me."*

> **Mei-Ling Chen** — *Their writing is a good way into "says what made one claim matter more", which 6 of the 21 who ran this story did not show.*
> *"i dont know. i just guessed"*

Four cards recommended "i dont know. i just guessed" / "SHOOT YOUR SHOT!!!! … then week 5 happened and i was broke. my bad" **as a good way into a skill gap**, by name. Two clicks and the names toggle and the projector reads (`10-projection-names-on.png`):

> **Isabella Rossi** — My mom lost her job last year so I know what it is like when money goes away…

The product does have a rule about not singling people out — *"Not offered as reasons — true of too much of the class to single anybody out"* — but it is a rule about statistical rarity, not about what the sentence says. Nothing anywhere warns the teacher. Names-off-by-default and teacher-chooses are real protections and they are why this is not a NO-GO; recommending a child's weakest and most personal sentence for the wall is a judgement the product should not be making on my behalf. The cost to close: stop ranking weak writing into "worth showing", and put a line on any card the teacher is about to name — one screen of copy and one filter.

---

## Everything else I found, in the order it would cost me time

3. **The class's private link rides in the URL of every teacher screen — including the one I project — and I cannot change it.** Every link out of *My classes* is `/educator/class/FDQ3D?key=U3HRQEAMR69JDMVDREMD9YN9`, and so is every link from there to `/reading`, `/share-out`, `/roster`. In a browser with **no session at all**, that URL opens the class: names, writing, my notes, the lot. The app does not need it — the same URL with `?key=` stripped works fine for a signed-in teacher. There is no "make a new private link" control anywhere on the class page or the roster. So a photographed address bar during a share-out is permanent access to 26 children, and the sign-up page's promise that *"nothing opens them but your account or that class's private link"* becomes the problem. Cost to close: drop the query parameter from in-app links when a session exists; add key rotation.

4. **"RIGHT NOW" is a snapshot.** I opened the class page, then started a student in another browser, then waited 60 s without touching anything. The count never changed; the page made **2 API calls total, both at load**, and offers no "Check again" on a class that has data (the empty class page does). A manual reload picked it up instantly. The section that tells me who is stuck is the one I must press F5 to read.

5. **The pull-out group is the only block on the page written in seat numbers.** `WHO NEEDS IT: Seat 4 · Seat 6 · Seat 8 …` sits directly under a lesson plan and directly above `Amara Boateng, Diego Ramírez, Sofia Nguyen…` (`03-who-needs-it-seat-numbers.png`). Same on `IN THEIR OWN WORDS` (`Seat 6 · did not do it`) and in the printed debrief (`2 of 20 cut sports-media course first — seats 7, 13`). Nine names I have to look up to form a group tomorrow, on a roster the product already holds.

6. **Copy on the teacher's most-read screens contradicts itself.** All on one fold (`02-class-page-fold.png`, `13-class-page-before-marking.txt`):
   - `21 of 28 turned in. 21 of 21 still to read.`
   - `0% of the 9 read so far showed it — 0 of 9.`
   - `Nobody's writing has been read yet, so there is nothing to quote.`
   - `9 of them have a usable result — one whose written explanation somebody has read.`

   Nine students had been "read" by a screen that says nobody has been read. After marking, `Counts across all 20 who turned in. 18 of them have a usable result — nothing this objective asks of them is still missing` — with two students explicitly listed as `evidence not all in`. And `1 student were never asked this in their run. Neither is a student who got it wrong, and neither counts either way.` I could not explain that last sentence to a parent because I cannot parse it. The headline after marking — `26% of the 19 students with a usable result showed it.` — never says *showed what*.

7. **The Objectives page reads the browser, not the account.** Both my classes are on the account (*My classes* lists both, and `GET /api/classes/CDT3H` shows it assigned to `nysed-pf-2026 · 1.3`). `/educator/objectives/nysed-pf-2026/1.3` listed **only FDQ3D** — no row, no "not enough yet", nothing. Visiting `/educator/classes` once populated `localStorage['bow.educator.v1.classes']`, and on the next load the missing class appeared. So "what has Grade 7 shown against 1.3?" silently drops classes on a fresh computer — against a sign-in page that promises *"An account is how your classes come back on another computer."*

8. **"Sign the whole class out" does the job and says nothing.** It genuinely ends every student session — I had Fatima signed in on another context and after the press her reload landed on `/join`. The teacher's screen was **byte-identical before and after**, checked every 400 ms for 4.8 s. No toast, no confirm, no "26 sessions ended". At 3:05pm with the trolley waiting I would press it three times.

9. **A second attempt cannot be fully marked.** Sofia turned in twice. The teacher surfaces handle it well — `Sofia Nguyen · attempt 2 of 2`, `See attempt 1`, both rows in the export, class counts taken from the latest — and the student is promised *"a new run is turned in as well as it, not instead of it — your teacher sees both."* True. But the reading queue lists 20 items for 20 students, attempt 1 is not in it, and attempt 1's page has no scoring control — only `Reasoning not read yet`. If the better writing was in the first run, I cannot mark it.

10. **The card a child takes home says "Go to BOW" and no web address.** The printed card carries name, class code, their code, and `Go to BOW · type the class code · type your code`. The URL is on my class page, on the board, not on the card. The homework case is the case the card exists for.

11. **The gradebook denominator moves per child** — `ASKED OF THIS RUN` came out 10, 11, 12 and 13 across my 20 rows, because "never came up" is correctly excluded. The export gives me the denominator and the export header explains it. It is the assessment-correct answer and it is also a percentage column I compute myself, times 28, times five periods — and a conversation with a parent about why one child is out of 10 and another out of 13.

---

## What I reproduced myself

- Made an account (`braydenokley13@gmail.com`), took the one-time recovery code, created **Period 3 · Grade 7** fixed to *Eight Weeks to the Showcase*, and later **Period 5 · Grade 7 (mixed)** on *Students pick*.
- Pasted 28 names; captured all 28 card codes off the one-time print screen; rendered the print stylesheet to PDF.
- Ran **4 students end to end in a real browser** (one desktop, one at 390×844, one twice on two devices via *Play it again*), and delivered **18 more through the real `POST /join` + `POST /submissions` endpoints** using the repository's own headless run builder (`src/test/runChallenge.ts`, `runPopUp.ts`) — those 18 were **not clicked**, and I say so.
- Left two students mid-run and read them off the class page; started a third and proved the page does not notice.
- Marked all 21 explanations in the reading queue; went back and re-marked one; timed five saves.
- Overruled a BOW judgement with a written reason and chased it to four other surfaces plus the export.
- Sent a note to a student, replaced it, and read the result from the student's own signed-in home page.
- Copied the gradebook to the clipboard and read the TSV (29 rows × 19 columns, all 28 seats present, non-starters blank).
- Ran a share-out: cleared, picked, toggled names, projected all slides, and printed the debrief.
- Took a student off the list, erased a student with work, reissued a lost card, and signed the whole class out (verifying against a live student session).
- Opened the objective page signed in and signed out, with and without the browser class list.
- Measured horizontal overflow at 1024/1280/1440 on five teacher screens (0 px everywhere).
- Opened the class with **no session, key only** — it opened.
- Read the store on disk for plaintext names — none.

## What the product claims without evidence

- **"An account is how your classes come back on another computer."** True of *My classes*; **false of the Objectives page**, which reads a browser-local list (finding 7).
- **"What they hear from you"**, over a single note, when the child has more than one (finding 1).
- **"Nothing is assessed yet — a student whose writing nobody has read has no usable result."** Nine students had a usable result with nothing read (finding 6). One of those two sentences is wrong.
- **"Their writing is a good way into [skill]"** — offered for `i dont know. i just guessed`. That is an assertion about pedagogy, by name, on a projection surface, with nothing behind it.
- **"Classes and their evidence are kept for 120 days, then deleted."** I saw `expiresAt` 120 days out and an hourly sweep field in `/api/health` (`lastSweepAt`, `lastSweepDeleted`). **I did not wait 120 days and did not observe a deletion.**
- **"encrypted"** — I verified no plaintext on disk and AEAD envelopes. I did not audit the key handling; that is judge 5's ground.
- To its credit, the compliance claims a district would fear are **absent, and their absence is stated**: *"NYSED has not reviewed or endorsed BOW"*, *"Matched to NYSED objectives, not scored against them"*, *"NYSED does not assess personal finance education… nothing BOW produces is needed for that attestation."* I found no FERPA, COPPA, §2-d, WCAG or district-approval claim on any teacher surface I opened.

## What I am claiming without evidence

- That a real Grade 7 teacher would find this fast. My "period" ran at bot speed on an idle box; I never waited for a printer, a Chromebook cart, a school Wi-Fi network, or a child who cannot find the code on the board.
- 18 of my 21 finished runs were posted through the API rather than clicked. They are indistinguishable to the class service, but they are not children.
- I ran one teacher, two classes, 40 seats, one machine. Nothing here says what happens at five periods a day, 150 students, or two teachers in the same class at once.
- I did not test a screen reader, a real projector, a real printer, or a genuinely offline classroom.
- My "20 explanations in one pass" is mechanical cost only. Reading twenty-eight twelve-year-olds' paragraphs is the work, and no software shortens it.
- The API process on this shared box died twice during my run. Both times followed my own `pkill`/process reaping, and a restart with the same key reopened every class with `storeKey: "ok"`. **I am not claiming the service crashes.**

## What would have made me refuse, and why it is absent

Four things. **A mark that moved when I was not looking** — I overruled one judgement and re-read four surfaces plus the export; every one said what I said, and the export counted my overrule in its own column. **Machine-scored writing** — the reading queue says `You score the writing; nothing here is machine-scored`, the student page says `Your own marks, criterion by criterion. BOW adds nothing to it`, and an unread explanation is reported as `Evidence not all in` rather than as a zero. **A class page that lied about who turned in** — I put two students genuinely mid-run and three genuinely absent and it named all five correctly. **A judgement I could not explain to a parent** — every one comes with a paragraph naming the moment in that child's own run, including the honest ones (*"This run cannot tell whether the course figure was the amount the student meant to save or what the other two rows left"*). If any one of those four had failed I would have written NO-GO, because a mark I cannot defend is worse than no mark.

## Conditions

Each falsifiable, in the order I would fix them.

1. **The teacher's write-back panel shows every note the student can see, and a note can be deleted.** *Test:* send two notes to one seat; the teacher panel lists both with timestamps; delete the first; the student's home page, reloaded, shows one.
2. **The `?key=` parameter is not in in-app links for a signed-in teacher, and a teacher can issue a new private link.** *Test:* sign in, click through *My classes → class → reading → share-out → roster*; no URL contains `key=`. Press "make a new private link" on the roster; the old link, in a session-less browser, returns a refusal.
3. **Nothing whose text names a family circumstance or reads as a non-answer is ranked into "WORTH SHOWING", and any card the teacher is about to project by name carries a line telling her to read it first.** *Test:* seed a class containing `"My mom lost her job last year…"` and `"i dont know. i just guessed"`; neither appears above the fold of the share-out picker as a recommendation, and turning the names toggle on shows a warning.
4. **Every student list on a class that has a roster uses names.** *Test:* on a named class, `WHO NEEDS IT`, `IN THEIR OWN WORDS` and debrief section 3 contain no string matching `Seat \d+`.
5. **"WHERE THE ROOM IS" refreshes itself, or says when it was taken and offers a control.** *Test:* open the class page, start a student elsewhere, wait 60 s, touch nothing — the count changes; or the section carries a visible timestamp and a refresh button.
6. **The four contradictory strings in finding 6 are gone.** *Test:* on a class with 21 turned in and 0 read, no sentence on the class page contains "read so far" or claims a usable result; on a class with unread evidence, no sentence says "nothing this objective asks of them is still missing"; `1 student were never asked` reads as English.
7. **The Objectives page reads the account.** *Test:* sign in on a browser that has never opened a class, go straight to `/educator/objectives/nysed-pf-2026/1.3`; every class on the account assigned to 1.3 is listed, with its own state, including ones under the minimum-n.
8. **"Sign the whole class out" confirms what it did.** *Test:* press it; within two seconds the screen says how many sessions ended.
9. **A card carries the address.** *Test:* print cards; each card contains a URL a child could type at home.

Fix 1, 2 and 3 and I would hand this to the teacher next door. Fix all nine and I would ask for it.
