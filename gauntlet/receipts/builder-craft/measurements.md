# Judge 6, conditions 1, 3, 4 and 6 — before and after

Every number here came out of Chromium 1194 (Playwright 1.62.1) driving the real product on
`127.0.0.1:4403` against the real class service on `127.0.0.1:4483` (memory store), through
`visual/craft.config.ts`. The specs are `visual/occlusion.spec.ts` and `visual/states.spec.ts`;
the probe is `visual/paint.ts`. Nothing here was read off a stylesheet.

Run them:

```
BOW_E2E_APP_PORT=4403 BOW_API_PORT=4483 \
CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
npx playwright test --config=visual/craft.config.ts
```

---

## 1 — a fixed control on top of the primary status line

The judge's own measurement, at the judge's own width, before and after:

|                                | before                          | after                                   |
| ---                            | ---                             | ---                                     |
| `statusText`                   | `$4,900 still has no job.`      | `$4,900 still has no job.`              |
| `statusRect`                   | x=111 y=718 w=255 h=24          | x=111 y=718 w=255 h=24                  |
| `.reading-tools` rect          | x=24 y=700 w=146 h=44           | **x=808 y=13 w=146 h=44**               |
| computed `position`            | `fixed`                         | **`static`**                            |
| `elementFromPoint(117, 730)`   | `BUTTON.reading-tools__pill`    | **`SPAN.plan-commit__figure money`**    |

Swept over both stories, every screen as it is reached, at 1366×768, 1024×600, 768×1024,
390×844 and 320×640, in two scroll states each — *pinned* (a sticky bar held against the bottom
of the window) and *settled* (the same bar at its own place in the page). At every sampled point:
the first and last readable pixel of every text run inside `.plan-commit` / `.popup-commit` /
`.stage-action` / `.popup-action`, and the four corners of every primary button.

| run                | occluded points, before | of those `.reading-tools`, before | after | `.reading-tools` from outside the page's own bar, after |
| ---                | ---                     | ---                               | ---   | --- |
| Eight Weeks (25 screens) | 135               | **71** on 12 screens              | 102   | **0** |
| Run the Pop-Up (13 screens) | 87             | **79** on 13 screens              | 27    | **0** |
| 12 educator routes | 0                       | 0                                 | 0     | 0 |

The one remaining `.reading-tools` hit, at 320×640 scrolled to the end of the setup screen, is
the pinned top bar covering a card's *Selected* — the same pixel answered `SUMMARY` (*The four
payments*) before this change. A pinned bar covers something at some scroll offset by
construction; it is recorded rather than asserted against. What is asserted is that the control
never paints a pixel from **outside** the bar that carries the wordmark, which is what it did at
150 points.

**Cost, measured:** the challenge top bar is unchanged at 1366, 1024 and 768 (72 / 58 / 72px)
and **+52px at 390 and 320** (172 → 224), where its controls already stack. That is the price of
the control being laid out instead of floating, and it is the whole of the price.

**The open panel is untouched, and measured to be:** `--bow-reading-tools` = 69px, panel bottom
flush with the window (gap 0), `main` padding-block-end = 69px, `.plan-commit` bottom = 699 =
panel top. Asserted in `occlusion.spec.ts`, "the plan board keeps its status line…".

---

## 3 — the waiting state

`page.route("**/api/**")` held for 4s, viewport 1366×768, measuring every text node inside the
page's own `<main>`.

| screen | text | x before | x after | skeleton after |
| --- | --- | --- | --- | --- |
| `/educator/class/{code}` | Opening the class… | **0** | **93** | yes |
| `/educator/class/{code}/reading` | Opening the class… | **0** | **93** | yes |
| `/educator/class/{code}/debrief` | Opening the class… | **0** | **93** | yes |
| `/educator/class/{code}/share-out` | Opening the class… | **0** | **93** | yes |
| `/educator/class/{code}/roster` | Opening the class… | **0** | **93** | yes |
| `/home` | Getting your classes… | 283 | 283 | yes |

The cause was one word in `src/design/app.css`: `.class-state { margin: var(--s-6) 0 }` ties on
specificity with `.educator-main > * { margin-inline: var(--spine-inset) auto }` and is six
hundred lines later, so the shorthand's `0` overwrote the page's spine. It is `margin-block` now.
The skeleton is drawn on `.educator-main > .class-state:only-child::after` — `:only-child` is the
condition that separates *the page is still loading* from *this section is empty*.

`/educator/classes` for a browser with no teacher account never enters a waiting state at all
(the class list is local), and is recorded as such rather than asserted against.

---

## 4 — the message about a field

`/join`, 1366×768.

| | before (judge 6) | after, wrong class code | after, wrong card code |
| --- | --- | --- | --- |
| field | x=411 y=317 w=544 h=44 | x=411 y=356 | x=411 y=316 |
| message | x=16 **y=728** | x=411 y=412 | x=411 y=372 |
| distance from the field | **367px** | **12px** | **12px** |
| `aria-describedby` | `null` | `join-code-hint join-problem` | `join-problem` |
| `aria-invalid` | `null` | `true` | `true` |
| focus after the failure | `BUTTON "Go in"` | **the field** | **the field** |

---

## 6 — what the tab says

Before: one distinct `document.title` across every route, including the 404 fallback — which was
`<Navigate to="/" replace />`, so a dead link landed silently on the front door.

After, twelve routes measured in the browser:

```
/                                        BOW Decision Challenges
/join                                    Join a class — BOW
/educator/classes                        My classes — BOW
/educator/sign-in                        Teacher sign-in — BOW
/educator/guide                          Teacher's guide — BOW
/educator/try                            Try it as a student — BOW
/educator/objectives                     Objectives — BOW
/educator/objectives/nysed-pf-2026/1.3   Objective 1.3 — BOW
/educator/demo                           Class DEMO — BOW
/educator/demo/students/14               Seat 14 · DEMO — BOW
/educator/class/DEMO/debrief             Debrief · DEMO — BOW
/educator/class/DEMO/reading             Reading queue · DEMO — BOW
(an address that is not a page)          Page not found — BOW
```

`src/app/pageTitles.test.ts` reads the route list out of `App.tsx` and fails if a route that
draws a page has nothing to say, so the twentieth route cannot inherit the nineteenth's tab.

---

## Proved by removal

`gauntlet/receipts/builder-craft/prove-by-removal.sh` takes each fix back out, **greps for the
text it just wrote and aborts if the revert did not apply**, runs the guard, and restores. All
four guards fail without their fix:

```
condition 1 · the reading control back in the corner      PROVEN  (pill over "Start this one",
                                                                   "Check the order", …)
condition 3 · the waiting message outside the page spine  PROVEN  ("Opening the class…" at x=0 ×5)
condition 4 · focus left where it was                     PROVEN  (focus on BUTTON Next)
condition 6 · no route says its own name                  PROVEN  (1 distinct title across 12)
```

The first pass of that script reported condition 1 as **NOT PROVEN**, and it was right to: the
probe classified the control as chrome by DOM ancestry alone, so a `position: fixed` pill that
was still a child of the top bar was excused. `inWordmarkBar` in `visual/paint.ts` now requires
the control's rectangle to be inside the bar's as well. That is what reverting a fix is for.
