# Art doctrine — Rule 8, replaced

**Status: canonical.** This supersedes every "inline SVG and CSS only" line in
`RULING.md`, `SATURDAY_BUILD_BRIEF.md` and `SUPPLIER_BUILD_BRIEF.md`, and the header comment in
`src/components/primitives/WorldArt.tsx`. Where those disagree with this file, this file wins.

## Rule 8

> Art and world visuals are **performance-budgeted, not medium-restricted.** CSS and SVG remain
> useful tools; they are not the ceiling. BOW may use locally bundled and optimized raster art,
> SVG assets, local subset fonts, Canvas/procedural visuals, sprites, textures and other
> appropriate techniques when they materially improve the experience. No critical experience may
> depend on a third-party runtime network resource. Every visual system must pass Chromebook-class
> performance, responsive, accessibility, CSP/security and evidence-integrity review. Design for
> the strongest experience first, then implement it with the lightest technique that preserves it.

Rule 9 — word budgets priced in stages — is untouched.

## 1. The CSP never banned images. It was read wrong.

The doctrine this replaces justified itself with `connect-src 'self'`. That directive governs
**connection mechanisms** — `fetch`, `XMLHttpRequest`, WebSocket, EventSource, `navigator.sendBeacon`.
It has never had anything to say about `<img>`, `@font-face` or `<video>`. Those are `img-src`,
`font-src` and `media-src`.

The policy actually shipped, identically in `index.html:27` and `vercel.json:18`:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
img-src 'self' data:; font-src 'self'; connect-src 'self';
form-action 'none'; base-uri 'self'; object-src 'none'
```

| Directive | What it already permits | Consequence |
| --- | --- | --- |
| `img-src 'self' data:` | Any same-origin image — PNG, WebP, AVIF, SVG — plus inline `data:` URIs | Raster and external SVG art were **always** legal |
| `font-src 'self'` | Any same-origin font file | Locally bundled WOFF2 was **always** legal |
| `media-src` *(unset)* | Falls back to `default-src 'self'` → same-origin audio/video | Local video is legal without touching the policy |
| `connect-src 'self'` | Same-origin fetch/XHR/WS only | Unrelated to any of the above |

**Therefore: shipping local art requires zero CSP changes, and the security posture is
unchanged.** The one genuine restriction is that `blob:` is absent from `img-src`, so
`URL.createObjectURL` cannot feed an `<img>`. Canvas `toDataURL` produces `data:`, which is
allowed. Nothing planned needs `blob:`; if something ever does, that is a deliberate policy
amendment with its own argument, not a convenience.

Verified rather than asserted: see `src/design/assetPolicy.test.ts` and the browser check in
`e2e/assetPolicy.spec.ts`, which loads a real same-origin WebP and a real same-origin WOFF2 under
the exact production policy and fails on any CSP violation report.

## 2. What is actually banned

Runtime dependency on somebody else's server. Not a medium. Concretely: no remote image CDN, no
Google Fonts or other font host, no externally hosted game assets, no animation library that
fetches at runtime, no generative-image service in the request path, no third-party asset API.

The pipeline is: **acquire or generate deliberately → optimize → commit → serve from our own
origin.** A school with a captive portal, a dead uplink or a filtered DNS still gets the whole
product.

## 3. Baseline, measured

`npm run build` at `047e7df`, production, gzip sizes as reported by Vite:

| | raw | gzip |
| --- | --- | --- |
| `index.html` | 3.03 kB | 1.54 kB |
| `assets/index-*.css` | 212.17 kB | 34.56 kB |
| `assets/index-*.js` | 842.88 kB | 247.39 kB |
| **first-load total** | **1058 kB** | **283 kB** |
| images | 0 | 0 |
| fonts | 0 | 0 |

Two facts follow. First, **283 kB gzipped is light**, so there is real headroom — the old rule was
not buying performance, it was buying nothing. Second, **there is exactly one JS chunk**: no code
splitting, so today a student on the front door downloads Basketball's code and Food Truck's code
and every teacher surface. Any art that arrives as a JS-imported `data:` URI lands in that same
chunk and is paid for by every route. Art therefore ships as **asset URLs**, not inlined bytes,
so it is separately cacheable, lazily fetchable and never charged to a route that does not show
it. `vercel.json` already serves `/assets/*` as `immutable` for a year, which is exactly the
header this wants.

## 3b. What an evening actually costs today

`BOW_PERF=1 npx playwright test --project=chromebook` — production bundle through `vite preview`,
CPU throttled 4×, 1366×768, transfer read as CDP `encodedDataLength`. Full table in
`gauntlet/v5/perf/baseline-chromebook.md`.

| | |
| --- | --- |
| Cold start — front door | **276 kB**, 725 ms, 3 long tasks, worst 141 ms |
| Everything after it — sign in, home, world choice, booth, money, plan, tray order, service | **10 kB combined** |
| Whole evening | **286 kB**, worst single task 141 ms, peak heap 7.7 MB |
| Worst layout shift | 0.024, on the beat where the night closes |

Three things follow, and they reshape §4 rather than confirm it.

**The world is free today because it is already downloaded.** Entering Food Truck costs 2.8 kB
and serving a whole Saturday costs nothing, because every world is in the one chunk that loaded
on the front door. So art at the world-entry budget of 250 kB is not a 250 kB addition to a
286 kB evening — added eagerly it would nearly double the cold start, which is the number a
student waits on. **World art therefore has to be fetched at world entry and never bundled**, and
that is now a requirement rather than a preference.

**There is real thermal headroom and no bandwidth crisis.** 141 ms is the worst main-thread task
in an entire evening at 4× throttle, and the peak heap is under 8 MB. The machine is not
struggling. This is what makes the art ambition affordable, and it is also the number that must
not move: if art lands and the worst task doubles, the art is wrong, not the budget.

**One defect was already visible, and it was not what it looked like.** The first run reported a
0.024 shift over the 0.02 ceiling before a single image existed. I wrote that up as "something
appearing at close moves the layout under the student's hands," which was an inference and was
wrong. Capturing the `sources` of every `layout-shift` entry named the real cause: about thirty
sub-0.001 shifts, almost all of them `LI` elements in the waiting lane. The queue was keyed by
ticket, so every order served made each order behind it a DOM node that moved up a row — and
during auto-serve no input causes it, so the browser scores every one.

Keying the lane by *slot* instead — four fixed positions whose text changes — says exactly the
same thing to a reader and moves nothing. With a `min-width` on the till so the takings stop
resizing their own row as they pass a power of ten: **0.024 → 0.015**, inside the ceiling.

The lesson is the one the doctrine keeps having to relearn. The metric was right that something
was wrong and useless about what; a plausible story about the cause survived being written into a
canonical document because nobody had asked the browser. Art will make this worse, not better:
a late-decoding image is exactly the kind of shift that invites a confident wrong explanation.
Capture the sources.

## 4. Budgets

Derived from the measurement above, not invented. Gzip/transfer bytes unless stated.

| Budget | Ceiling | Why this number |
| --- | --- | --- |
| Initial app load (HTML+CSS+JS, no world art) | **300 kB** | 283 kB today; ~6% headroom, not a licence to grow |
| Student shell — chrome the student always pays for | **60 kB** of art | One shared background plus the mark |
| World entry — everything a world needs to paint its first screen | **250 kB** | A full-bleed 1600px WebP scene lands near 90–140 kB; this affords the scene, a mid layer and objects |
| One world scene (single environment image, all variants) | **150 kB** | Forces real compression discipline per scene |
| All art for one world, whole playthrough | **700 kB** | Roughly one large photo; loaded across minutes, not at once |
| Local fonts, total | **120 kB** | Two subset WOFF2 faces. A third weight must displace one |
| Route transition — new bytes to move between screens in a world | **80 kB** | A transition that stalls on a download is a broken transition |
| Animation | **0 continuous JS** | Compositor-only (`transform`/`opacity`) or event-driven; no rAF loop that runs while the student reads |
| Long tasks during the golden flow | **none > 200 ms** | Input latency on a Chromebook is the whole point |
| Cumulative layout shift, any world screen | **0.02** | Every image declares dimensions or aspect ratio |
| Art for a world the student has not opened | **0 bytes** | Basketball must not load while Food Truck is playing |
| Added to cold start by any world's art | **0 bytes** | Measured above: cold start is the only download a student waits on. Art is fetched at world entry |

A budget is a gate, not a target. Coming in under it is not a reason to add.

## 5. The three vetoes

No court may waive another.

- **Visual court** — is it exceptional against the golden mockup, not against the last build?
- **Performance court** — measured on a Chromebook-class profile (§6), not on this machine.
- **Evidence court** — does the art leak anything the student is not entitled to? Crowd density,
  stock piles, queue length, comparative scale, highlight, colour and animation emphasis are all
  channels. **The shared-ruler ban holds absolutely:** no representation may let a student align
  stock quantity against crowd quantity and read off the dominant tray count perceptually. A
  beautiful illustration that hands over the answer is a failed illustration.

Accessibility sits under all three: art may never be the only carrier of state, and the accessible
version must expose the same legitimate information — not less, and **not more**.

## 6. Chromebook-class profile

The target is not this machine. Measurements are taken under CDP throttling that approximates
ordinary school hardware, and any claim about performance names the profile it was taken under:

- CPU throttled **4×**
- Network: `Fast 3G`-class for cold load, plus a warm-cache pass
- Viewport 1366×768 at `devicePixelRatio` 1, and 1024×600 for the small-laptop reflow
- The measured flow is the real one: sign in → student home → enter Food Truck → supplier →
  Saturday service → reflection

"Looked smooth here" is not a measurement and is not admissible.

## 7. Art must participate in the interface

The failure mode being corrected is rectangles-with-text-in-them. The failure mode to avoid next
is wallpaper behind the same rectangles. The counter should *be* the purchasing surface; the
window should *be* the service surface; stock, queue and market density should be visual state
derived from real world state.

But: **no critical interaction may be a hotspot on a flat image.** Imagery is environment,
material, object and state. Controls stay real, semantic, keyboard-operable and focus-visible.

## 8. And no fabricated economy

Unchanged and absolute. Art may not invent menu items, per-item prices, reputation, weather, tips,
dynamic pricing or uncertainty. Environmental states must derive from actual world state. A richer
scene is not a licence to add a number the model does not have.
