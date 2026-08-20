# The Saturday 1 dominant order, settled by execution

Three documents in this repository have now asserted the size of the dominant first-Saturday
order, and **all three were wrong**. This is the computed answer, produced by running the
shipped `playSaturday` and `rebateEarned` over every reachable tray count at every booth.

| Booth | sellCap | Best order | Net | Runner-up | **True gap** |
| --- | --- | --- | --- | --- | --- |
| back-lane | 22 | **2 trays** — 20 sold, rebate | **$270** | 3 trays · $84 | **$186** |
| middle-row | 38 | **3 trays** — 30 sold, rebate | **$330** | 2 trays · $270 | **$60** |
| bridge-gate | 45 | **4 trays** — 40 sold, rebate | **$390** | 3 trays · $330 | **$60** |

Full curves, rebate-earning orders starred:

```
back-lane    0t $0   1t $60   2t $270*  3t $84   4t $24   5t -$36
middle-row   0t $0   1t $60   2t $270*  3t $330* 4t $216  5t $156
bridge-gate  0t $0   1t $60   2t $270*  3t $330* 4t $390* 5t $240
```

## What each document got wrong

**`SUPPLIER_WAR_VERDICT.md` (the first war) — "+$186 / +$114 / +$150".** The best orders are
right. The gaps are wrong at two booths, because it compared each best order against the *next
higher* tray count rather than against the actual runner-up. At middle-row it measured 3t
against 4t ($330 − $216 = $114) when the runner-up is 2t at $270, so the real gap is $60. Same
error at bridge-gate.

**The supplier build brief — "reproduces exactly".** It reproduced the earlier verdict's error
by repeating the same comparison, and reported the match as corroboration. Two documents
agreeing is not evidence when the second one derived its answer from the first.

**The Saturday build brief — "none of the three is reachable".** It correctly noticed that
186, 114 and 150 are not multiples of 12 and concluded the figures were fabricated. But it
computed net as `12·sold − 60·trays` and **forgot the $150 rebate exists**, which is exactly
what makes the winning orders non-multiples of 12. Its own replacement table (back-lane 2t
+$120, middle-row 4t +$216, bridge-gate 4-or-5t +$240 tie) is wrong at all three booths, and
bridge-gate is not a tie: 4t is $390 and 5t is $240.

## What is actually true, and what it means for the design rule

**The dominant order is `floor(sellCap / 10)`** — cook the largest whole number of trays you can
sell out, and collect the rebate. That is confirmed: 22→2, 38→3, 45→4. The rule *"round the
crowd down to the nearest ten"* is the answer key, and the ban on drawing order and crowd
against a shared ruler stands.

**But the danger is not uniform, and this is new.** At back-lane, missing it costs $186 out of a
possible $270 — two thirds of the night. At middle-row and bridge-gate it costs $60 out of $330
and $390 — meaningful, and survivable. So a geometric target would be most damaging on the
cheapest booth, which is the one a cautious student is most likely to take.

## The standing lesson

Three consecutive agent analyses stated this arithmetic with confidence and none of them ran it.
Load-bearing numbers get executed, not derived in prose — and a second document agreeing with
the first is corroboration only when it computed independently.
