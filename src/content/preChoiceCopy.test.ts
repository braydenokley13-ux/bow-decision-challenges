import { describe, expect, it } from "vitest";
import { STUDENT_COPY } from "./studentCopy";
import { PLAYABLE_WORLDS } from "../domain/scenario/registry";

/**
 * The last screens before a student picks a world may not promise one of them.
 *
 * The line under "Pick a world" read *"Your teacher wants to see that you can build a budget
 * that works"*, printed above two cards, one of which opens Run the Pop-Up — which is not a
 * budget, it is stock and spoilage priced in trays against a crowd. It was the only sentence
 * in the student flow that told a child what the adult was looking for, and it was false for
 * the story half of them were about to choose.
 *
 * It was false in a second way as well: a class can be created with no objective on it at
 * all, so BOW has no way of knowing what any teacher wants, and a product that invents a
 * motive for the adult in the room is teaching a student to answer the motive instead of the
 * question. Two worlds exist so that a student cannot work out the shape of the answer from
 * the shape of the task; a line at the door handing that shape over costs more than either
 * story could give back.
 *
 * So the rule these tests hold, on every string a student can read before they have chosen:
 * **say nothing about what the teacher wants, and nothing that is only true of one world.**
 */

/** Every line a student reads before a world has been picked. */
function preChoiceCopy(): { where: string; text: string }[] {
  const sections = { join: STUDENT_COPY.join, choose: STUDENT_COPY.choose } as const;
  return Object.entries(sections).flatMap(([section, block]) =>
    Object.entries(block).map(([key, text]) => ({ where: `${section}.${key}`, text: String(text) })),
  );
}

/**
 * Claims about the mind of the adult in the room.
 *
 * "Your teacher gives it out at the start of the lesson" is a fact about the room and stays.
 * What cannot stay is a verb that puts a want, an expectation or a judgement inside a person
 * BOW has never met, on behalf of a class that may carry no objective at all.
 */
const TEACHER_MOTIVE = /teachers?\s+(?:wants?|expects?|needs?|hopes?|is\s+looking|will\s+be\s+looking|would\s+like)/i;

/**
 * Words that belong to one world's story or to one world's task.
 *
 * "Budget" is on the list for the same reason "trays" would be: it names the shape of the
 * answer in Eight Weeks to the Showcase, and it is not what Run the Pop-Up asks for.
 */
const ONE_WORLD_ONLY = [
  "budget", "basketball", "court", "season", "showcase", "jersey", "coach",
  "pop-up", "popup", "market", "booth", "truck", "stall", "tray", "spoilage", "menu",
];

describe("nothing a student reads before choosing belongs to one of the two worlds", () => {
  it("has two worlds to choose between, which is the only reason this rule exists", () => {
    expect(PLAYABLE_WORLDS.length).toBeGreaterThan(1);
  });

  it("never says what the teacher wants", () => {
    const offences = preChoiceCopy()
      .filter(({ text }) => TEACHER_MOTIVE.test(text))
      .map(({ where, text }) => `${where} — ${text}`);
    expect(offences, "BOW cannot know why a class was set, and a student who answers the motive is not deciding").toEqual([]);
  });

  it("never names a thing only one of the worlds is about", () => {
    const offences = preChoiceCopy().flatMap(({ where, text }) =>
      ONE_WORLD_ONLY
        .filter((word) => new RegExp(`(^|[^a-z])${word}([^a-z]|$)`, "i").test(text))
        .map((word) => `${where} — "${word}" in ${JSON.stringify(text)}`),
    );
    expect(offences, "half the room is about to pick the other story").toEqual([]);
  });

  it("would catch the sentence this rule was written for", () => {
    const shipped = "Your teacher wants to see that you can build a budget that works.";
    expect(TEACHER_MOTIVE.test(shipped)).toBe(true);
    expect(ONE_WORLD_ONLY.some((word) => new RegExp(`(^|[^a-z])${word}([^a-z]|$)`, "i").test(shipped))).toBe(true);
  });
});
