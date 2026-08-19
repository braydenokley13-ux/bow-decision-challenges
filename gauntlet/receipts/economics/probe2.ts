import { POP_UP_NUMBERS as N } from "../../../src/domain/scenario/worlds/food-truck/numbers";
import { analyseBalance, analyseLastSaturdayRange, formatBalanceReport, formatRangeReport } from "../../../src/domain/scenario/worlds/food-truck/balance";
console.log(formatBalanceReport(analyseBalance(N)));
console.log();
console.log("================ RANGE ================");
console.log(formatRangeReport(analyseLastSaturdayRange(N)));
