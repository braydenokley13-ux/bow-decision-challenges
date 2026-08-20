# Decisions — V6 gauntlet

Material decisions only, with the evidence that forced them. A decision recorded here is not up
for re-litigation by a later agent without new running-product evidence.

---

## 1 · The branch

`claude/bow-district-26-readiness-g5vg0v`, cut from `origin/main` at
`37d32bc3c5c4f0d8c0ed1eb75824271c9001204f` — the same SHA the charter named, confirmed by fetch
rather than assumed. The charter suggested `claude/d26-readiness-gauntlet-v3`; the session's own
branch requirement names the branch above, and that requirement wins.

---

## 2 · Who does what: Opus, Sonnet and Fable

Chosen from a measured constraint rather than from doctrine. This machine has **4 CPUs**, so a
single workflow's agent pool caps at two concurrent agents — but load averaged **under 1.0** with
four agents running, because agents are API-bound rather than CPU-bound. Wide fan-out inside one
workflow buys nothing; **several workflows running side by side** buys a great deal.

So the run is five concurrent workstreams with **disjoint file ownership**, not one large swarm:

| workstream | owns |
| --- | --- |
| Pop-Up one room | `src/stages/popup/**`, `src/components/story/**`, `worlds.css`, `scenes.css`, `motion.css`, `src/assets/**` |
| Teacher instrument | `src/educator/**`, `app.css`, `tokens.css`, `brand.css`, `reading.css`, `legal.css` |
| Student journey | `src/student/**`, `src/app/**`, `src/main.tsx`, `src/design/student.css` (new), `src/platform/**`, `server/**`, two new e2e specs |
| Baseline defects | existing `e2e/**`, `src/stages/` outside popup, `src/components/financial/**` |
| Seed and runbook | `scripts/seed-demo.ts`, `package.json` scripts, `gauntlet/v6/runbook/**` |
| Truth and integrity | documentation only; all of `src/`, `server/`, `e2e/` read-only |

Two rules make that safe. **Tokens may be added, never changed** — the student world reads the
same `tokens.css` the teacher surfaces do, and a redefined value would silently move a screen
another agent is looking at. And a workstream that needs a file it does not own **reports the
change instead of making it**, into a handoff file the director routes.

Model per role, not per task size:

- **Fable** takes one blind direction in every design war — the market, the teacher instrument,
  the student home — and competes against Sonnet architectures rather than decorating them.
- **Sonnet** is the parallel workforce: measurement, bounded investigation, accessibility and
  performance attacks, test authoring.
- **Opus** frames, rules the design wars, implements the two surfaces where craft is the whole
  risk, and attacks anything where a wrong answer would be plausible.

An agent that reviews a change is never the agent that made it.

---

## 3 · The customer at the pass is drawn in the plate's language

**Ruled on rendered evidence, not on argument.** Two directions came back and both drew the
person in an art language the environment plate does not speak — one a large green cloaked figure
with a pale featureless face, one a flat cartoon avatar over a plate faded almost to nothing.

`gauntlet/v5/art/pass/lane-master.html` already specifies how a person is drawn in this world:
neck under the head, ears implied by the skull ellipse, sloping shoulders, jacket hem,
weight-bearing leg, one warm `#ffb864` rim stroke, fills in the `#12`–`#1f` range and never pure
black. Near-silhouettes, **no faces**, no local colour.

The customer is drawn to those rules, authored at final size (the master file records that its
mid-distance symbols do not survive being scaled up, which is why its own near figures were drawn
at the size they appear), cropped at the chest by the counter's near lip, and keyed by the hatch
lamp on the student's side of the camera.

**No faces is a child-safety decision as much as a stylistic one.** A person with no features
cannot be given an expression, so the product cannot make a twelve-year-old feel they upset
somebody. What happened to a customer is carried by posture and by a sentence.

Full reasoning in `gauntlet/v6/POPUP_BRIEF.md`, under *Director's note*.

---

## 4 · How the unstyled-element sweep was run

Recorded so `DEFECTS.md` D7 can be regenerated rather than trusted. Element-level, not
token-level: `RealClassPages.tsx:658` doubles `feedback__sequence` with `judgement-list` on
purpose and says so, and a token-level sweep reports that decision as a defect.

```python
import re, pathlib
css = "\n".join(p.read_text() for p in
                list(pathlib.Path('src/design').glob('*.css')) +
                list(pathlib.Path('src/legal').glob('*.css')))
defined = set(re.findall(r'\.([a-zA-Z][\w-]*)', css))
for p in sorted(pathlib.Path('src').rglob('*.tsx')):
    if '.test.' in p.name: continue
    t = p.read_text()
    for m in re.finditer(r'className=(?:"([^"]*)"|\{`([^`]*)`\})', t):
        s = re.sub(r'\$\{[^}]*\}', ' ', m.group(1) or m.group(2))
        toks = [x for x in s.split() if re.fullmatch(r'[a-zA-Z][\w-]*', x)]
        if toks and all(tok not in defined for tok in toks):
            print(f"{p}:{t[:m.start()].count(chr(10))+1}  {s.strip()}")
```

---

## 5 · The demonstration runs on a real class, not on the sample class

`/educator/class/DEMO` renders the real class component from a fixture built by real reducer runs,
which is honest and is the right thing for a teacher exploring alone. It cannot carry the
demonstration, for a structural reason rather than a cosmetic one: `DEMO` is four characters
precisely so it can never collide with a real five-character class code, and `Roster.tsx` has no
fixture branch — so `/educator/class/DEMO/roster` calls the real API with a teacher key that
cannot exist and renders *"This class did not open."* Roster, student cards, reissue and
revocation — a third of what District 26 asked to see — cannot be shown on it at all.

So the demonstration is seeded as a **real class through the real HTTP API**, with fictional
students, real runs and real teacher feedback, reproducible in one command. That is also the
stronger claim: the thing on screen is the product, not a fixture of it.

---

## 6 · The store the demonstration runs on

The durable file store, not the memory store. Verified directly rather than assumed: with
`BOW_STORE_KEY` set to 32 random bytes and `BOW_CLASS_DIR` on an empty directory,
`/api/health` returns `{"ok":true,"store":"file","durable":true,"classroomReady":true,
"storeKey":"fresh"}`, and a class created through the API lands on disk as
`{"v":1,"iv":…,"tag":…,"ct":…}` with its plaintext label appearing nowhere in the directory.

The memory store reports itself `durable:false, classroomReady:false` and says so in its own
health reason — *"Fine for tests and demos, not for a class."* Demonstrating school
infrastructure on the store that admits it is not classroom-ready would be the wrong claim to
make in the room.
