#!/usr/bin/env python3
"""Put each false sentence back and watch the scan name it.

A fix to a source scan is worth exactly as much as the scan's willingness to fail without it,
and "I ran the test and it passed" proves nothing about a test that would also pass if the
rule were deleted. So each case here reverts one sentence to what it said, runs the scan that
is supposed to catch it, and requires the scan to fail *and to print the offending sentence*.

Every step asserts its own precondition, because the failure mode this guards against is a
revert that silently does not apply: a `replace` that matched nothing leaves the file fixed,
the scan passes, and the run reads as a proof when it proved the opposite. So a case fails if
the file does not contain what it is about to replace, if the replacement is not present
afterwards, if the scan passes while the defect is in the tree, if the scan's output does not
name the sentence, or if the file does not come back exactly as it was.

    python3 gauntlet/receipts/dataclaims-pg1522/prove.py

Exits non-zero if any case does not behave as described. Restores every file it touches,
including on failure.
"""

from __future__ import annotations

import io
import subprocess
import sys
from dataclasses import dataclass

DATA_CLAIMS = "src/educator/dataClaims.test.ts"
SWEEP = "src/platform/dataClaims.sweep.test.ts"


@dataclass
class Case:
    what: str
    path: str
    fixed: str
    broken: str
    scan: str
    names: str


CASES = [
    Case(
        what="the sentence on the student's own screen",
        path="src/content/studentCopy.ts",
        fixed=(
            '    privacy: "That name came from the class list your teacher made, or you wrote it '
            'yourself when you signed in. Your teacher can see it next to your work. BOW never asks '
            'for your email, your birthday, or anything about your real money.",'
        ),
        broken=(
            '    privacy: "The only name here is the one your teacher wrote on their class list. '
            'BOW never asks for your email, your birthday, or anything about your real money.",'
        ),
        scan=DATA_CLAIMS,
        names="The only name here is the one your teacher wrote",
    ),
    Case(
        what="the class-service contract's file head",
        path="src/platform/classes/types.ts",
        fixed=(
            ' * What this comment used to add to that was *"there are no student accounts, no roster, no\n'
            ' * names and no email addresses"*, and by the time anybody read it back all four clauses were\n'
            ' * false.'
        ),
        broken=" * There are no student accounts, no roster, no names and no email addresses.",
        scan=SWEEP,
        names="no student accounts",
    ),
    Case(
        what="the identity contract's file head",
        path="src/platform/identity/types.ts",
        fixed=' * only the first: *"the only name in the system is one a teacher typed"*.',
        broken=" * only the first, so the only name in the system is one a teacher typed.",
        scan=SWEEP,
        names="the only name in",
    ),
    Case(
        # The register is the part most likely to rot into a silent skip, so it is proved the
        # same way: take the row out and the sweep has to name the sentence it was covering.
        what="the App.tsx row in the sweep's own register",
        path=SWEEP,
        fixed='''  {
    path: "src/App.tsx",
    sentence: "Nothing here asks for a name, an email address or a birthday",''',
        broken='''  {
    path: "src/App.tsx",
    sentence: "a sentence that is not in App.tsx",''',
        scan=SWEEP,
        names="Nothing here asks for a name",
    ),
]


def read(path: str) -> str:
    return io.open(path, encoding="utf-8").read()


def write(path: str, text: str) -> None:
    io.open(path, "w", encoding="utf-8").write(text)


def run_scan(path: str) -> tuple[int, str]:
    done = subprocess.run(
        ["npx", "vitest", "run", path],
        capture_output=True, text=True, timeout=900,
    )
    return done.returncode, done.stdout + done.stderr


def prove(case: Case) -> list[str]:
    """One case. Returns the failures it found, empty if it behaved as described."""
    problems: list[str] = []
    original = read(case.path)

    if case.fixed not in original:
        return [f"{case.path}: the fixed text is not in the file, so there is nothing to revert. "
                f"The receipt is out of date with the source — re-anchor it before trusting it."]
    if case.broken in original:
        return [f"{case.path}: the broken text is already in the file. The fix is not applied."]

    try:
        write(case.path, original.replace(case.fixed, case.broken, 1))

        after = read(case.path)
        if case.broken not in after:
            return [f"{case.path}: the revert did not apply. A scan run now would prove nothing."]
        if case.fixed in after:
            return [f"{case.path}: the fixed text survived the revert, so both readings are in the tree."]

        code, output = run_scan(case.scan)
        if code == 0:
            problems.append(
                f"{case.scan} PASSED with the defect back in {case.path}. "
                f"The scan does not catch the sentence it is supposed to catch."
            )
        if case.names not in output:
            problems.append(
                f"{case.scan} failed but never printed {case.names!r}. "
                f"A failure that does not name the sentence does not tell anybody what to fix."
            )
    finally:
        write(case.path, original)

    if read(case.path) != original:
        problems.append(f"{case.path}: not restored. Check `git diff` before doing anything else.")
    else:
        code, _ = run_scan(case.scan)
        if code != 0:
            problems.append(f"{case.scan} still fails with {case.path} restored — something else is broken.")

    return problems


def main() -> int:
    failures: list[str] = []
    for case in CASES:
        print(f"→ {case.what} ({case.path})", flush=True)
        problems = prove(case)
        for problem in problems:
            print(f"  FAIL {problem}", flush=True)
        if not problems:
            print(f"  ok   {case.scan} fails on the revert and names it; passes once restored", flush=True)
        failures.extend(problems)

    print()
    if failures:
        print(f"{len(failures)} problem(s). The scans do not prove what this receipt claims.")
        return 1
    print(f"All {len(CASES)} cases proved: every fixed sentence is one a scan would fail on.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
