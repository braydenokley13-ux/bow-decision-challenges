# BEFORE — measured ground truth of the teacher product, as it renders today

**This is a measurement, not a proposal.** Nothing in `src/` was touched to produce it. Dev
server on `127.0.0.1:4310` (`BOW_E2E_APP_PORT=4310`), class service on `127.0.0.1:4311`
(`BOW_API_PORT=4311`, memory store), Chromium 1194 via `CHROMIUM_PATH`, driven with a raw
Playwright script (not the `browser` project config) so every route could be hit with the same
instrumentation. All numbers below came from evaluating the live DOM at 1366×768 unless noted.
Screenshots are beside this file in `gauntlet/v6/teacher/`.

---

## 1 · Route-by-route measurements (1366×768)

| route | full-page height | top-level sections | interactive controls | words | primary action above fold? |
|---|---:|---:|---:|---:|---|
| `/educator/sign-in` | 989 px | 1 | 11 | 163 | **Yes** — `Sign in` submit at y=535 |
| `/educator/classes` | 1,647 px | 2 | 19 | 302 | **No** — `Create the class` primary button at y=1,305 |
| `/educator/class/DEMO` | 6,748 px | 8 | 33 | 1,434 | **Yes** — `Read the 5 explanations →` at y=328 |
| `/educator/class/DEMO/students/1` | 7,285 px | 9 | 45 | 2,346 | **No** — feedback box at y≈7,180 (see §3) |
| `/educator/class/DEMO/students/3` | 7,526 px | 7 | 45 | 2,435 | **No** — feedback box at y=7,255 (see §3) |
| `/educator/class/DEMO/reading` | 1,089 px | 1 | 25 | 155 | **Yes** — first score control at y=579 |
| `/educator/class/DEMO/debrief` | 3,056 px | 5 | 10 | 757 | **Yes** — `Print this debrief` at y=266 |
| `/educator/class/DEMO/share-out` | 2,773 px | 2 | 22 | 825 | **No, barely** — first `Show this` at y=800, 32 px past the fold |
| `/educator/class/DEMO/roster` | 768 px | 0 | 6 | 47 | trivially yes — see §5, this is an error state, not the roster |
| `/educator/objectives` | 3,699 px | 2 | 31 | 925 | **Marginal** — first objective link (`1.3 · Create a budget`) starts at y=607, but this is browsing into a 23-row list, not a single action |
| `/educator/assignments/new` | 2,582 px | 5 | 44 | 579 | **No** — `Publish assignment` at y=2,482 |
| `/educator/assign` | 1,647 px | 2 | 19 | 302 | same page as `/educator/classes` — it redirects there (see §6) |
| `/educator/guide` | 2,877 px | 4 | 19 | 975 | **Yes** — `Create a class` at y=245 |

Method: `topLevelSectionCount` = elements matching `section, [class*="section"], [role="region"]`
after removing any that nest inside another match. `interactiveCount` = visible
`button, a[href], input, select, textarea, [role=button], [role=tab], [role=link],
[contenteditable=true]`. `words` = `document.body.innerText` split on whitespace. Full-page
screenshots for every route: `route-<slug>-fullpage.png` beside this file.

Two numbers worth flagging on their own:

- **`/educator/class/DEMO` measured 6,748 px here**, not the 5,914 px `TEACHER_BRIEF.md` cites
  from `gauntlet/v5/shots/08-demo-class.png`. Visual structure is identical (compared side by
  side) — same seven/eight `dashboard-section` blocks, same "Every student who turned in" list of
  18 rows in the same order. The gap is most plausibly font/metrics rendering between capture
  runs, not a content or layout change; recorded here rather than silently reconciled.
- **`/educator/class/DEMO/roster` is not the roster.** See §5 — it never was, in the v5 shot
  either, once you actually open the PNG instead of trusting the filename.

---

## 2 · The ten-second test, timed honestly

`/educator/class/DEMO` at 1366×768, first viewport only, no scroll —
`before-firstview-1366.png`. This is the entire content visible before a teacher's first scroll:
nav bar, "Sample class" badge, headline, subhead, primary button, top of the "Where the room is"
card (turned-in/working/not-started counts and one sentence of caption). That is all.

| question | verdict | on-screen text |
|---|---|---|
| Which students have not started? | **NOT ANSWERABLE** | `NOT STARTED` shows an em dash, and the page states why rather than naming anyone: *"This class has no student list, so BOW cannot say who has not started — only who has."* No names, no count. |
| Which are working right now? | **ANSWERABLE**, trivially | `WORKING RIGHT NOW` / `0 of 18` — the count is visible and the answer happens to be nobody. No names would show even if the count were nonzero; the layout gives a number, not a roster. |
| Whose writing is waiting for me to read? | **NOT ANSWERABLE** | `5 awaiting your reading` (top-right, a link) gives a count only — no names, no list, on the first screen. |
| Who is stuck and needs help? | **NOT ANSWERABLE** | Nothing in the first viewport uses the word "stuck," names anyone, or surfaces a stuck-indicator. It does not exist on screen at all until well into the scroll (the "Not yet" / "Evidence not all in" tags first appear at y≈2,768, inside the "Every student who turned in" list). |
| What is the single next thing I should do? | **ANSWERABLE** | `Read the 5 explanations →` — one purple primary button, directly under the headline, the only `button--primary` in the first screen. |

So 2 of 5 questions the brief calls the actual specification are answerable from the first
screen, and both of those are counts, not names — "who" is never answered without scrolling.
The one clear win is the single ranked CTA: whatever else is wrong with the page, "read the 5
explanations" is legible as the one thing to press.

Screenshots saved:
- `gauntlet/v6/teacher/before-firstview-1366.png` (1366×768)
- `gauntlet/v6/teacher/before-firstview-1024.png` (1024×600) — at this size even less survives:
  the "Where the room is" counts (turned-in/working/not-started) and the "no student list"
  sentence are themselves pushed past the fold, leaving only the headline, subhead, primary
  button, and the "Where the room is" section *title* visible.

---

## 3 · Student evidence page: where is the feedback box?

`/educator/class/DEMO/students/3`, 1366×768.

- Page height: **7,526 px**
- The one `<textarea>` on the page (`id="feedback-3-session-00000003"`,
  placeholder *"Name one thing they did and one thing to try next time."*) has its top edge at
  **y = 7,255 px**.
- **7,255 / 7,526 = 96.4% of the page is above it.** A teacher scrolls through essentially the
  entire page — every override control, the full activity transcript, every rubric judgement —
  before reaching the only box only a human can fill in.

This is Cause F from `QUALITY_DEBT.md` ("the teacher's primary action is 7,000 px below the
fold"), confirmed by direct measurement rather than eyeballing the screenshot: at 96.4% down the
page, "below the fold" undersells it — it is the very last thing on the page.

(Student 1's page has the same shape: total height 7,285 px, and the same feedback box sits
under an extra "What this student moved" / "The consequences of this plan" section this seat's
state includes, so it lands a few hundred px earlier in absolute terms but is still the final
element on the page.)

---

## 4 · Type scale facts

**Usage counts**, `grep -c` for the literal token names:

| token | `src/design/*.css` (line-matches, summed across files) | `src/**/*.tsx` |
|---|---:|---:|
| `--t-label` | **61** (app.css 29, brand.css 1, scenes.css 22, tokens.css 1, worlds.css 8) | **0** actual usages — TSX never references the raw custom property, only class names the CSS applies it through |
| `--t-micro` | **136** (app.css 83, scenes.css 33, tokens.css 1, worlds.css 19) | **1**, and it's a comment (`PopUpShell.tsx:53`, describing `--t-micro` in prose, not using it) |

**Every font-size token in `src/design/tokens.css`**, with computed px. Root `font-size` is
**16px** (confirmed via `getComputedStyle(document.documentElement).fontSize` — no `html{}`
override exists anywhere in the CSS). For the `clamp()` tokens, px is viewport-dependent; the
value shown is at 1366px width, the primary teaching device width this brief specifies.

| token | declaration | computed px (@1366w) |
|---|---|---:|
| `--t-scene` | `800 clamp(2.5rem, 4.8vw, 4.2rem)/0.94` | 65.6 px (mid-clamp) |
| `--t-display1` | `800 clamp(2.4rem, 4vw, 3.25rem)/1` | 52.0 px (pinned to max) |
| `--t-display2` | `800 clamp(2rem, 3.2vw, 2.6rem)/1.02` | 41.6 px (pinned to max) |
| `--t-display3` | `800 1.6rem/1.08` | 25.6 px |
| `--t-section` | `700 clamp(1.5rem, 2.2vw, 1.875rem)/1.18` | 30.0 px (pinned to max) |
| `--t-title1` | `700 1.5rem/1.18` | 24.0 px |
| `--t-title2` | `700 1.25rem/1.24` | 20.0 px |
| `--t-title3` | `700 1.0625rem/1.32` | 17.0 px |
| `--t-body-lg` | `400 1.0625rem/1.6` | 17.0 px |
| `--t-body` | `400 1rem/1.6` | 16.0 px |
| `--t-ui` | `500 0.9375rem/1.45` | 15.0 px |
| `--t-sm` | `500 0.875rem/1.45` | 14.0 px |
| `--t-label` | `700 0.75rem/1.3` | **12.0 px** |
| `--t-micro` | `500 0.75rem/1.4` | **12.0 px** |

Confirms Cause E exactly as diagnosed: `--t-label` and `--t-micro` are both 12px, and together
with `--t-sm` (14px) and `--t-ui` (15px), four of the readable sizes below body text cluster
inside a 3px band (12–15px) — the entire register a dense teacher screen uses for metadata,
captions, counts and status.

---

## 5 · What "sound" actually meant for the roster shot

`/educator/class/DEMO/roster` does not render a roster. Loading it fresh (no prior key in this
browser for class code `DEMO`) shows:

> **This class did not open.**
> This browser does not hold the key for that class. Open it from the link you were given, or
> from My classes.

Confirmed this is not an artifact of my driver: `gauntlet/v5/shots/12-demo-roster.png` — opened
directly, not inferred from the filename — shows the identical screen, pixel for pixel. `Roster.tsx`
has no demo/fixture branch at all (unlike `useClassEvidence`, which explicitly special-cases
`DEMO_CLASS_CODE` and serves fixture data without ever calling the network). Roster always calls
`GET /classes/:code/roster` with an `X-BOW-Teacher-Key` header, and no such key can ever exist for
`DEMO` — real class codes are 5 characters and `DEMO` is reserved at 4 specifically so it can
never collide with one (`noFixture.test.tsx`), which also means it can never appear in a real
teacher key book.

So "already judged SOUND — do not fix it" was a judgement about this *error state screen* — one
clear sentence, one heading, no broken layout, a way out (`My classes`) — not about roster
functionality, which this route cannot demonstrate at all. There is no route today that shows an
issue/reissue/revoke roster against demo data; that UI only exists behind a real class's teacher
key.

---

## 6 · Both assign paths, confirmed live

| entry point | result | what it is |
|---|---|---|
| `/educator/assign` | 302-word redirect landing at **`/educator/classes`**, title "My classes — BOW" | `AssignFlow`. H1: *"Create your first class."* Primary button `Create the class` (`button--primary`) at y=1,305 — below the fold. `?code=1.3` becomes `?objective=1.3` on the redirect target. |
| `/educator/assign?code=1.3` | → `/educator/classes?objective=1.3` | same screen, objective carried through the query string |
| `/educator/assignments/new` | stays at **`/educator/assignments/new`**, title "New assignment — BOW" | `AssignmentBuilder`. H1: *"Build an assignment."* A multi-step builder (44 interactive controls, 2,582 px tall) ending in `Publish assignment` (`button--primary`) at y=2,482 — deep below the fold. |
| `/educator/assignments/new?objective=1.3` | same route, objective pre-selected in step 1 | confirmed the query param is read and applied |

Both are live, both are reachable today, and they produce genuinely different screens with
different primary actions — exactly as `QUALITY_DEBT.md` documented. This run adds nothing new
to that finding beyond confirming it still holds and recording each path's own fold behavior:
neither path's primary button is above the fold.

---

## 7 · Session/log notes

- Servers: `npm run dev -- --port 4310 --strictPort` (Vite), `BOW_CLASS_STORE=memory
  BOW_API_PORT=4311 npm run api` (class service, in-memory store — nothing here was seeded by
  hand; `/educator/class/DEMO` never touches this service at all, per `useClassEvidence.ts`).
- No console errors were logged by any route during capture.
- Driver: a standalone Playwright script (not `playwright test`) against `CHROMIUM_PATH` from
  `scripts/browser-env.sh`, run from the repo root so `node_modules/playwright` resolved.

---

## Files

- `gauntlet/v6/teacher/BEFORE.md` — this file
- `gauntlet/v6/teacher/before-firstview-1366.png`, `before-firstview-1024.png` — the ten-second
  test screenshots
- `gauntlet/v6/teacher/route-*-fullpage.png` — one full-page screenshot per route in §1
