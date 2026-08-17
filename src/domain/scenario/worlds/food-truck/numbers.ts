import { dollars } from "../../../core/money";
import type { PopUpNumbers } from "./types";

/**
 * Run the Pop-Up's economy, in one place.
 *
 * The three spots are the shape of the whole world: the back lane is cheap and the crowd is
 * thin, the bridge gate is dear and the crowd is bigger than one person can serve. Neither
 * is the right answer, and `balance.ts` sweeps the strategy space to prove it — including
 * the last Saturday, which is the only one where the friend on the window pays for herself.
 *
 * The crowd figures are deliberately not multiples of a tray. A supplier who sells by the
 * tray and a crowd that does not divide by ten is what makes "how much do I cook" a real
 * question: matching the crowd exactly is usually impossible, so a student is always
 * choosing between plates they could have sold and plates that go in the bin.
 */
export const POP_UP_NUMBERS: PopUpNumbers = {
  version: "popup-numbers-1",
  saturdays: 4,
  breakdownSaturday: 3,
  startCash: dollars(1900),
  permit: dollars(150),
  spots: {
    "back-lane": { id: "back-lane", booth: dollars(90), crowd: 22, lastCrowd: 34 },
    "middle-row": { id: "middle-row", booth: dollars(240), crowd: 38, lastCrowd: 57 },
    "bridge-gate": { id: "bridge-gate", booth: dollars(480), crowd: 54, lastCrowd: 82 },
  },
  platesPerTray: 10,
  trayCost: dollars(60),
  platePrice: dollars(12),
  soloServeCap: 45,
  helperServeCap: 80,
  helperCost: dollars(70),
  catering: { amount: dollars(260) },
  rebate: { amount: dollars(150), minimumPlates: 20 },
  generator: { replacement: dollars(420), deposit: dollars(150) },
  planIncrement: 50,
  repairIncrement: 10,
};
