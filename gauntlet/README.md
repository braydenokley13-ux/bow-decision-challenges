# The gauntlet workbench

Everything in this directory is evidence about the product in the directory above it. None of
it is the product. It is here because a claim nobody can check is not a claim, and because the
next person to work on this should be able to find out what was already tried and rejected
without asking.

**The rule the whole thing runs under:** *the status file is not evidence; the running artifact
is evidence.* Every critique in here was written by a reader with fresh context who was given
the goal, the bar and the running product — not the builder's reasoning — and was told they
were allowed to reject. Every finding was reproduced by the person who filed it.

## What is where

| | |
| --- | --- |
| `GAUNTLET_STATUS.md` | The running log of rounds: who was sent at what, what they said, what closed. Read it for the shape of the run, not for the truth about the product. |
| `DEFECTS.md` | Every reproduced defect, grouped by the round that found it, with its state. §N is what the lead found by using the product between rounds. |
| `critiques/` | The reports themselves, 29 of them. `recon-*` is the first sweep; the rest are named for what they attacked. Each carries its own method, its own receipts and its own verdict. |
| `research/` | Eight reports establishing the external bar — what NGPF, iCivics, Khan Academy, state assessment instruments and good consumer software actually do — written before anything was built against them. |
| `receipts/` | 857 screenshots and transcripts. Named by the finding they belong to, so a claim in a critique can be checked against the thing that was on the screen. |
| `decisions/` | Things that were deliberately **not** built, and why. A gauntlet that only records what was done is a sales document. |
| `judges/BRIEFS.md` | The six final verdicts and the rules they run under, written down **before** they were run so nobody could tune the question to the answer. |
| `ACCOUNTS.md` · `ASSESSMENT.md` · `D26_ANSWERS.md` | The three things a district asks about, answered from the running product with the gaps stated as gaps. |

## The two disciplines worth stealing

**Do not let the builder grade itself.** A fix marked closed by the agent that wrote it is not
evidence of anything. Every "closed" in `DEFECTS.md` names who verified it and whether they were
the person who fixed it.

**Do not preserve bad work because it exists.** Several tests in this repository encoded rules
that turned out to be wrong — a savings line nobody touched read as a decision, a signed-out
browser forgetting whose work it held, a mapping claiming full coverage of an objective the
product covers in part. Each was proved wrong, the product was fixed, the test was corrected,
and the reason it changed was written into the test file rather than into a commit message
nobody will read again.

## What this cost, honestly

The receipts are 154MB and the repository is packed at 187MB because of them. That is the price
of being able to check a claim eighteen hours later, and it is a real cost to anyone cloning
this. Whether to keep them all at the end of the run is a decision for the person who owns the
repository, not for the run.
