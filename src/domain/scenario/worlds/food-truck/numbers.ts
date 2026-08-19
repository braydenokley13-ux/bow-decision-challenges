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
    "back-lane": { id: "back-lane", booth: dollars(90), crowd: 22 },
    "middle-row": { id: "middle-row", booth: dollars(240), crowd: 38 },
    "bridge-gate": { id: "bridge-gate", booth: dollars(480), crowd: 54 },
  },
  // Four nights. Three of them the organiser states as a figure and the student reads off the
  // booth card before they take a booth: the wet Saturday that clears fills the market late,
  // the cold one empties it. One standing order covers the middle two, which is the whole of
  // the second Saturday decision — cook for the busy night and bin food on the cold one, or
  // cook for the cold night and turn people away on the busy one.
  //
  // The fireworks are a range. Nobody knows how many come down for fireworks; the organiser
  // says between a tenth up and seven-tenths up on an ordinary Saturday and will not be pinned
  // further, and the night lands at 145. See `told` in `types.ts` for why one night and not
  // four: the market was asking a student to do arithmetic against a printed figure at the one
  // beat the other story asks them to commit money before they know, and the same rubric row
  // reads both. The band is asymmetric on purpose — the middle of it is 140, so a student who
  // splits the difference has not been quietly handed the answer.
  nights: {
    1: { pull: 100 },
    2: { pull: 120 },
    3: { pull: 65 },
    4: { pull: 145, told: { low: 110, high: 170 } },
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
  // The jar, and three claims on it that together want $155. Two ways of spending it reach
  // as far as it goes and no further — the seal on its own, or the cleaner's share and the
  // sign together — and they express opposite priorities. Anything else leaves a dollar in a
  // jar that can do nothing else with it.
  tips: {
    cash: dollars(100),
    claimCosts: { "cool-box": dollars(75), "cleaner-share": dollars(45), "truck-sign": dollars(35) },
  },
  planIncrement: 50,
  repairIncrement: 10,
};
