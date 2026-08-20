# The before, frozen

Eight full-page renders of the product at `37d32bc` — the origin/main this gauntlet started from
— captured by the repository's own screenshot specs before a single line of V6 work landed.

They are here, rather than left in `gauntlet/v5/shots/`, because the specs that produce those
files **overwrite them in place**. The moment the service screen is rebuilt,
`gauntlet/v5/shots/31-service-open.png` stops being a picture of the problem and becomes a
picture of the solution, and the before/after comparison this gauntlet is judged on quietly
loses its left-hand column.

| file | what it is | why it is kept |
| --- | --- | --- |
| `31-service-open.png` | the Saturday service screen, window just open | the headline failure: three stacked chrome bands, three equal panels, no place, no people |
| `32-service-midway.png` | midway through the evening | |
| `33-service-close.png` | closed up | |
| `34-service-1024.png` | the same screen at Chromebook width | |
| `08-demo-class.png` | the teacher's class overview | 5,914 px tall |
| `14-student-case.png` | one student's evidence | 7,285 px tall, feedback box at the bottom |
| `01-front-door.png` | the front door | |
| `21-popup-hub.png` | the market hub | |

`14-student-case.png` is also a correction. The copy committed on `main` is not the page at all
— it is a screenshot of a **crashed Vite dev server**, showing a `[PARSE_ERROR]` overlay for
`src/stages/popup/PopUpHub.tsx:91` (`'readonly' type modifier is only permitted on array and
tuple literal types`). That parse error was fixed in the source long ago; the screenshot taken
while it was live was committed and never re-shot. The file here is the real page.

The other twenty-one baseline renders are not duplicated. They are in `gauntlet/v5/shots/` at
`37d32bc` and can be recovered with:

    git show 37d32bc:gauntlet/v5/shots/<name>.png > /tmp/<name>.png
