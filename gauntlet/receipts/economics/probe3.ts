import { POP_UP_NUMBERS as N } from "../../../src/domain/scenario/worlds/food-truck/numbers";
import { enumerateOutcomes } from "../../../src/domain/scenario/worlds/food-truck/balance";
import { crowdTold, serveCap, crowdOn } from "../../../src/domain/scenario/worlds/food-truck/economy";
import type { SpotId } from "../../../src/domain/scenario/worlds/food-truck/types";

const out = enumerateOutcomes(N).filter((o) => o.viable);
let bestMoney = out[0]!, bestBank = out[0]!;
for (const o of out) { if (o.endMoney > bestMoney.endMoney) bestMoney = o; if (o.banked > bestBank.banked) bestBank = o; }
console.log("MAX endMoney:", bestMoney.endMoney, JSON.stringify(bestMoney.strategy), "profit vs startCash:", bestMoney.endMoney - N.startCash);
console.log("MAX banked  :", bestBank.banked, JSON.stringify(bestBank.strategy), "endMoney", bestBank.endMoney, "fed", bestBank.fed);
// distribution of profit
const profits = out.map((o)=>o.endMoney - N.startCash).sort((a,b)=>a-b);
console.log("profit min/median/max:", profits[0], profits[Math.floor(profits.length/2)], profits[profits.length-1]);
console.log("share of viable plans that LOSE money:", (profits.filter((p)=>p<0).length/profits.length*100).toFixed(1)+"%");
console.log("share breaking even or better:", (profits.filter((p)=>p>=0).length/profits.length*100).toFixed(1)+"%");
console.log();

// Does "split the difference" (midpoint of the TOLD band) give the best order?
function nightNet(trays: number, crowd: number, cap: number) {
  return Math.min(trays * N.platesPerTray, Math.min(crowd, cap)) * N.platePrice - trays * N.trayCost;
}
console.log("Saturday 4 band, per booth/helper: does the MIDPOINT order equal the order that was actually best?");
for (const spotId of Object.keys(N.spots) as SpotId[]) {
  for (const helper of [false, true]) {
    const cap = serveCap(N, 4, helper);
    const band = crowdTold(N, spotId, 4);
    const told = { low: Math.min(band.low, cap), high: Math.min(band.high, cap) };
    const realised = Math.min(crowdOn(N, spotId, 4), cap);
    const orders = Array.from({ length: Math.ceil(told.high / N.platesPerTray) + 2 }, (_, t) => t);
    const bestAt = (c: number) => orders.reduce((top, t) => (nightNet(t, c, cap) > nightNet(top, c, cap) ? t : top), 0);
    const mid = Math.round((told.low + told.high) / 2);
    const facesRange = told.high - told.low >= N.platesPerTray;
    console.log(`  ${spotId.padEnd(12)} helper=${String(helper).padEnd(5)} told ${told.low}-${told.high} mid=${mid} lands=${realised} | bestAtMid=${bestAt(mid)} bestAtRealised=${bestAt(realised)} match=${bestAt(mid)===bestAt(realised)} facesRange=${facesRange} netAtMidOrder=$${nightNet(bestAt(mid), realised, cap)} netAtBest=$${nightNet(bestAt(realised), realised, cap)}`);
  }
}
