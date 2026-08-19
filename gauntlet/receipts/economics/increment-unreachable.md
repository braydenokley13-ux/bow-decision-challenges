# The opening plan cannot be balanced with the − / + keys (Run the Pop-Up)

Observed in Chromium at http://127.0.0.1:5603, Middle Row, both conditional amounts left out.
`planIncrement` is $50. `cashToPlan(middle-row)` is $1,900 − ($150 + $240) = **$1,510**, which is
not a multiple of 50 (1510 mod 50 = 10).

Every line's stepper snaps to the 50-grid *before* clamping to the ceiling
(`AllocationControl.tsx`: `Math.min(max, Math.max(0, Math.round(parsed / step) * step))`), so the
only non-multiple-of-50 value any line can hold is exactly the ceiling — which is the whole
$1,510, leaving the other two at $0.

Transcript:

    after 31 × +50 on Stock: stock= $1,510 | to plan $1,510 | placed $1,510 | still to place $0
    after one − on Stock   : stock= $1,450 | to plan $1,510 | placed $1,450 | still to place $60
    after one + on Cushion : cushion= $50  | to plan $1,510 | placed $1,500 | still to place $10

$10 can never be placed. Sums of multiples of 50 are multiples of 50.

Consequence: with the steppers alone the ONLY balanced opening plan is "all of the money on one
line". Any genuine three-way split needs the "Send the rest to one line" closer card.

All twelve (booth × conditional) openings are off-increment:

    back-lane    1660 (r10)  1920 (r20)  1810 (r10)  2070 (r20)
    middle-row   1510 (r10)  1770 (r20)  1660 (r10)  1920 (r20)
    bridge-gate  1270 (r20)  1530 (r30)  1420 (r20)  1680 (r30)

The board's own scaffold — shown after refused saves and logged as support used against the
student — reads "Move money with − and + until nothing is left over."
(`scenario.ts` → `screens.plan.help.steps`). That instruction cannot be followed for any split
plan in any configuration of this world.

Screenshots: increment-impossible.png, increment-snapback.png
