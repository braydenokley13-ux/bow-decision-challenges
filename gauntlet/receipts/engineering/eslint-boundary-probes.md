# ESLint boundary probes — reproduction

All run inside the clean snapshot of 074ec2f (never in the repo working tree).
Probe files were created, linted, and deleted.

## Probe 1 — finance imports a world, one level deep  → CAUGHT (correct)

    src/domain/finance/probe2.ts
    import { POP_UP_NUMBERS } from "../scenario/worlds/food-truck/numbers";

    error  '../scenario/worlds/food-truck/numbers' import is restricted ...  no-restricted-imports

## Probe 2 — finance imports a world, two levels deep  → CAUGHT (correct)

    src/domain/finance/sub/probe.ts
    import { POP_UP_NUMBERS } from "../../scenario/worlds/food-truck/numbers";

    error  '../../scenario/worlds/food-truck/numbers' import is restricted ...  no-restricted-imports

## Probe 3 — finance imports a world, THREE levels deep  → NOT CAUGHT

    src/domain/finance/a/b/probe.ts
    import { POP_UP_NUMBERS } from "../../../scenario/worlds/food-truck/numbers";
    import { useState } from "react";                      // <- control

    error  'react' import is restricted ...  no-restricted-imports      (control fired)
    (no error for the worlds import)

The control proves ESLint linted the file. eslint.config.js lists only
`../scenario/worlds/**` and `../../scenario/worlds/**`; a third `../` escapes.
The sibling `src/domain/**` block carries a comment saying this exact bug was
fixed there by making the patterns depth-independent. The finance block was not.

## Probe 4 — finance reaches every world through the registry  → NOT CAUGHT

    src/domain/finance/probe3.ts
    import { numbersFor } from "../scenario/registry";
    export const z = numbersFor("food-truck");

    (clean — exit 0)

`registry.ts` value-imports BASKETBALL_SCENARIO and POP_UP_SCENARIO. The rule blocks the
direct path only. `numbersFor("food-truck")` additionally returns Basketball's numbers via
the `?? SCENARIO_NUMBERS` fallback, silently.

## Probe 5 — finance imports the view layer  → NOT CAUGHT

    src/domain/finance/probeview.ts
    import { CHOICE_ORDER } from "../../components/financial/choices";
    import { TERMS } from "../../educator/labels";

    (clean — exit 0)

ESLint *replaces* rule options across config blocks, it does not merge them. The
`files: ["src/domain/finance/**/*.ts"]` block redefines `no-restricted-imports` and omits
the `**/components/**`, `**/stages/**`, `**/educator/**`, `**/app/**` groups that the
`src/domain/**` block declares. The `src/domain/competency/**` block re-lists them; the
finance block does not. 8 non-test files are outside the purity rule ARCHITECTURE.md
claims covers all of `src/domain/`.

No live violation exists today — this is a latent hole, not a crossing.
