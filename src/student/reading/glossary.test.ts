import { withoutComments } from "../../test/source";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CHOICE_LABELS } from "../../components/financial/choices";
import { BASKETBALL_SCENARIO } from "../../domain/scenario/worlds/basketball";
import { POP_UP_SCENARIO } from "../../domain/scenario/worlds/food-truck";
import { WORLD_IDS, isKnownWorld } from "../../domain/core/ids";
import { GLOSSARY, formAppearsIn, glossaryFor, termsOnScreen, type GlossaryEntry } from "./glossary";

/**
 * The glossary against the product's own words.
 *
 * Three questions, and none of them can be answered by reading the glossary on its own.
 *
 * 1. **Did anybody make these words up?** Every form has to appear in copy a student actually
 *    reads. A glossary written from a curriculum document rather than from the screens is the
 *    normal way this goes wrong, and it goes wrong invisibly: the definitions are all correct
 *    and none of them is for a word the child is looking at.
 * 2. **Does it cover the words the run is built out of?** The two worlds declare their money
 *    vocabulary in data — the pop-up's three lines, the plan's three rows, every figure a
 *    student is asked to work out. Each of those has to be findable. Adding a fourth line or a
 *    fifth sum to either world fails this until somebody has said what it means.
 * 3. **Can a hard word get in without anybody deciding?** No: every word in the run's copy is
 *    either defined below or listed in `PLAIN_ENOUGH`, and a word that is in neither fails the
 *    suite by name. That list is long because the run is long. It is the record of a person
 *    having looked at each word and judged that a Grade 5 reader working in their second
 *    language does not stop at it — which is a judgement, and one worth being able to argue
 *    with, rather than an absence of one.
 *
 * The source scan is the same instrument `pricing.test.ts` and `wordLadders.test.ts` use, and
 * for the reason `pricing.test.ts` gives: the drift it catches is invisible to a behavioural
 * test, because the glossary and the screens agree right up until somebody edits the copy.
 * Its known limit is that it reads sources rather than rendered screens, so a sentence
 * composed at run time out of fragments is seen fragment by fragment. Checked against two
 * complete playthroughs at the time of writing: of 717 distinct words on the screens of both
 * worlds, this scan sees every one except a handful assembled at render time, and none of the
 * words it misses is in the glossary or would want to be.
 */

/** Files a student reads sentences out of during a run. Educator surfaces are not in scope. */
const RUN_COPY = [
  "src/content/studentCopy.ts",
  "src/stages/StudentChallenge.tsx",
  "src/stages/SeasonWeeks.tsx",
  "src/stages/Week8Resolution.tsx",
  "src/stages/WorldChoice.tsx",
  "src/stages/popup/PopUpScreens.tsx",
  "src/stages/popup/PopUpBoard.tsx",
  "src/stages/popup/PopUpShell.tsx",
  "src/stages/popup/PopUpChallenge.tsx",
  "src/app/StageShell.tsx",
  "src/components/financial/AdjustPanel.tsx",
  "src/components/financial/AllocationControl.tsx",
  "src/components/financial/PlanBoard.tsx",
  "src/components/financial/PlanLedger.tsx",
  "src/components/financial/PlanScene.tsx",
  "src/components/financial/WeekMeter.tsx",
  "src/components/financial/choices.ts",
  "src/components/primitives/CalculationInput.tsx",
  "src/components/story/RosterCard.tsx",
  "src/components/story/SeasonStrip.tsx",
  "src/domain/scenario/expectations.ts",
  "src/domain/scenario/worlds/basketball/scenario.ts",
  "src/domain/scenario/worlds/basketball/claims.ts",
  "src/domain/scenario/worlds/basketball/writtenDefense.ts",
  "src/domain/scenario/worlds/food-truck/scenario.ts",
  "src/domain/scenario/worlds/food-truck/claims.ts",
  "src/domain/scenario/worlds/food-truck/resolution.ts",
  "src/domain/scenario/worlds/food-truck/ledger.ts",
  "src/domain/evidence/writingGate.ts",
  "src/domain/finance/consequences.ts",
  "src/domain/finance/resolution.ts",
];

/** A comment explaining why a word was chosen is not a word on a screen. */

/**
 * Whether a run of text is prose a student reads rather than machinery.
 *
 * Two or more words, or one capitalised word — `"Takings"` and `"Booked"` are labels on a
 * screen and `"working"` is a plan mode. A BEM modifier, a path, a template hole or a
 * camelCase identifier is none of a student's business and is thrown away by shape, which is
 * what lets `data-line` and `POP_UP_SCENARIO` live in the same files as the copy.
 */
function isProse(raw: string): boolean {
  const text = raw.trim();
  if (!/[A-Za-z]/.test(text)) return false;
  if (/[_{}/\\<>|=]/.test(text)) return false;
  if (/--/.test(text)) return false;
  if (/[a-z][A-Z]/.test(text)) return false;
  const tokens = text.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) return /^[A-Z][A-Za-z'’]+$/.test(tokens[0] ?? "");
  // A list of class names is machinery, and the one-word rule above already knew it: a lone
  // `"popup-shell"` is thrown away for being lowercase and hyphenated. Two of them in one
  // attribute — `className="popup-shell ground-dark"` — used to arrive here as "two words"
  // and be read as a sentence, so the first component to carry a second class reported
  // `ground-dark` as a word a Grade 5 reader might stop at. Every token hyphenated and
  // lowercase is a shape no English sentence has.
  if (tokens.every((token) => /^[a-z][a-z0-9]*(?:-[a-z0-9]+)+$/.test(token))) return false;
  return tokens.length > 1;
}

/**
 * The English in one file: quoted strings and JSX text, with module specifiers removed.
 *
 * The import strip is anchored to a module statement rather than written as "anything up to
 * the next `from`", which is the shape `wordLadders.test.ts` uses and which quietly ate seven
 * hundred lines of this repository's copy the first time it was pointed at a file containing
 * the sentence *"Where the swap money came from"*.
 */
function readableText(source: string, jsx: boolean): string[] {
  const stripped = withoutComments(source)
    .replace(/^\s*(?:import|export)\s+(?:type\s+)?(?:\{[^{}]*\}|[\w*\s,]+)\s+from\s*["'][^"'\n]*["'];?/gm, " ")
    .replace(/\$\{[^{}]*\}/g, " ")
    // Single-brace holes are the market's verdict placeholders — `"{rent} of rent, {sold}
    // plates, {takings}."` — filled at render time with figures and names. Left in place they
    // trip `isProse`'s brace rule and the whole sentence drops out of the scan, so a third of
    // the market's ending copy was never read for a hard word and could not answer whether the
    // market says `rent`. Removed, the sentence is what a student sees minus its numbers,
    // which is exactly what this scan wants.
    .replace(/\{[a-z_]+\}/g, " ");
  const quoted = [...stripped.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g)].map((match) => match[1] ?? match[2] ?? match[3] ?? "");
  const between = jsx
    ? [...stripped.matchAll(/(?<![=!<>])[>}]([^<>{}]*[A-Za-z][^<>{}]*)[<{]/g)]
      .map((match) => match[1] ?? "")
      .filter((text) => !/[=;`()]/.test(text))
    : [];
  return [...quoted, ...between].filter(isProse);
}

/**
 * Which world each file's words are read in, so `where` can be checked rather than trusted.
 *
 * `glossaryFor(world)` filters the whole panel by `where`, so an entry that names a world is
 * a promise that a student playing that world meets the word. Nothing checked the promise
 * until a *goal* entry was written with both worlds on it — the season's Week 8 ending says
 * *"A goal is reached by the money a plan puts toward it"* and the market says the word
 * nowhere at all, so a child running the pop-up would have been handed a definition for a word
 * not on any screen they will ever see. That is precisely the failure the `where` field's own
 * comment warns a third story about, arriving in the second one.
 *
 * A file neither list names is read in both runs — the world picker, the door, the calculation
 * box, the writing gate. The partition is coarse in the safe direction: a basketball-only file
 * wrongly left shared weakens the check and cannot fail a true entry.
 */
const BASKETBALL_ONLY = [
  "src/stages/StudentChallenge.tsx", "src/stages/SeasonWeeks.tsx", "src/stages/Week8Resolution.tsx",
  "src/app/StageShell.tsx", "src/components/financial/AdjustPanel.tsx", "src/components/financial/PlanBoard.tsx",
  "src/components/financial/PlanLedger.tsx", "src/components/financial/PlanScene.tsx",
  "src/components/financial/WeekMeter.tsx", "src/components/financial/choices.ts",
  "src/components/story/RosterCard.tsx", "src/components/story/SeasonStrip.tsx",
  "src/domain/scenario/expectations.ts", "src/domain/finance/consequences.ts", "src/domain/finance/resolution.ts",
];
const MARKET_ONLY = ["src/stages/popup/", "src/domain/scenario/worlds/food-truck/"];

function worldOf(path: string): "basketball" | "food-truck" | "both" {
  if (BASKETBALL_ONLY.includes(path) || path.startsWith("src/domain/scenario/worlds/basketball/")) return "basketball";
  return MARKET_ONLY.some((prefix) => path.startsWith(prefix)) ? "food-truck" : "both";
}

const RUN_CHUNKS: readonly string[] = RUN_COPY.flatMap((path) => readableText(readFileSync(path, "utf8"), path.endsWith(".tsx")));
const TEXT_OF: Record<string, string> = Object.fromEntries(WORLD_IDS.map((world) => [
  world,
  RUN_COPY
    .filter((path) => worldOf(path) === world || worldOf(path) === "both")
    .flatMap((path) => readableText(readFileSync(path, "utf8"), path.endsWith(".tsx")))
    .join("\n"),
]));
const RUN_TEXT = RUN_CHUNKS.join("\n");
const RUN_WORDS: readonly string[] = [...new Set((RUN_TEXT.toLowerCase().match(/[a-z][a-z'’-]*/g) ?? []))].sort();

describe("every word the glossary defines is a word the run says", () => {
  it("finds every form on a screen", () => {
    const missing = GLOSSARY.flatMap((entry) =>
      entry.forms.filter((form) => !formAppearsIn(form, RUN_TEXT)).map((form) => `${entry.term} → “${form}”`));
    expect(missing, "forms no student ever reads").toEqual([]);
  });

  it("lists each word once, so the panel cannot show two answers to one question", () => {
    const terms = GLOSSARY.map((entry) => entry.term);
    expect(new Set(terms).size).toBe(terms.length);
  });

  it("spells no amount the scenario owns, so re-pricing a world cannot make it lie", () => {
    const priced = GLOSSARY.filter((entry) => /\d/.test(entry.meaning)).map((entry) => entry.term);
    expect(priced, "definitions carrying a figure").toEqual([]);
  });

  it("says what a word means without saying it is a hard word", () => {
    const talkingDown = GLOSSARY.filter((entry) => /\b(?:just|simply|don't worry|remember|easy|tricky|difficult|of course)\b/i.test(entry.meaning));
    expect(talkingDown.map((entry) => entry.term)).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------
   Which story a word belongs to, and what a third story would be handed.
   --------------------------------------------------------------------------- */

/**
 * `where` is the only list of worlds this directory keeps, and this is what ties it to the
 * one the product keeps.
 *
 * It used to read `"both" | "basketball" | "food-truck"`, and `"both"` was matched before
 * the world was looked at at all — `entry.where === "both" || entry.where === world`. A
 * third story is a live plan, and the day it shipped every word marked shared would have
 * been shown in it: definitions written off the season's and the market's screens, offered
 * to a child playing neither, with `tsc` clean and this file green. The guard above the
 * filter had the same shape from the other side, so a world it had not been told about fell
 * through the branch meant for *no world at all* and was handed all sixty-nine.
 *
 * The tie lives here rather than in `glossary.ts` because `nothingRecorded.test.ts` allows
 * that directory exactly one domain import and it is the reading ruler. That boundary is
 * worth more than the type would be, and this file is already allowed to know both sides.
 */
describe("a word belongs to the stories that say it, and to no others", () => {
  /** A world this build does not have. Standing in for whichever one ships third. */
  const THIRD_STORY = "fashion";

  it("claims no story that does not say the word", () => {
    const unsaid = GLOSSARY.flatMap((entry) =>
      entry.where
        .filter((world) => TEXT_OF[world] !== undefined)
        .filter((world) => !entry.forms.some((form) => formAppearsIn(form, TEXT_OF[world] ?? "")))
        .map((world) => `${entry.term} → claims ${world}, which says none of [${entry.forms.join(", ")}]`));
    expect(unsaid, "a panel offering a word the story never says").toEqual([]);
  });

  it("would catch a word claimed for a story that does not say it", () => {
    // The test has to be able to fail, and this is the exact entry that made it necessary.
    const invented: GlossaryEntry = {
      term: "goal", forms: ["goal"], meaning: "Something you are putting money toward.", where: [...WORLD_IDS],
    };
    const said = invented.where.filter((world) => invented.forms.some((form) => formAppearsIn(form, TEXT_OF[world] ?? "")));
    expect(said).toEqual(["basketball"]);
  });

  it("names stories this build actually has, and at least one of them", () => {
    const wrong = GLOSSARY
      .filter((entry) => entry.where.length === 0 || entry.where.some((world) => !isKnownWorld(world)))
      .map((entry) => `${entry.term} → [${entry.where.join(", ")}]`);
    expect(wrong, "entries naming no story, or a story WORLD_IDS does not have").toEqual([]);
  });

  it("hands a story it has never heard of nothing, rather than every other story's words", () => {
    const sharedByBoth = GLOSSARY.filter((entry) => entry.where.length === WORLD_IDS.length);
    expect(sharedByBoth.length, "words the two worlds share, which are the ones `both` used to cover").toBeGreaterThan(0);
    expect(glossaryFor(THIRD_STORY).map((entry) => entry.term)).toEqual([]);
  });

  it("hands a third story exactly what somebody wrote for it", () => {
    const shared: GlossaryEntry = {
      term: "in hand", forms: ["in hand"], meaning: "Money that has arrived.", where: [...WORLD_IDS],
    };
    const written: GlossaryEntry = {
      term: "bolt", forms: ["bolt"], meaning: "A length of cloth sold as one piece.", where: [THIRD_STORY],
    };
    expect(glossaryFor(THIRD_STORY, [shared, written]).map((entry) => entry.term)).toEqual(["bolt"]);
    // And the two worlds that do exist are unmoved by a word written for one that does not.
    for (const world of WORLD_IDS) {
      expect(glossaryFor(world, [shared, written]).map((entry) => entry.term)).toEqual(["in hand"]);
    }
  });

  it("has words of its own for every story this build has", () => {
    // The half of the third-world problem the filter cannot solve: a world added to
    // `WORLD_IDS` with nothing written for it opens an empty panel. It fails here first.
    for (const world of WORLD_IDS) {
      const entries = glossaryFor(world);
      expect(entries.length, `${world} has no glossary of its own`).toBeGreaterThan(0);
      expect(entries.length, `${world} is being shown the whole glossary`).toBeLessThan(GLOSSARY.length);
    }
  });

  it("gives the whole list only where no story has been named", () => {
    expect(glossaryFor(null)).toEqual(GLOSSARY);
    expect(glossaryFor(undefined)).toEqual(GLOSSARY);
  });
});

/* ---------------------------------------------------------------------------
   The vocabulary the two worlds are built out of, read off the worlds themselves.
   --------------------------------------------------------------------------- */

/** A figure the student is asked to work out. Found by shape, so a new one cannot hide. */
interface SumCopy { label: string; scaffold: string }

function sumsIn(node: unknown, found: SumCopy[] = []): SumCopy[] {
  if (!node || typeof node !== "object") return found;
  const record = node as Record<string, unknown>;
  if (typeof record.label === "string" && typeof record.scaffold === "string") found.push(record as unknown as SumCopy);
  for (const value of Object.values(record)) sumsIn(value, found);
  return found;
}

describe("the money vocabulary of both worlds is covered", () => {
  const covered = (label: string) => GLOSSARY.some((entry) => entry.forms.some((form) => formAppearsIn(form, label)));

  it("defines a word in the name of every line the market plans on", () => {
    const lines = Object.values(POP_UP_SCENARIO.lines).map((line) => line.label);
    expect(lines.filter((label) => !covered(label))).toEqual([]);
  });

  it("defines a word in the name of every row the season plans on", () => {
    expect(Object.values(CHOICE_LABELS).filter((label) => !covered(label))).toEqual([]);
  });

  it("defines a word in the name of every payment the season counts", () => {
    const labels = Object.values(BASKETBALL_SCENARIO.incomeCopy).map((source) => source.label);
    expect(labels.filter((label) => !covered(label))).toEqual([]);
  });

  it("defines a word in every figure the market asks a student to work out", () => {
    const sums = sumsIn(POP_UP_SCENARIO.screens).map((sum) => sum.label);
    expect(sums.length).toBeGreaterThan(0);
    expect(sums.filter((label) => !covered(label))).toEqual([]);
  });
});

/* ---------------------------------------------------------------------------
   Nothing hard gets in unnoticed.
   --------------------------------------------------------------------------- */

describe("every word the run says has been looked at", () => {
  it("has no word that is neither defined nor judged plain", () => {
    const defined = new Set(
      GLOSSARY.flatMap((entry) => entry.forms).flatMap((form) => form.toLowerCase().split(/[^a-z'’-]+/)).filter(Boolean),
    );
    const unreviewed = RUN_WORDS.filter((word) => !defined.has(word) && !PLAIN_ENOUGH.has(word));
    expect(
      unreviewed,
      "new words in the run. Define each one in glossary.ts, or add it to PLAIN_ENOUGH if a Grade 5 reader working in their second language would not stop at it.",
    ).toEqual([]);
  });
});

describe("the panel shows the words on the screen a student is on", () => {
  it("orders them the way the screen says them", () => {
    const screen = "How much is gone before Avery chooses anything? Money already spoken for. Backup money covers the rest.";
    expect(termsOnScreen(screen).map((entry) => entry.term)).toEqual(["spoken for", "backup money", "cover"]);
  });

  it("does not fire a term on a longer word that happens to contain it", () => {
    expect(termsOnScreen("The stockroom is full.").map((entry) => entry.term)).toEqual([]);
    expect(termsOnScreen("Nothing here.")).toEqual([]);
  });

  it("keeps the two meanings of cut apart", () => {
    expect(termsOnScreen("Making the cut bonus").map((entry) => entry.term)).not.toContain("your cut");
    expect(termsOnScreen("Your cut, banked").map((entry) => entry.term)).toContain("your cut");
  });
});

/**
 * Every other word the run says.
 *
 * Read once, in one pass, against the question "would a Grade 5 reader working in their second
 * language stop here". Anything that got a yes is in `glossary.ts` instead. This list is the
 * record of the ones that got a no, and the reason it is a list rather than a rule is that no
 * rule available here can tell *cushion* from *counter*: syllables cannot, length cannot, and
 * a frequency table would need shipping a corpus and would still miss every idiom in the run.
 *
 * **What this list has caught, and what it means that it caught it.** The first three words to
 * arrive after it was written — *bring*, *knows*, *range* — came in together, from a change
 * nobody involved in this file made: the market's last Saturday became a crowd the organiser
 * cannot name, so `worlds/food-truck/scenario.ts` started saying *"the organiser gives you a
 * range instead of a number"*. The suite went red naming all three. That is the whole design
 * working: a person now has to decide about each of them before the run can ship, and nothing
 * about the change itself made anybody think about vocabulary.
 *
 * *knows* and *bring* are here because *know* and *bring* are two of the most common verbs in
 * English and a Grade 5 reader has both. (The neighbouring forms *knew* and *brings* were
 * already on this list, which is what tells you nobody made a decision about the words — they
 * arrived in a sentence.) *range* is deliberately **not** here: it is a real word for a real
 * idea in this run, a student cannot order trays for that night without holding it, and it
 * belongs in `glossary.ts`. It goes there the moment the copy that says it is committed, and
 * not one minute before — the first assertion in this file fails on a definition for a word no
 * screen says, so a glossary entry written ahead of its copy breaks the suite in the other
 * direction. Until then this file is red by one word, on purpose, and the word is the answer.
 *
 * *spread* arrived the same way and gets the same answer. A Week 8 counterfactual started
 * saying a plan had money *to spread across all three amounts*; *spreads* was already on this
 * list, which again is what tells you nobody had decided about the word. The decision is that
 * it is an ordinary verb in that clause and not the run's name for anything — the run's own
 * name for giving money out is *every dollar has a job*, which `glossary.ts` defines. Putting
 * *spread* in the panel beside it would be the second vocabulary for one idea that the header
 * of this file is about.
 *
 * A word that gets added to this list because the suite named it, without anybody looking at
 * it, defeats the only thing this list is for.
 */
const PLAIN_ENOUGH = new Set<string>([
  // The possessive of a word already on this list, arriving with the teacher’s own closing
  // question. A Grade 5 reader who reads "teacher" does not stop at "teacher’s". The
  // apostrophe is the typographic one every other possessive in the student copy uses.
  "teacher’s",
  // Read for the first time when the scan learned to see through the market's `{rent}`
  // placeholders: eleven words in the pop-up's ending verdicts that no reviewer had ever
  // been shown, because the brace tripped `isProse` and dropped the whole sentence. Two of
  // the eleven did not survive the reading and were rewritten in the copy instead — *the
  // thin night* and *a crowd wanting* are figures of speech a Grade 5 reader in their
  // second language stops at, and they are now *the quiet night* and *a crowd that wanted*.
  "better", "elsewhere", "found", "happened", "orders", "quiet", "thrown", "times", "wanted", "worst", "yoga's",
  "spread", "stands", "when",
  "about", "above", "account", "across", "actually", "add", "added", "adds", "again", "against",
  "age", "all", "almost", "alone", "along", "amount", "amounts", "an", "another", "answer",
  "answered", "any", "anybody", "anything", "anyway", "are", "arena", "around", "arrive", "arrived",
  "arrives", "as", "aside", "ask", "asked", "asks", "at", "automatically", "avery's", "avery’s",
  "away", "away-game", "back", "balances", "ball", "band", "bank", "bar", "basketball", "be",
  "because", "been", "before", "being", "below", "beside", "between", "biggest", "bill", "bills",
  "birthday", "block", "blocks", "body", "book", "booked", "booking", "both", "bottom", "bought",
  "bow", "box", "break", "breaks", "bridge", "bring", "brings", "brought", "build", "building",
  "built",
  "bus", "busy", "but", "button", "buy", "buying", "buys", "by", "call", "calling",
  "calls", "came", "can", "cancelled", "cannot", "card", "cards", "carry", "case", "cash",
  "certain", "chalkboard", "change", "changed", "changes", "charged", "charges", "cheaper", "cheapest", "check",
  "choices", "choose", "chooses", "claims", "class", "cleaner", "close", "closed", "closing", "coach",
  "coaching", "code", "cold", "come", "comes", "coming", "commas", "committed", "committing", "community",
  "comparison", "computer", "confirm", "confirmed", "connection", "continue", "cook", "cooked", "cooking", "cooks",
  "cool", "corner", "cost", "costs", "could", "counter", "court", "cousin", "cousin’s", "damage",
  "dark", "day", "dead", "deadline", "decides", "decision", "decrease", "definitely", "delivers", "depends", "detail",
  "did", "didn’t", "died", "difference", "different", "differently", "district", "do", "does", "dollars", "done",
  "doors", "down", "drives", "drop", "each", "earlier", "early", "earned", "eats", "effect",
  "eight", "eight-week", "either", "eleven", "else", "email", "emptied", "end", "ending", "ends",
  "enough", "enter", "even", "evening", "ever", "evenly", "everybody", "everyone", "everywhere", "exactly", "expected",
  "explain", "extra", "far", "feedback", "fewer", "fictional", "fifth", "figure", "fill", "filling",
  "fills", "final", "finding", "fine", "fireworks", "first", "fit", "fits", "five", "fixing", "flight", "food",
  "foods", "four", "free", "from", "gains", "game", "games", "gas", "gate", "gave",
  "get", "gets", "getting", "give", "gives", "glad", "go", "goes", "going", "gone",
  "got", "groceries", "guard", "gym", "had", "haddad", "half", "halfway", "halves", "handed",
  "handed-in", "handle", "hands", "happen", "happens", "harbor", "hard", "has", "have", "held",
  "help", "her", "here", "hide", "high", "hint", "his", "hold", "holding", "holds",
  "hole", "home", "hour", "hours", "how", "however", "hurts", "i", "if", "increase",
  "instead", "into", "its", "jar", "just", "keep", "keeping", "keeps", "kept", "knew", "land",
  "knows", "landed", "lands", "lane", "last", "late", "later", "laundry", "league", "leaning",
  "least",
  "leave", "leaves", "leaving", "length", "less", "lesson", "letters", "lid", "lights", "like",
  "lines", "list", "lived", "lives", "living", "long", "looked", "loose", "lost", "low",
  "made", "main", "make", "makes", "man", "many", "marisol", "marisol's", "market", "match",
  "matter", "max-width", "me", "means", "message", "middle", "midnight", "might", "min", "minus",
  "miss", "missed", "missing", "mo", "moment", "mon", "monday", "more", "morning", "most",
  "movable", "move", "moved", "moves", "much", "multiply", "must", "my", "nadia", "name",
  "named", "need", "needed", "needing", "needs", "neither", "never", "new", "next", "night",
  "nights", "nine", "nobody", "none", "not", "nothing", "nowhere", "number", "numbers", "of",
  "offering", "office", "okafor", "once", "one", "ones", "only", "open", "opened", "opening",
  "opens", "option", "or", "ordered", "ordinary", "other", "outside", "over", "own", "packed",
  "page", "painted", "pair", "part", "pass", "past", "paying", "payment", "payments", "pays",
  "people", "per", "performs", "person", "phone", "pick", "place", "places", "plain", "plan's", "plan’s", "planned",
  "planning", "plate", "plates", "play", "played", "player", "players", "playing", "plays", "plus",
  "pm", "pockets", "pop-up", "pos", "practice", "prefers-reduced-motion", "present", "press", "pressure", "priced",
  "prices", "progress", "promised", "prompt", "proper", "properly", "protect", "protected", "protects", "put",
  "puts", "putting", "px", "question", "questions", "quiet", "rains", "ramos", "ran", "rather",
  "reach", "reachable", "reached", "reaches", "reaching", "read", "reads", "ready", "real", "reason", "reduce",
  "regional", "rentals", "rented", "repeat", "replaced", "replacement", "response", "review", "reyes", "right",
  "riverside", "road", "roster", "round", "row", "rows", "rubber", "run", "running", "runs",
  "s", "safe", "safety", "said", "salt", "sat", "saturday", "saturdays", "save", "say",
  "says", "scenario", "scene", "schedule", "school", "screen", "season", "second", "see", "selected",
  "sell-out", "sells", "send", "sending", "sent", "sentence", "sentences", "session", "sessions", "set",
  "setup", "setups", "she", "shoes", "shop", "shortcut", "show", "shown", "side", "sign",
  "signed", "single", "sister", "size", "skills", "smoke", "so", "software", "some", "something",
  "somewhere", "spend", "spending", "split", "splitting", "spot", "spreads", "standing", "start", "started",
  "starting", "starts", "stayed", "stays", "step", "step-by-step", "stood", "stopped", "stops", "storm",
  "straight", "strings", "stuck", "studio", "summers", "sunday", "sunrise", "sweeps", "take", "taken",
  "takes", "tap", "taped", "tapped", "teacher", "team", "teammate", "teammate’s", "tell", "term",
  "than", "that", "that's", "that’s", "their", "them", "then", "there", "these", "they",
  "thing", "things", "thinking", "third", "this", "those", "three", "threw", "thu", "time",
  "tips", "tired", "tiredness", "today", "together", "told", "too", "took", "top", "total",
  "toward", "town", "transfer", "tried", "trip", "truck", "truck's", "trucks", "try", "turn", "turned",
  "turning", "turns", "twice", "two", "type", "under", "unpaid", "untap", "until", "update",
  "us", "use", "usual", "usually", "version", "wait", "waiting", "walk", "walked", "walks",
  "want", "wanted", "wants", "was", "watch", "way", "ways", "week", "weeks", "were",
  "wet", "what", "whatever", "wheel", "where", "whether", "which", "whichever", "while", "who",
  "whole", "whose", "why", "will", "willing", "window", "without", "wk", "won’t", "work",
  "worked", "working", "works", "world", "worse", "worth", "would", "wrist", "write", "writes",
  "writing", "wrong", "wrote", "yes", "yet", "yoga", "you", "younger", "yours", "yourself",
]);
