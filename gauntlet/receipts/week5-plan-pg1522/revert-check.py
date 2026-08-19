#!/usr/bin/env python3
"""Every fix in this folder, proved by removing it.

    python3 gauntlet/receipts/week5-plan-pg1522/revert-check.py

For each defect: put the shipped code back, assert that it really is back, run the test that
pins the fix, and restore. A test that passes against the reverted code is reported as a
FAILURE of the check — it means the test does not actually hold the fix down.

**Every step asserts its own precondition.** A revert whose match silently found nothing
leaves the fix in place and produces a green run that proves nothing, which is the one way
this kind of evidence lies. If a `PRECONDITION FAILED` appears here, the check stopped and
told you rather than reporting a pass — that is the point of it.

The fifth fix in this folder, the 320px reflow of the Week 5 board, needs a browser and a
server, so it is proved separately and not from here. Serve a tree, put `src/design/scenes.css`
back to the commit before `.choice-row__action`'s wrap rules, and run

    BOW_E2E_APP_PORT=<app> BOW_API_PORT=<api> \
      CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
      npx playwright test e2e/week5Reflow.spec.ts --project=chromium-1366

which fails on the document scrolling sideways at 320px and passes with the rules back. The
before and after of that screen are `{before,after}-M14-w320-triage.png` beside this file.
"""
import io
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
STAGE = ROOT / "src/stages/StudentChallenge.tsx"
REDUCER = ROOT / "src/domain/machine/reducer.ts"
POPUP = ROOT / "src/stages/popup/PopUpScreens.tsx"


def require(condition: bool, why: str) -> None:
    if not condition:
        raise SystemExit(f"PRECONDITION FAILED: {why}")


def swap(text: str, now: str, then: str, what: str) -> str:
    require(now in text, f"{what} is not the fixed version — nothing to revert")
    return text.replace(now, then, 1)


def cut(text: str, start: str, end: str, keep: str, what: str) -> str:
    """Remove from `start` up to the `end` anchor, putting back the `keep` tail of it.

    The anchor carries the line that follows the block precisely so the cut lands in one
    place: the first bare `)}` after a JSX block belongs to something nested inside it, and a
    revert that cuts there produces a file that does not parse. A file that does not parse
    fails every test in it for a reason that has nothing to do with the fix — which reads as
    proof and is not.
    """
    at = text.find(start)
    require(at >= 0, f"{what} is not in the file")
    stop = text.index(end, at) + len(end)
    return text[:at] + keep + text[stop:]


def run(test: str) -> bool:
    """True when the test ran and failed, which is what proving by removal wants.

    A non-zero exit is not enough. A revert that leaves the file unparseable exits non-zero
    with `no tests` and nothing measured, and counting that as proof is how a proof-by-removal
    certifies a fix nothing is holding down. So the run has to have produced failing tests.
    """
    result = subprocess.run(["npx", "vitest", "run", test], cwd=ROOT, capture_output=True, text=True)
    tail = re.sub(r"\n{3,}", "\n", result.stdout)[-900:]
    print(tail)
    counted = re.search(r"Tests\s+(\d+) failed", result.stdout)
    if not counted:
        print("NOTHING RAN: the reverted tree did not produce a test result — the revert broke the file")
        return False
    return result.returncode != 0 and int(counted.group(1)) > 0


def check(name: str, files: dict[Path, str], test: str, after: dict[Path, str]) -> bool:
    print(f"\n=== {name} ===")
    for path, reverted in after.items():
        io.open(path, "w", encoding="utf-8").write(reverted)
        require(io.open(path, encoding="utf-8").read() == reverted, f"the revert of {path.name} is not on disk")
    print(f"reverted: {', '.join(path.name for path in after)}")
    try:
        failed = run(test)
    finally:
        for path, original in files.items():
            io.open(path, "w", encoding="utf-8").write(original)
            require(io.open(path, encoding="utf-8").read() == original, f"{path.name} was not restored")
    print(f"{'PROVED' if failed else 'NOT PROVED'}: {test} {'fails' if failed else 'PASSES'} against the shipped code")
    return failed


def main() -> int:
    stage = io.open(STAGE, encoding="utf-8").read()
    reducer = io.open(REDUCER, encoding="utf-8").read()
    popup = io.open(POPUP, encoding="utf-8").read()
    proved = []

    # D1 — the Week 5 draft seeded from the safety check while the screen drew the saved plan.
    old_reducer = swap(
        reducer,
        "  return carriedAmountsFor(state, mode) ?? EMPTY_AMOUNTS;",
        '  if (mode === "fallback") return state.drafts.working ?? EMPTY_AMOUNTS;\n'
        '  if (mode === "week5-first-response") return state.drafts.fallback ?? state.drafts.working ?? EMPTY_AMOUNTS;\n'
        '  if (mode === "final") return state.drafts["week5-first-response"] ?? state.drafts.working ?? EMPTY_AMOUNTS;\n'
        '  if (mode === "remaining-risk") return state.drafts.final ?? EMPTY_AMOUNTS;\n'
        "  return EMPTY_AMOUNTS;",
        "defaultAmountsFor",
    )
    require("state.drafts.fallback ?? state.drafts.working" in old_reducer, "the old Week 5 seed is not in the reverted text")
    proved.append(check("D1 · Week 5 runs on the plan the student saved", {REDUCER: reducer},
                        "src/domain/machine/week5PlanIdentity.test.ts", {REDUCER: old_reducer}))

    # D2 — the opening ranking with no ladder behind it.
    without_ladder = cut(stage, "          {/* The ladder every other gated question in the product has",
                         "          )}\n        </>", "        </>", "the ranking ladder")
    without_ladder = swap(
        without_ladder,
        "  const ranked = state.setupRanking?.correct === true || (supplied && !showingAnswer);",
        "  const ranked = state.setupRanking?.correct === true;",
        "the ranked line",
    )
    require("Show me one step" not in without_ladder.split("function WorkingStage")[0], "a rung is still on the ranking screen")
    proved.append(check("D2 · a way out of the first screen of the world", {STAGE: stage},
                        "src/stages/setupLadder.test.tsx", {STAGE: without_ladder}))

    # D3 — the colour that answered the question, and the supply that showed nothing.
    coloured = swap(stage, "data-line={change.kind}", "data-kind={change.kind}", "the card attribute")
    coloured = swap(
        coloured,
        '            onCorrect={() => { if (!handedOver.current) dispatch({ type: "GO_TO_STAGE", stage: "first-response" }); }}',
        '            onCorrect={() => dispatch({ type: "GO_TO_STAGE", stage: "first-response" })}',
        "onCorrect",
    )
    coloured = cut(coloured, '          {revealed && (\n            <div className="stage-action"',
                   "          )}\n        </div>", "        </div>", "the reveal panel")
    coloured = swap(coloured, "{revealed && movedIds.has(change.id) && <small>Week 5 changed this</small>}", "", "the on-card mark")
    require("Week 5 changed this" not in coloured, "the reveal wording is still in the file")
    css = io.open(ROOT / "src/design/app.css", encoding="utf-8").read()
    require('.gap-tiles button[data-kind="bill"]' in css, "app.css no longer paints data-kind, so this revert proves nothing")
    proved.append(check("D3 · the Week 5 cards, and the answer supply", {STAGE: stage},
                        "src/stages/week5Comprehension.test.tsx", {STAGE: coloured}))

    # D5 — the market's own gate: forty characters and a sentence saying so.
    by_length = swap(
        popup,
        "  const gate = checkWriting({\n"
        "    chosen: selected.flatMap((id) => {\n"
        "      const tile = tiles.find((entry) => entry.id === id);\n"
        "      return tile ? [{ label: tile.label, value: tile.value }] : [];\n"
        "    }),\n"
        "    text,\n"
        "    // The night was the student's to run, so the figures on it are theirs rather than Mo's.\n"
        '    whose: "your",\n'
        "  });",
        "  const enough = selected.length >= 2 && selected.length <= 3 && text.trim().length >= 40;\n"
        "  const stillToPick = Math.max(0, 2 - selected.length);",
        "the market's gate",
    )
    by_length = swap(
        by_length,
        '            <div className="writing-rules" aria-live="polite">\n'
        "              {gate.rules.map((rule) => (\n"
        "                <p key={rule.id} data-met={rule.met}>\n"
        '                  <span aria-hidden="true">{rule.met ? "✓" : "◦"}</span> {rule.said}\n'
        "                </p>\n"
        "              ))}\n"
        "            </div>\n"
        '            <Button type="button" aria-disabled={!gate.ready} onClick={() => gate.ready && dispatch({ type: "POPUP_WRITEUP_SUBMITTED", tileIds: selected, text })}>',
        '            <p aria-live="polite">\n'
        "              {stillToPick > 0 ? `${stillToPick} ${stillToPick === 1 ? COPY.writeUp.pickMoreOne : COPY.writeUp.pickMore} ` : `${COPY.writeUp.ready} `}\n"
        "              {text.trim().length < 40 ? COPY.writeUp.write : COPY.writeUp.longEnough}\n"
        "            </p>\n"
        '            <Button type="button" aria-disabled={!enough} onClick={() => enough && dispatch({ type: "POPUP_WRITEUP_SUBMITTED", tileIds: selected, text })}>',
        "the market's rules block",
    )
    by_length = swap(by_length, "current.length < NUMBERS_WANTED.max ? [...current, id] : current);",
                     "current.length < 3 ? [...current, id] : current);", "the tile cap")
    require("text.trim().length >= 40" in by_length, "the length gate is not back")
    proved.append(check("D5 · one writing gate for both stories", {POPUP: popup},
                        "src/stages/popup/writeUpGate.test.tsx", {POPUP: by_length}))

    print("\n" + ("all four fixes are held down by a test that fails without them"
                  if all(proved) else "SOMETHING IS NOT PROVED — see above"))
    return 0 if all(proved) else 1


if __name__ == "__main__":
    sys.exit(main())
