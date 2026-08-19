import { withoutComments } from "../test/source";
import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  classStateKey,
  levelKey,
  skillStateKey,
  skillStateInSentence,
  CLASS_STATE_DESCRIPTIONS,
  CLASS_STATE_LABELS,
  LEVEL_BUCKET_LABELS,
  LEVEL_DESCRIPTIONS,
  LEVEL_LABELS,
  SKILL_STATE_DESCRIPTIONS,
  SKILL_STATE_LABELS,
  TERMS,
} from "./labels";

/**
 * One vocabulary, and the scan that stops a second one.
 *
 * The educator surface spoke four vocabularies for the same ideas. Six live tables for "how
 * independently a student worked", eleven more phrasings improvised straight into JSX, two
 * dead tables still carrying a comment that called them "the words the educator surface
 * uses", and one word — *Developing* — that meant a child in one of them and a room in
 * another, on the same page, within one scroll.
 *
 * Renaming that is a morning's work. Keeping it renamed is this file. It is in the shape of
 * `nysedWording.test.ts` and `launchInstructions.test.ts`: a scan over the source a teacher
 * reads sentences out of, plus assertions pinning the properties the four ladders are *for*,
 * so that a future edit that quietly re-opens the gap fails here rather than on a teacher's
 * screen eighteen months later.
 *
 * **What is deliberately exempt, and why.**
 *
 * - **Comments.** A comment explaining why a word was retired must be allowed to contain
 *   the word. Every scan below strips `/* … *\/` and `// …` first; the `[^:]` guard on the
 *   line-comment pattern is there so `https://` is not mistaken for one.
 * - **Type names and identifiers.** `CompetencyId`, `WorldId`, `RubricLevel`,
 *   `allowedWorldIds`, `worldSections`, `studentSpineFor` — schema, not English. Rule 0 of
 *   the proposal: the ladders govern every string a user can read, and nothing else. The
 *   scan therefore looks only inside quoted strings and JSX text, never at identifiers.
 * - **Framework words.** *Objective* and *Topic* are NYSED's units, composed from
 *   `FrameworkLabels`. They are not BOW's and are not retired; `frameworkNaming.test.ts`
 *   owns them.
 */

// ---------------------------------------------------------------------------
// The scan
// ---------------------------------------------------------------------------

/** Files a teacher reads sentences out of. Every educator source, and any added since. */
function teacherSources(): string[] {
  return readdirSync("src/educator", { encoding: "utf8" })
    .filter((entry) => /\.tsx?$/.test(entry) && !/\.test\.tsx?$/.test(entry))
    .map((entry) => `src/educator/${entry}`)
    .sort();
}

/** Comments are not read by anybody in a classroom. The `[^:]` guard protects `https://`. */

/**
 * The English in a file: what is inside quotes, plus the text between JSX tags.
 *
 * Anything else is an identifier, and identifiers are exempt. This is what lets
 * `allowedWorldIds` and `WORLD_REGISTRY` live in the same file as a scan that bans the word
 * *world* from a teacher's screen.
 */
function readableText(source: string, jsx: boolean): string[] {
  const stripped = withoutComments(source)
    // Module specifiers are addresses, not English. `../domain/competency/types` is the path
    // to a type, and Rule 0 exempts type names.
    .replace(/^\s*(?:import|export)[\s\S]*?from\s*["'][^"']*["'];?/gm, " ")
    // A `${…}` hole in a template literal is an expression, not a word a teacher reads.
    // `Two of the ${world.title} explanations` is prose around an identifier, and the
    // identifier is exempt for the same reason `WorldId` is.
    .replace(/\$\{[^{}]*\}/g, " ");
  const quoted = [...stripped.matchAll(/"([^"\n]*)"|'([^'\n]*)'|`([^`]*)`/g)]
    .map((match) => match[1] ?? match[2] ?? match[3] ?? "");
  // JSX text: a run of prose between a tag or an expression and the next one.
  //
  // Both ends matter. A sentence that ends at an interpolation rather than at a closing tag
  // — `>No single requirement reached {GAP}% of the {n} assessed students.` — is invisible to
  // a pattern that needs a `<` before the first brace, and that is the shape most of this
  // product's prose actually has. So the run may open at `>` or `}` and close at `<` or `{`.
  //
  // The lookbehind keeps `=>` out, and `looksLikeCode` throws away what opening at `}` drags
  // in: a run holding `=`, `;` or a backtick is a statement, not a sentence a teacher reads.
  const between = jsx
    ? [...stripped.matchAll(/(?<![=!<>])[>}]([^<>{}]*[A-Za-z][^<>{}]*)[<{]/g)]
      .map((match) => match[1] ?? "")
      .filter((text) => !looksLikeCode(text))
    : [];
  // A quoted string with no space in it is a class name, a route, an id or an enum member.
  // A JSX text node with no space in it is a word on the screen — `<td>Built</td>` is the
  // engineering schedule printed in a standards table, and it is exactly what this scan is
  // for — so the one-word rule applies to quotes only.
  return [...quoted.filter((text) => isEnglish(text, false)), ...between.filter((text) => isEnglish(text, true))];
}

/**
 * A run that opened at a closing brace and is plainly a statement rather than a sentence.
 *
 * Opening at `}` is what lets the scan see a sentence that ends at an interpolation, and it
 * is also what drags in `} for (const row of world.rows) {`. None of the six characters below
 * appears in a sentence a teacher reads anywhere in this product — checked by grep before
 * this list was written — and every one of them is a reliable sign of a statement.
 */
function looksLikeCode(text: string): boolean {
  return /[=;`()]/.test(text);
}

/**
 * Whether a string is prose rather than machinery.
 *
 * A scan that cannot tell `"needs-attention"` from "Needs attention" is a scan somebody turns
 * off. Class names, data attribute values, route paths, storage keys, ids and enum members
 * are all quoted strings and none of them is read by a person, so they are excluded by shape:
 * anything with no space in it, or with a slash or an underscore in it, is machinery.
 */
function isEnglish(text: string, single: boolean): boolean {
  const trimmed = text.trim();
  if (!/[A-Za-z]/.test(trimmed)) return false;
  if (!single && !/\s/.test(trimmed)) return false;
  if (/[/_]/.test(trimmed)) return false;
  return true;
}

/**
 * The retired words, and what each was retired in favour of.
 *
 * These are the words the proposal names, minus the ones that are also ordinary English in
 * a sentence that is not about the taxonomy. `built` is the clearest case: *"a plan students
 * built"* is fine and *"World: Built"* is the engineering schedule on a standards report, so
 * the pattern below catches it as a standalone label rather than as any use of the verb.
 */
const RETIRED: readonly { readonly word: RegExp; readonly instead: string }[] = [
  { word: /\bworlds?\b/i, instead: "story / stories — `TERMS.story`" },
  { word: /\bcompetenc(?:y|ies)\b/i, instead: "skill — `TERMS.skill`" },
  { word: /\bconcepts?\b/i, instead: "skill — `TERMS.skill`" },
  { word: /\bmicro[- ]skills?\b/i, instead: "what the work had to show — `TERMS.requirement`" },
  { word: /\bevidence requirements?\b/i, instead: "what the work had to show — `TERMS.requirement`" },
  { word: /\brequirements?\b/i, instead: "what the work had to show — `TERMS.requirement`" },
  { word: /\brequired parts?\b/i, instead: "what the work had to show — `TERMS.requirement`" },
  { word: /\bcriteri(?:on|a)\b/i, instead: "what the work had to show, or the reasoning rubric's own four" },
  { word: /\blearning targets?\b/i, instead: "skill, or the framework's objective" },
  { word: /\bmapped\b/i, instead: "matched, or say what BOW can and cannot see" },
  { word: /\bspine\b/i, instead: "nothing — it is an internal name for a derivation" },
  { word: /\bexecutable\b/i, instead: "plain English about what the plan does" },
  { word: /\bviable\b/i, instead: "a plan that works" },
  { word: /\bstructured\b/i, instead: "nothing — it named a points model that no longer exists" },
  // Not on the audit's retired list, added here. Ladder 3 replaced *demonstrated*, *not yet
  // demonstrated* and *demonstrated with support* in one move, and the word survived that
  // change in four places anyway — a class headline reading "83% demonstrated", a debrief
  // lede, an objective bar note and a guide sentence — because it is ordinary enough to type
  // without noticing. A vocabulary that is retired everywhere except the sentences nobody
  // rereads is not retired.
  { word: /\bdemonstrat(?:e|ed|es|ing|ion)\b/i, instead: "showed it — `SKILL_STATE_LABELS`" },
  { word: /^Built$|^None yet$/i, instead: "Yes / Not yet — `Can BOW see it yet?`" },
];

/**
 * What the scan is allowed to still find, and why each one is allowed.
 *
 * A quarantine, not a permission. Two things keep it honest: every entry has to say why it
 * is not a defect, and the test below asserts that **each pattern still matches something**
 * — so an exemption for a string that has since been rewritten fails the build rather than
 * sitting here for a year granting cover to nothing.
 */
const ALLOWED: readonly RegExp[] = [
  // The reasoning rubric's four criteria are a real, separate thing, marked by a person by
  // hand, and `criterion.label` is their own field on it. The ladders govern the evidence
  // spine; this is the one place the word names something else, and it is named in the same
  // sentence that says the marks are the teacher's own.
  /criterion by criterion/,
];

function offencesIn(path: string): string[] {
  const offences: string[] = [];
  for (const text of readableText(readFileSync(path, "utf8"), path.endsWith(".tsx"))) {
    if (ALLOWED.some((allowed) => allowed.test(text))) continue;
    for (const retired of RETIRED) {
      if (retired.word.test(text)) {
        offences.push(`${path} — “${text.trim().slice(0, 90)}” → use ${retired.instead}`);
        break;
      }
    }
  }
  return offences;
}

describe("one vocabulary on the teacher's screen", () => {
  it("scans every educator surface, including any added since this was written", () => {
    const sources = teacherSources();
    expect(sources).toContain("src/educator/labels.ts");
    expect(sources).toContain("src/educator/RealClassPages.tsx");
    expect(sources.length).toBeGreaterThan(15);
  });

  it("actually catches what it is for, rather than passing because it reads nothing", () => {
    // A scan whose extraction quietly breaks passes forever and protects nothing. These are
    // the exact strings that were on a teacher's screen before this change, checked through
    // the same pipeline the files go through.
    const before = [
      'const heading = "Pick a world. Make it count.";',
      '<th scope="col">Worlds</th>',
      '<span>Mapped, not yet assessable</span>',
      'const cell = "Required parts shown";',
      'label: "Construct a viable budget",',
      '<td>Built</td>',
    ].join("\n");
    const found = readableText(before, true).flatMap((text) => RETIRED.filter((retired) => retired.word.test(text)));
    expect(found.length, "the extraction stopped seeing prose").toBeGreaterThanOrEqual(5);

    // And the other half: it must not fire on the things Rule 0 exempts.
    const exempt = [
      'import type { CompetencyId } from "../domain/competency/types";',
      'allowedWorldIds: PLAYABLE_WORLDS.map((world) => world.id),',
      '/* The world picker used to say "Pick a world", and a competency was a concept. */',
      'const spine = studentSpineFor(submission);',
      '<p>{worldTitle(candidate.worldId)}</p>',
    ].join("\n");
    expect(readableText(exempt, true).flatMap((text) => RETIRED.filter((retired) => retired.word.test(text)))).toEqual([]);
  });

  it("keeps no exemption for a string that has already been fixed", () => {
    const everything = teacherSources().map((path) => readFileSync(path, "utf8")).join("\n");
    for (const allowed of ALLOWED) {
      expect(allowed.test(everything), `nothing matches the exemption ${String(allowed)} any more — delete it`).toBe(true);
    }
  });

  it.each(teacherSources())("uses no retired word in a string a teacher can read: %s", (path) => {
    expect(
      offencesIn(path),
      "a retired word reached a teacher-facing string. If this is a type name or an internal "
      + "identifier it should not be inside quotes or JSX text; if it is genuinely the right "
      + "word for a reader, argue for it in ALLOWED above rather than deleting the rule",
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The four ladders, as properties rather than as a list of strings
// ---------------------------------------------------------------------------

const LADDER_2 = Object.values(LEVEL_LABELS);
const LADDER_3 = Object.values(SKILL_STATE_LABELS);
const LADDER_4 = Object.values(CLASS_STATE_LABELS);

describe("Ladder 4 can never be read as a claim about a child", () => {
  /**
   * The proposal's rule was "Ladder 4 shares no word with Ladder 3". This asserts something
   * narrower and stronger instead, and the difference is deliberate.
   *
   * *Showed it* is the right verb for both a child and a room, because it is the same claim
   * about the same evidence at two grains — "14 showed it" is the count **behind** "Most of
   * the class showed it", and the two reading as one sentence is a feature. What went wrong
   * with *Developing* was never a shared verb. It was a **bare** word with no subject in it,
   * which a teacher had no way to attach to a child or to a room.
   *
   * So: no Ladder-4 label may *equal* a Ladder-3 label, every Ladder-4 label must name its
   * subject, and no Ladder-3 label may name one. That is testable, it is the property that
   * actually protects the reader, and it survives a future rename that the word-list rule
   * would have failed for the wrong reason.
   */
  const SUBJECT = /\b(class|half|nobody|few|students?)\b/i;

  it("never repeats a Ladder-3 label", () => {
    for (const label of LADDER_4) expect(LADDER_3, `Ladder 4's “${label}”`).not.toContain(label);
    for (const label of LADDER_3) expect(LADDER_4, `Ladder 3's “${label}”`).not.toContain(label);
  });

  it("shares no word of its own with Ladder 3", () => {
    // The audit's original rule, met literally as well as in spirit. Function words are
    // exempt: *yet* is in both "Not yet" and "Nobody assessed yet" and carries no claim on
    // its own, and a rule that banned it would be a rule about grammar rather than about
    // meaning. Everything that names a state, a subject or a quantity is disjoint.
    const FUNCTION_WORDS = new Set(["it", "the", "a", "of", "or", "in", "all", "yet", "than", "up"]);
    const wordsOf = (labels: readonly string[]) =>
      new Set(labels.flatMap((label) => label.toLowerCase().split(/\W+/)).filter((word) => word && !FUNCTION_WORDS.has(word)));
    const shared = [...wordsOf(LADDER_3)].filter((word) => wordsOf(LADDER_4).has(word));
    expect(shared, "a word means both a child and a room again").toEqual([]);
  });

  it("names who it is about, in every one of its labels", () => {
    for (const label of LADDER_4) expect(label, `Ladder 4's “${label}” names no subject`).toMatch(SUBJECT);
  });

  it("never lets a Ladder-3 label name a subject, so it can only be about the student in front of you", () => {
    for (const label of LADDER_3) expect(label, `Ladder 3's “${label}” names a subject`).not.toMatch(SUBJECT);
  });

});


describe("no label overclaims, and no absence is a score", () => {
  it("says nothing about mastery, ability or achievement anywhere in any ladder", () => {
    // The product's whole position is that a machine judgement is evidence of what happened
    // in one run, not a claim about what a child can do. A label carrying "mastered",
    // "proficient" or "can" would make that claim in one word.
    const forbidden = /\b(master(?:ed|y)?|proficien\w*|advanced|excellent|poor|fail(?:ed|ing)?|can do|cannot do|smart|weak|strong student)\b/i;
    for (const label of [...LADDER_2, ...LADDER_3, ...LADDER_4]) {
      expect(label, `“${label}” claims more than one run can show`).not.toMatch(forbidden);
    }
  });

  it("keeps “never came up” a different sentence from “did not do it”", () => {
    // The single most important distinction in the product: an opportunity the run never
    // presented is not a student who got it wrong. They share no word.
    const absence = LEVEL_LABELS.null.toLowerCase().split(/\s+/);
    const zero = LEVEL_LABELS[0].toLowerCase().split(/\s+/);
    expect(absence.some((word) => zero.includes(word))).toBe(false);
    expect(SKILL_STATE_LABELS["not-observed"]).toBe(LEVEL_LABELS.null);
  });

  it("says what level 0 covers, because the label alone cannot", () => {
    // `answer_supplied` caps at 0 (`observe.ts`). A student who was shown the answer and then
    // entered it *did* type the number, so "Did not do it" is true only as a verdict about
    // evidence, and the sentence beside it has to say so. This is the one place in Ladder 2
    // where the description is load-bearing rather than a convenience.
    expect(LEVEL_DESCRIPTIONS[0]).toMatch(/supplied the answer/i);
    expect(LEVEL_DESCRIPTIONS[0]).toMatch(/shows nothing/i);
  });

  it("keeps the two Ladder-3 absences out of the score order", () => {
    // "Evidence not all in" is deliberately not "Not read yet": `observe.ts` returns this
    // state for an unfinished attempt as well, where there is nothing waiting to be read.
    expect(SKILL_STATE_LABELS.incomplete).toBe("Evidence not all in");
    expect(SKILL_STATE_DESCRIPTIONS.incomplete).toMatch(/no judgement yet/i);
    expect(SKILL_STATE_DESCRIPTIONS["not-observed"]).toMatch(/never asked/i);
  });

  it("never folds “never came up” into a shortfall in the counted buckets", () => {
    expect(LEVEL_BUCKET_LABELS.neverAsked).toBe(LEVEL_LABELS.null);
    expect(LEVEL_BUCKET_LABELS.short).not.toBe(LEVEL_BUCKET_LABELS.neverAsked);
    expect(LEVEL_BUCKET_LABELS.met).not.toBe(LEVEL_BUCKET_LABELS.neverAsked);
  });
});

describe("a teacher can tell two neighbouring levels apart", () => {
  /**
   * The product's own rule: two levels a teacher cannot distinguish are a rubric defect.
   *
   * The specific trap this guards is 5 against 4. Level 4's cap is `natural_consequence` —
   * the situation showing the student what happened — which is **not** a hint, so a student
   * at 4 was also working unaided. A label pair like *Did it alone* / *Fixed it themselves*
   * puts an independence word at 5 and a synonym for it at 4 and leaves the actual
   * distinction — whether it went wrong first — unsaid on both.
   */
  it("does not distinguish 5 from 4 by independence, because 4 is unaided too", () => {
    const independence = /\b(alone|unaided|themsel(?:f|ves)|independent\w*|on their own|by themsel\w+)\b/i;
    expect(LEVEL_LABELS[5], "level 5's label leans on independence, which level 4 also has")
      .not.toMatch(independence);
  });

  it("gives every level a distinct label and a distinct sentence", () => {
    expect(new Set(LADDER_2).size).toBe(LADDER_2.length);
    expect(new Set(Object.values(LEVEL_DESCRIPTIONS)).size).toBe(Object.keys(LEVEL_DESCRIPTIONS).length);
    expect(new Set(LADDER_3).size).toBe(LADDER_3.length);
    expect(new Set(LADDER_4).size).toBe(LADDER_4.length);
  });

  it("names what separates 4 from 3: who noticed the problem", () => {
    expect(LEVEL_DESCRIPTIONS[4]).toMatch(/no hint/i);
    expect(LEVEL_DESCRIPTIONS[3]).toMatch(/BOW named the problem/i);
  });

  it("keeps 3 and 2 on different axes and says so, since a student can do part of it after a hint", () => {
    expect(LEVEL_LABELS[3]).toMatch(/hint/i);
    expect(LEVEL_LABELS[2]).not.toMatch(/hint/i);
    expect(LEVEL_DESCRIPTIONS[2]).toMatch(/not all of it/i);
  });
});

describe("Ladder 2 and Ladder 3 agree by construction", () => {
  it("uses the same words for the hint in both", () => {
    // "Did it after a hint" / "Showed it after a hint". They are aligned here rather than by
    // anybody remembering to keep them aligned.
    expect(LEVEL_LABELS[3].endsWith("after a hint")).toBe(true);
    expect(SKILL_STATE_LABELS["demonstrated-with-support"].endsWith("after a hint")).toBe(true);
  });

  it("keeps Ladder 2 in the do family and Ladder 3 in the show family", () => {
    // The one distinction that lets a teacher tell, from the words alone, whether a claim is
    // about one thing the work had to show or about a whole skill.
    expect(LEVEL_LABELS[3]).toMatch(/^Did it/);
    expect(LEVEL_LABELS[0]).toMatch(/^Did not/);
    expect(SKILL_STATE_LABELS.demonstrated).toMatch(/^Showed it/);
    expect(SKILL_STATE_LABELS["demonstrated-with-support"]).toMatch(/^Showed it/);
  });

  it("never lets the word “support” mean two things at once", () => {
    // It is a rubric category — how much help was on screen — and nothing else. It used to
    // be that *and* a roll-up state (*demonstrated with support*) *and* a heading on the
    // What-next tab (*Needs support*), which is how a teacher came to read a cap sentence
    // with two senses of the word eighteen characters apart.
    for (const label of [...LADDER_2, ...LADDER_3, ...LADDER_4]) {
      expect(label, `“${label}” uses the word support`).not.toMatch(/\bsupport\b/i);
    }
  });
});

describe("the cap sentence — the densest teacher string in the product", () => {
  const trail = readFileSync("src/educator/EvidenceTrailPanel.tsx", "utf8");
  const cap = trail.slice(trail.indexOf("judgement.cappedBySupport &&"), trail.indexOf("judgement__verdicts"));

  it("names the cap once, not twice", () => {
    // It used to read "BOW saw Independently, held to After a hint: a hint that named the
    // problem caps this at After a hint" — four level words in eighteen, two of them the same
    // word twice, and it could not help it: `levelUnderRubric` is `min(claimed, cap)`, so a
    // capped level *is* the cap. Two level words is the floor, and it is what it now uses.
    expect(cap.match(/levelLabel\(/g)).toHaveLength(2);
    expect(cap).not.toContain("capFor");
    expect(trail).not.toContain("capFor");
  });

  it("names what did the capping, so the cap is never read as the student's doing", () => {
    // The difference between "they needed a hint" and "they could not do it".
    expect(cap).toContain("SUPPORT_LABELS[judgement.supportLevel]");
  });

  it("stays true when the cap is zero, which is the case a label alone cannot carry", () => {
    // `answer_supplied` caps at 0. The student typed the right number — after BOW showed them
    // what it was — so "Did not do it" is a verdict about evidence rather than a description
    // of what happened at the keyboard. The sentence is what makes that readable: *BOW read
    // this as Right first time, and the answer being supplied holds it at Did not do it.*
    // Written down here because it is the one path the seeded classes cannot reach: neither
    // headless run builder emits `SHOW_AND_CONTINUE_USED`.
    expect(cap).toContain("BOW read this as");
    expect(cap).toContain("holds");
    expect(LEVEL_DESCRIPTIONS[0]).toMatch(/supplied the answer/i);
  });
});

describe("the one glossary rule", () => {
  it("explains only the words a page actually put on screen", () => {
    const key = skillStateKey(["demonstrated", "not-yet-demonstrated", "demonstrated"]);
    expect(key.map((entry) => entry.label)).toEqual([SKILL_STATE_LABELS.demonstrated, SKILL_STATE_LABELS["not-yet-demonstrated"]]);
    expect(key.every((entry) => entry.description.length > 20)).toBe(true);
  });

  it("says nothing at all when a page has none of them on it", () => {
    expect(skillStateKey([])).toEqual([]);
    expect(classStateKey([])).toEqual([]);
    expect(levelKey([])).toEqual([]);
  });

  it("treats `null` as a level with a sentence rather than dropping it", () => {
    const key = levelKey([null, 5, null]);
    expect(key.map((entry) => entry.label)).toEqual([LEVEL_LABELS[5], LEVEL_LABELS.null]);
    expect(key.at(-1)?.description).toMatch(/never asked/i);
  });

  it("carries a sentence for every value of every ladder, so a key can never come up blank", () => {
    for (const state of Object.keys(SKILL_STATE_LABELS) as (keyof typeof SKILL_STATE_LABELS)[]) {
      expect(SKILL_STATE_DESCRIPTIONS[state].length, state).toBeGreaterThan(20);
    }
    for (const state of Object.keys(CLASS_STATE_LABELS) as (keyof typeof CLASS_STATE_LABELS)[]) {
      expect(CLASS_STATE_DESCRIPTIONS[state].length, state).toBeGreaterThan(20);
    }
  });

  it("states Ladder 4's bands from the thresholds rather than from a number somebody typed", () => {
    // "About half" would be a false report of 79%, which is inside this band. The sentence
    // has to come from `objectiveState.ts` so the two cannot drift.
    expect(CLASS_STATE_DESCRIPTIONS.strong).toContain("80%");
    expect(CLASS_STATE_DESCRIPTIONS.developing).toContain("50%");
    expect(CLASS_STATE_DESCRIPTIONS.developing).toContain("under 80%");
    expect(CLASS_STATE_DESCRIPTIONS["needs-attention"]).toContain("50%");
    expect(CLASS_STATE_DESCRIPTIONS["too-few-assessed"]).toContain("5 students");
  });
});

describe("the casing split that used to be a second table", () => {
  it("lowercases one table rather than keeping two", () => {
    expect(skillStateInSentence("demonstrated")).toBe("showed it");
    expect(skillStateInSentence("incomplete")).toBe("evidence not all in");
    for (const state of Object.keys(SKILL_STATE_LABELS) as (keyof typeof SKILL_STATE_LABELS)[]) {
      expect(skillStateInSentence(state)).toBe(SKILL_STATE_LABELS[state].toLowerCase());
    }
  });

  it("has no second table of headlines left to drift from it", async () => {
    const labels = await import("./labels");
    expect(Object.keys(labels)).not.toContain("COMPETENCY_STATE_HEADLINES");
    expect(Object.keys(labels)).not.toContain("COMPETENCY_STATE_LABELS");
    // Dead on arrival and documented as live, which is how a taxonomy comes back: the next
    // person to add a status reads the header, believes it, and wires it into a real page.
    expect(Object.keys(labels)).not.toContain("STATUS_LABELS");
    expect(Object.keys(labels)).not.toContain("TRAJECTORY_LABELS");
    expect(Object.keys(labels)).not.toContain("STATUS_ORDER");
  });
});

describe("Ladder 1 names things once", () => {
  it("keeps challenge for the whole thing and story for one of the two situations", () => {
    expect(TERMS.challenge).toBe("challenge");
    expect(TERMS.story).toBe("story");
    expect(TERMS.stories).toBe("stories");
  });

  it("uses the best phrase already in the codebase for one thing the work had to show", () => {
    // `TeachNext.tsx` had this as a table header while five other surfaces called the same
    // object a requirement, a criterion, a required part, an evidence requirement and a
    // micro-skill.
    expect(TERMS.Requirement).toBe("What the work had to show");
    expect(TERMS.requirement).toBe(TERMS.Requirement.toLowerCase());
  });
});
