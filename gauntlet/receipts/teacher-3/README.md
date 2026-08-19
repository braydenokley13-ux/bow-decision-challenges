# Teacher 3 receipts

Servers used: app `http://127.0.0.1:4930` (production build via `vite preview`),
class service `http://127.0.0.1:4931` (`node dist-server/index.js`, file store, `BOW_STORE_KEY`
set, private data directory). Browser: `/opt/pw-browsers/chromium` (Chromium build 1194) driven
by Playwright. Classes created: `GXT4C`, `3WMGF`, `XEWFA` — the findings are all from `XEWFA`
("Period 5 · Grade 7", 14 seats).

| File | What it shows |
|---|---|
| `00`–`07` | Setup: educator landing, sign-in, account, class form, class created, empty roster, printed cards (+ PDF) |
| `08`, `09` | A returning student's home page and the screen *Carry on* lands on |
| `10`, `11` | Reissuing one card at a time; the full card batch |
| `20`–`26` | Carlos on two devices; the first device after the second turned in; the student home afterwards; Hannah's home laptop |
| `30` | The live board with runs in flight (F2 caption visible) |
| `40-*` | Ana, Marcus and Nina's evidence pages |
| `50`–`52` | The reading queue: first card, marked, end of the pass |
| `60`–`63` | Overruling a machine judgement, and the page after it (F6) |
| `70`–`73` | Class page, debrief and share-out after marking (F1, F7, F8, F9) |
| `80` | The gradebook export |
| `90`–`92` | The board the next period; writing back to a student |
| `95`, `96` | What the child sees: their home page and their run report |
| `100`–`103` | The same surfaces after one child took a second go (F13) |
| `110`, `111` | The quiet board (F12) and the class list (S1) |
| `educator-surfaces-after-marking.txt` | Full text of the class page, debrief and share-out |
| `educator-surfaces-two-attempts.txt` | The same, after the second attempt — the F13 comparison |
| `plan-events-per-student.txt` | `PLAN_SAVED` / `COURSE_DEPOSIT_DECIDED` per student, from the API. The F1 evidence. |
| `gradebook-export.tsv` | What actually leaves BOW for a gradebook |
| `reading-queue-pass.txt` | Every paragraph, the marks recorded, and the timing of the whole pass |
| `student-9-after-override.txt` | Nina's page after the override, showing both lists (F6) |
| `child-view-marcus.txt` | The child's own home page and run report, with the teacher's note |
