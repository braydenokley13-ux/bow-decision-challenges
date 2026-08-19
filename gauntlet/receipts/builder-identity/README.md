# Judge 5's conditions 3, 5, 6 and 8, closed

Everything here was executed. Nothing in this directory is a description of a run that did not
happen.

| file | what it is |
| --- | --- |
| `before.txt` | the four findings, reproduced at `f1be2e3` before a line changed, plus the measurement the payload cap is set from |
| `repro-before.sh`, `flood-before.sh` | the scripts that produced the conditions 5, 3 and 6 halves of it |
| `removal-proof.sh`, `removal-proof.txt` | every fix removed one at a time, with the test going red each time |
| `revert-cors.py`, `revert-address.py` | the two reverts the proof script drives that are too long to inline |
| `http-proof.sh`, `http-proof.txt` | the fixed service over HTTP: the same requests judge 5 sent, answered differently |

## Why the removal proof asserts its own precondition

A revert that silently did not apply produces a passing test and a false receipt, and that has
happened twice in this repository. So each step in `removal-proof.sh`:

1. greps for the rule it is about to remove and **aborts** if it is not there,
2. applies the revert,
3. greps again and **aborts** if the file did not change,
4. runs the test,
5. restores from a snapshot taken before anything was touched, and checks it matches.

`set -uo pipefail`, a snapshot per file, and a trap that restores on any exit.

## The one that matters most

Condition 8's proof re-adds judge 5's own tenth route — the one that answered an unauthenticated
`GET /api/classes/:code/everything` with every child's name, their join-code hashes and the class's
teacher key. The receipt shows what they showed: `tsc -b` green, `eslint server/` green, and the
pre-existing identity suite 37/37 green. What is new is the line under it.

```
==================== C8  add back the review's tenth route, exactly as they wrote it ====================
  npx tsc -b         -> 0 complaint(s) about server/identity.ts
  npx eslint server/ -> exit 0 (green)
  the old suite:  Tests  37 passed (37)
and the boundary test:
     × holds no route branch outside the table
AssertionError: expected [ 'request.method ===' ] to deeply equal []
```
