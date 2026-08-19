# a11y-3 blockers — before and after, measured

What the accessibility critic measured in `gauntlet/critiques/a11y-3.md`, re-measured here
before the fix and again after it, the same way: Chromium driven by Playwright with
`executablePath` pinned to `/opt/pw-browsers/chromium`, `Tab` and `Enter` only, no mouse,
`document.activeElement` read out of the page at every step, and every mutation inside every
live region recorded.

**Where.** App on `http://127.0.0.1:5610` (Vite, served from an exported copy of the tree so
another agent's edit could not move under a measurement), class service on
`http://127.0.0.1:5680` with `BOW_CLASS_STORE=memory`.

| file | what is in it |
|---|---|
| `before.log` | the three blockers reproduced on the pre-fix code |
| `after.log` | the same four routes after the fix |
| `before-repeat.log` / `after-repeat.log` | pressing **Check** three times on the same wrong answer, with the live region's mutations timestamped |
| `after-popup.log` | the same fix in the second world, plus axe |
| `after-runmenu.log` | *Leave this run*: where focus lands, what the buttons are described by, `Escape` |
| `{before,after}-obscured-w320.log` | the tab ring at 320×640 with the reading tools open, each focused control sampled at 25 points — WCAG 2.2 · 2.4.11 |
| `{before,after}-pill-w320.log` | what `document.elementFromPoint` finds at each control's own centre, tools closed |
| `after-readinghelp.log` | where the reading help exists outside a run, and where focus goes when it opens |
| `final*.log` | the whole sweep re-run against the tree as pushed, after several other agents had edited the same screens |
| `revert-check.log` | the pinning tests run against the pre-fix source |
| `drivers/` | every driver that produced the above |

`drivers/kit.ts` is the critic's own instrument with one function added:
`startMutationRecorder`, which does not de-duplicate. Theirs drops a line identical to the one
before it — right for a readable transcript, and wrong for the question "did the region mutate
at all?", which is exactly what the repeated-verdict half of BLOCKER 1 turns on.

## Reproducing it

```bash
SNAP=/tmp/a11yfix; mkdir -p $SNAP
git archive HEAD | tar -x -C $SNAP
ln -s "$PWD/node_modules" $SNAP/node_modules
cp -r gauntlet/receipts/a11y-fix-pg1522/drivers $SNAP/probe

BOW_API_PORT=5680 npx vite build --ssr server/index.ts --outDir dist-server
BOW_API_PORT=5680 BOW_CLASS_STORE=memory \
  BOW_ALLOWED_ORIGIN="http://127.0.0.1:5610,http://localhost:5610,http://127.0.0.1:5680" \
  node dist-server/index.js &
(cd $SNAP && BOW_API_PORT=5680 npx vite --host 127.0.0.1 --port 5610 --strictPort &)

cd $SNAP
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers BOW_API_PORT=5680 BOW_PROBE_LABEL=after \
  npx playwright test --config probe/pw.config.ts --project=desktop probe/
```

**What could not be measured here.** This container has `window.speechSynthesis` and
`getVoices().length === 0` — recorded at the foot of `after-readinghelp.log`. Nothing in these
receipts is evidence that read-aloud is audible or intelligible, on a Chromebook or anywhere
else. What is shown is that the control exists on the screens it should, that a keyboard
reaches it, that focus goes somewhere sensible when it opens and closes, and that the voice is
pointed at the `<main>` landmark. Whether a student can follow it needs a device with a voice
and a person listening.

`revert-check.sh` is the other half: it puts the pre-fix source back in an exported copy and
requires the pinning tests to fail against it. It asserts its own precondition — each file
names a marker the fix introduced, and the script stops rather than reporting a pass if the
marker is still there after the restore, because a revert that silently fails to apply
produces a green run that proves nothing.
