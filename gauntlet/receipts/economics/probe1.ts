import { POP_UP_NUMBERS as N } from "../../../src/domain/scenario/worlds/food-truck/numbers";
import { crowdOn, crowdTold, sellCap, serveCap, owedUpFront, cashToPlan, swapBill } from "../../../src/domain/scenario/worlds/food-truck/economy";
import type { SpotId, SaturdayNumber } from "../../../src/domain/scenario/worlds/food-truck/types";

const spots: SpotId[] = ["back-lane", "middle-row", "bridge-gate"];
const sats: SaturdayNumber[] = [1, 2, 3, 4];

console.log("### PRODUCT NUMBERS (food truck)");
console.log("startCash", N.startCash, "permit", N.permit, "tray", N.trayCost, "plate", N.platePrice, "perTray", N.platesPerTray);
console.log("solo", N.soloServeCap, "helper", N.helperServeCap, "helperCost", N.helperCost);
console.log("catering", N.catering.amount, "rebate", N.rebate.amount, "min", N.rebate.minimumPlates);
console.log("gen", N.generator.replacement, "dep", N.generator.deposit, "bill", swapBill(N));
console.log("planIncrement", N.planIncrement, "repairIncrement", N.repairIncrement);
console.log();
console.log("spot | booth | owedUpFront | cashToPlan | cashToPlan mod 50");
for (const s of spots) console.log(s, N.spots[s].booth, owedUpFront(N, s), cashToPlan(N, s), cashToPlan(N, s) % 50);
console.log();
console.log("crowdOn / sellCap(solo) / sellCap(helper on sat4)");
for (const s of spots) {
  const row = sats.map((d) => `S${d}: crowd=${crowdOn(N, s, d)} capSolo=${sellCap(N, s, d, false)} capHelp=${sellCap(N, s, d, true)}`);
  console.log(s, "base", N.spots[s].crowd, "|", row.join(" | "));
}
console.log();
console.log("crowdTold sat4:", spots.map((s)=>`${s}=${JSON.stringify(crowdTold(N,s,4))}`).join(" "));
console.log("serveCap sat4 solo/helper:", serveCap(N,4,false), serveCap(N,4,true));
