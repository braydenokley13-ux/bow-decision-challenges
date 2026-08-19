# Run the Pop-Up — the student red team's findings, before and after

Every shot is a real Chromium at 1366×768, driven through `/join` with a real class code and a
real seat card, against the app on a Vite dev server with the class service on the memory
store. Nothing is seeded; the runs below are played from the first screen.

## The run

Clever Cam's, reconstructed from the figures on his screenshot and reproduced exactly: Bridge
Gate, no conditional money counted, an opening plan of **$770 stock / $300 cushion / $200 your
cut** — closed with the "send the rest to Stock" card, which is how he reached $770 — four
trays on Saturday 1, Marisol booked, four trays a night for Saturdays 2 and 3, and the whole
$270 generator bill taken off the cushion.

## M10 · the dead end, and the two sentences over it

| | |
|---|---|
| `deadend-before-01-saturday-4-no-way-out.png` | Saturday 4. Stock **$50**, cushion **$110**, your cut **$200**, a crowd of **78** — the biggest night of the market — and a stepper reading **0** that the `+` key will not move. *"0 is all your stock line pays for."* Nothing on the screen can reach the $310 in the other two lines. This is the shot after pressing `+`. |
| `deadend-before-02-ending-says-paid-off.png` | The ending on that run. **PAID OFF — Where the swap money came from — "$270 off the Cushion. The last Saturday ran and took $0."** and **PAID OFF — What you cooked**, over a market that opened the biggest night with an empty truck. |
| `deadend-after-04-warned-before-the-state.png` | The standing order, three screens earlier, now saying what the order leaves: **LEFT ON THE STOCK LINE — $50 · 0 trays**, in the alert colour. The state is foreseeable before it is entered. |
| `deadend-after-01-saturday-4-asks-which-line-pays.png` | The same Saturday 4. *"The order comes off the stock line. If you want more trays than it pays for, say which line pays the rest."* — **Only the stock line · Cushion $110 · Your cut $200** — and, because this run cannot buy a single tray, *"Your stock line will not pay for a whole tray. Nothing says the rest of your money cannot buy food — but every dollar you move here is a dollar you do not end the run with."* |
| `deadend-after-02-the-way-out-taken.png` | Taken. Four trays, and the control says where the money is: *"$50 off the stock line and $190 off your cut."* |
| `deadend-after-03-ending-tells-the-truth.png` | The ending on the run that took no way out. **COST YOU — Where the swap money came from — "$270 off the cushion, and the generator went in the truck. The stock line had $50 on it by then, so Saturday 4 cooked nothing and took $0 on the biggest crowd of the run."** and **FELL SHORT — What you cooked — "…and on Saturday 4 the truck opened with nothing on it while 78 people would have bought a plate."** |
| `deadend-after-05-ending-after-the-way-out.png` | The ending on the run that took it. The last Saturday took **$480**, and **FELL SHORT — Your cut — "You set $200 aside and $190 went back into the run. You banked $10."** The exit is not free and the ending says what it cost. |

The optimality sentence Cam was shown — *"No other standing order beats it on these four
crowds"* — is not in `deadend-before-02` because the copy had already been split at `1bdd8e6`;
this run's spoilage sends it down the other branch. The claim itself was still live on runs
that binned nothing, still computed from one tray either side, and
`resolution.test.ts` now holds it: swept by hand across three booths and every stock line the
board can hold, it was printed 2,887 times and was **false 48 times**.

## M2 · the answer printed on the screen that asks for it

| | |
|---|---|
| `answer-before-01-stepper-prints-the-total.png` | Saturday 1. **$240** on the stepper, 80 pixels above *"WHAT THE ORDER COSTS … TOTAL $___"*. |
| `answer-after-01-no-total-while-the-box-asks.png` | The same screen. The stepper shows the trays, what one tray costs and holds, and what the crowd will buy. No total, and no leftover either — the stock line is on the same screen, so a leftover would hand over the same subtraction. |
| `answer-after-02-total-once-they-worked-it-out.png` | After the student answers: the total, and what the order leaves. |
