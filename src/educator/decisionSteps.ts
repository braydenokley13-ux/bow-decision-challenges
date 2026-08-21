import { formatDollars, dollars } from "../domain/core/money";
import { planMovements } from "../domain/finance/formulas";
import { SCENARIO_NUMBERS } from "../domain/scenario/numbers";
import { BASKETBALL_SCENARIO } from "../domain/scenario/worlds/basketball";
import { POP_UP_SCENARIO } from "../domain/scenario/worlds/food-truck";
import { POP_UP_NUMBERS } from "../domain/scenario/worlds/food-truck/numbers";
import { derivePopUpFacts } from "../domain/scenario/worlds/food-truck/facts";
import { CHOICE_LABELS } from "../components/financial/choices";
import type { StudentRow } from "./analysis";

/**
 * What this student actually did, in six steps a person can read aloud.
 *
 * The gap this fills is the one nothing else on the page filled. A teacher opening a
 * student could read BOW's judgement of ten things the work had to show, or they could
 * unroll thirty-four log entries; there was nothing in between, and "what did this child
 * decide?" is the question a teacher asks first and answers to a parent.
 *
 * Every line below is read off the student's own events. Nothing here is generated, nothing
 * is inferred from a level, and a step the run never reached says so in its own words rather
 * than being dropped or filled in — an account with a silent hole in it is worse than a
 * shorter one, because the reader cannot tell which they are looking at.
 *
 * The compression is only honest because the full record stays one disclosure away on the
 * same page: the opening figures as a fact row, and every event in order.
 */

export interface DecisionStep {
  /** What this step of the run was about, in four or five words. */
  label: string;
  /** What this student did about it. A sentence, in the story's own nouns. */
  what: string;
}

const NOT_REACHED = "The run never got this far, so there is nothing to read here.";

/** The six steps, in the order the student met them, for whichever story they played. */
export function decisionStepsFor(row: StudentRow): DecisionStep[] {
  return row.worldId === "food-truck" ? marketSteps(row) : seasonSteps(row);
}

function seasonSteps(row: StudentRow): DecisionStep[] {
  const setup = BASKETBALL_SCENARIO.setups.find((entry) => entry.id === row.setupId);
  const cost = row.setupId ? SCENARIO_NUMBERS.setupCosts[row.setupId] : null;
  const shock = row.setupId
    ? dollars(SCENARIO_NUMBERS.requiredWeek5Cost + SCENARIO_NUMBERS.setupEventCosts[row.setupId])
    : SCENARIO_NUMBERS.requiredWeek5Cost;
  const income = [
    row.countedShowcase === null ? null : row.countedShowcase
      ? `counted the ${BASKETBALL_SCENARIO.incomeCopy.outcome.label} from the start`
      : `left the ${BASKETBALL_SCENARIO.incomeCopy.outcome.label} out of the opening plan`,
    row.countedBonusInPlan === null ? null : row.countedBonusInPlan
      ? `built the final plan around the ${BASKETBALL_SCENARIO.incomeCopy.completion.label}`
      : `planned without the ${BASKETBALL_SCENARIO.incomeCopy.completion.label}`,
  ].filter((entry): entry is string => entry !== null);

  return [
    {
      label: "Where Avery lives",
      what: setup && cost !== null
        ? `${setup.title} — ${formatDollars(cost)} across the eight weeks.`
        : "No place was ever chosen.",
    },
    {
      label: "Which money they planned on",
      what: income.length > 0
        ? `They ${income.join(", and ")}.`
        : "Neither conditional payment was ever decided.",
    },
    {
      label: "The plan they committed",
      what: row.opening
        ? `${CHOICE_LABELS.goal} ${formatDollars(row.opening.goal)} · ${CHOICE_LABELS.reserve} ${formatDollars(row.opening.reserve)} · ${CHOICE_LABELS.flexibleCash} ${formatDollars(row.opening.flexibleCash)}.`
        : "No opening plan was ever saved.",
    },
    {
      label: "The trade-off mid-season",
      what: row.reservedSeat === null && row.tookClinics === null
        ? NOT_REACHED
        : [
          row.reservedSeat === null
            ? null
            : row.reservedSeat
              ? `Reserved the course seat at Week ${SCENARIO_NUMBERS.course.depositDeadlineWeek} for ${formatDollars(SCENARIO_NUMBERS.course.depositPrice)}`
              : `Waited on the course and left ${formatDollars(SCENARIO_NUMBERS.course.fullPrice)} to find later`,
          row.tookClinics === null ? null : row.tookClinics ? "took the paid Saturdays" : "kept the Saturdays free",
        ].filter((entry): entry is string => entry !== null).join(", and ") + ".",
    },
    {
      label: `What Week ${SCENARIO_NUMBERS.disruptionWeek} cost them`,
      what: row.final
        ? `${formatDollars(shock)} had to come from somewhere in the plan.`
        : `${formatDollars(shock)} landed, and no plan came back from it.`,
    },
    {
      label: "What they moved to cover it",
      what: whatMovedLine(row),
    },
  ];
}

/** The rows the student themselves took money off, read from the split the page already trusts. */
function whatMovedLine(row: StudentRow): string {
  if (!row.opening || !row.final) return NOT_REACHED;
  const moved = planMovements(row.opening, row.final, { depositTaken: row.reservedSeat === true }, SCENARIO_NUMBERS)
    .filter((movement) => movement.chosenReduction > 0);
  if (moved.length === 0) {
    return "Nothing was taken off any line: the plan they finished with is the plan they started with.";
  }
  const said = moved.map((movement) => `${formatDollars(movement.chosenReduction)} off ${CHOICE_LABELS[movement.category].toLowerCase()}`);
  // "Everything covered" is a claim about the *plan's* balance and about nothing else, and
  // said on its own it read as the whole outcome — three thousand pixels above a fact row
  // saying the course was $950 short, on the student the demonstration turns on
  // (`DEFECTS.md` D24). So the clause names its own subject.
  const ending = row.resolution
    ? row.resolution.uncovered > 0
      ? ` They finished with ${formatDollars(row.resolution.uncovered)} of the plan still uncovered.`
      : " Every line of the plan was covered."
    : "";
  return `They cut ${said.join(", ")}.${ending}`;
}

function marketSteps(row: StudentRow): DecisionStep[] {
  const facts = derivePopUpFacts(row.log);
  const spot = POP_UP_SCENARIO.spots.find((entry) => entry.id === facts.spotId);
  const booth = facts.spotId ? POP_UP_NUMBERS.spots[facts.spotId].booth : null;
  const counted = [
    facts.counted.catering ? `the catering job (${formatDollars(POP_UP_NUMBERS.catering.amount)})` : null,
    facts.counted.rebate ? `the sell-out rebate (${formatDollars(POP_UP_NUMBERS.rebate.amount)})` : null,
  ].filter((entry): entry is string => entry !== null);
  const opening = facts.opening.plan;
  const repair = facts.repair.plan;

  return [
    {
      label: "Which booth they took",
      what: spot && booth !== null
        ? `${spot.title} — ${formatDollars(booth)} for the four Saturdays.`
        : "No booth was ever taken.",
    },
    {
      label: "Which money they planned on",
      what: counted.length > 0
        ? `They counted ${counted.join(" and ")} before either had arrived.`
        : "They counted neither conditional payment, and planned on the money already in hand.",
    },
    {
      label: "The plan they committed",
      what: opening
        ? `Stock ${formatDollars(opening.stock)} · cushion ${formatDollars(opening.cushion)} · their own cut ${formatDollars(opening.cut)}.`
        : "No opening plan was ever saved.",
    },
    {
      label: "The line they named to give it back from",
      what: facts.cover
        ? `If the conditional money did not arrive, it was coming off ${lineName(facts.cover.line)}.`
        : "No line was ever named, so nothing said where the money would come from if it did not arrive.",
    },
    {
      label: `The generator, Saturday ${POP_UP_NUMBERS.breakdownSaturday}`,
      what: `${formatDollars(POP_UP_NUMBERS.generator.replacement)} to replace it, with ${formatDollars(POP_UP_NUMBERS.generator.deposit)} back on the deposit.`,
    },
    {
      label: "How they settled it",
      what: facts.repair.saved
        ? repair
          ? `Stock ${formatDollars(repair.stock)} · cushion ${formatDollars(repair.cushion)} · their own cut ${formatDollars(repair.cut)}${
            facts.repair.residual > 0 ? `, and ${formatDollars(facts.repair.residual)} still short — said out loud rather than hidden.` : ", and the replacement covered in full."}`
          : "The repair board was settled, but the figures on it were not recorded."
        : "The repair board was never settled, so there is no after.",
    },
  ];
}

/** The market's own name for one line of the board. */
function lineName(line: string): string {
  if (line === "stock") return "the stock";
  if (line === "cushion") return "the cushion";
  return "their own cut";
}
