import { describe, expect, it } from "vitest";
import { checkWriting, numbersIn, sentencesIn } from "./writingGate";

/**
 * The gate on turning in a written answer, held to the two things it promises.
 *
 * The one it replaced was `text.trim().length >= 40`, unstated, behind a disabled button. A
 * student red team measured it on a real screen and the table below is theirs, verbatim: the
 * three things a child who was trying typed were refused, and forty characters of one
 * repeated letter went through. A rule a student cannot see, which padding satisfies faster
 * than answering, teaches padding.
 *
 * Neither test here reads what a sentence *says*. BOW does not score student writing and this
 * must never start to — every answer that gets through still goes to a person, unscored.
 */

const TWO_NUMBERS = [{ label: "Saved for the course", value: 1128 }, { label: "Backup money kept", value: 216 }];

const ready = (text: string, chosen = TWO_NUMBERS) => checkWriting({ chosen, text, whose: "Avery’s" }).ready;

describe("the gate the red team measured", () => {
  it("still refuses the three things a child who was trying typed", () => {
    // Refused before and refused now, which is the half that was already right.
    expect(ready("idk")).toBe(false);
    expect(ready("idk. idk. idk. idk.")).toBe(false);
    expect(ready("$1,128 and $216. idk.")).toBe(false);
  });

  it("no longer lets length alone through", () => {
    // The two that used to be accepted. Both are longer than the answers above and neither
    // says anything, which is exactly what a character count cannot tell.
    expect(ready("aaaaaaaaaa aaaaaaaaaa aaaaaaaaaa aaaaaaaaaa")).toBe(false);
    expect(ready("i dont know why. i dont care. it was boring. bye.")).toBe(false);
  });

  it("lets through the shortest thing that is actually an answer", () => {
    // Two sentences, each about one of their own figures. Nothing here is graded; what the
    // gate has established is that the student wrote about the numbers they chose to stand
    // on, which is the one thing about a written answer a machine can check honestly.
    expect(ready("I kept $1,128 for the course because that seat was the point. I gave up $216 of backup money to pay the brace bill.")).toBe(true);
  });

  it("does not care how a student punctuates a number", () => {
    expect(ready("I saved 1128 for the course. I kept 216 back for emergencies.")).toBe(true);
    expect(ready("I saved $1,128 for the course. I kept $216 back for emergencies.")).toBe(true);
  });

  it("does not accept a number that only looks like theirs", () => {
    // `$1,128` is not in `$11,280`, and a substring match would have said it was.
    expect(ready("I saved $11,280 for the course. I kept $2,160 back for emergencies.")).toBe(false);
  });
});

describe("what the student is told, and when", () => {
  it("states every rule from the first keystroke, met or not", () => {
    const gate = checkWriting({ chosen: [], text: "", whose: "Avery’s" });
    expect(gate.rules.map((rule) => rule.id)).toEqual(["numbers-chosen", "numbers-written", "sentences"]);
    expect(gate.rules.every((rule) => rule.said.length > 0)).toBe(true);
    expect(gate.rules.every((rule) => !rule.met)).toBe(true);
  });

  it("names the number that is missing rather than saying a number is missing", () => {
    const gate = checkWriting({ chosen: TWO_NUMBERS, text: "I kept $1,128 for the course. It was the whole point of the season.", whose: "Avery’s" });
    const written = gate.rules.find((rule) => rule.id === "numbers-written")!;
    expect(written.met).toBe(false);
    expect(written.said).toContain("$216");
    expect(written.said).not.toContain("$1,128");
  });

  it("does not tick a rule the student has not reached", () => {
    // Nothing tapped means nothing written, and a tick beside "write each number you tapped"
    // on an empty box would be the gate lying twice on one screen.
    const gate = checkWriting({ chosen: [], text: "This plan works because the money was already there. I did not have to cut anything.", whose: "Avery’s" });
    expect(gate.rules.find((rule) => rule.id === "numbers-written")?.met).toBe(false);
    expect(gate.rules.find((rule) => rule.id === "sentences")?.met).toBe(true);
  });

  it("counts the numbers it says are in there, rather than saying Both of three", () => {
    // Tap three, write three, and the gate used to answer "3 of Avery's numbers, tapped."
    // followed by "Both of your numbers are in what you wrote." — two lines apart, on the
    // screen whose whole job is saying plainly what is still outstanding.
    const three = [...TWO_NUMBERS, { label: "Spent on rides and rest", value: 400 }];
    const gate = checkWriting({
      chosen: three,
      text: "I kept $1,128 for the course seat. I left $216 as backup and put $400 into rides.",
      whose: "Avery’s",
    });
    const written = gate.rules.find((rule) => rule.id === "numbers-written")!;
    expect(written.met).toBe(true);
    expect(written.said).toBe("All 3 of your numbers are in what you wrote.");
    expect(checkWriting({ chosen: TWO_NUMBERS, text: "I kept $1,128 for the seat. I left $216 as backup.", whose: "Avery’s" })
      .rules.find((rule) => rule.id === "numbers-written")!.said).toBe("Both of your numbers are in what you wrote.");
  });

  it("calls the numbers what the screen calls them, in either world", () => {
    // One gate, two stories: the season's figures are Avery's and the market night was the
    // student's own. A shared rule that hard-codes one world's name is a rule only one world
    // can use, which is how the market came to have a rule of its own.
    const season = checkWriting({ chosen: [], text: "", whose: "Avery’s" }).rules[0]!.said;
    const market = checkWriting({ chosen: [], text: "", whose: "your" }).rules[0]!.said;
    expect(season).toContain("Avery’s numbers");
    expect(market).toContain("your numbers");
  });

  it("says when too many numbers have been tapped, and how to fix it", () => {
    const gate = checkWriting({ chosen: [...TWO_NUMBERS, { label: "a", value: 1 }, { label: "b", value: 2 }], text: "", whose: "Avery’s" });
    const chosen = gate.rules.find((rule) => rule.id === "numbers-chosen")!;
    expect(chosen.met).toBe(false);
    expect(chosen.said).toMatch(/untap one/i);
  });
});

describe("the two things it reads", () => {
  it("finds every number a student wrote, however they wrote it", () => {
    expect([...numbersIn("I kept $1,128 and 216 and 1,200.")].sort((a, b) => a - b)).toEqual([216, 1128, 1200]);
  });

  it("counts only sentences with something in them", () => {
    expect(sentencesIn("idk. idk. idk.")).toEqual([]);
    expect(sentencesIn("I protected the course. Yes.")).toEqual(["I protected the course"]);
    expect(sentencesIn("I protected the course\nI gave up rides")).toEqual(["I protected the course", "I gave up rides"]);
  });
});
