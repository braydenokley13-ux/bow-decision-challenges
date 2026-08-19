import { describe, expect, it } from "vitest";
import { classLeadFor, type ClassLeadInput } from "./classLead";
import { MINIMUM_ASSESSED_FOR_A_STATE } from "../domain/competency/objectiveState";

/**
 * What a teacher's first ten seconds may say.
 *
 * These are invariants over every shape a class can be in, not the copy of one fixture. They
 * exist because both of the things they forbid shipped: a headline in display type that was a
 * fact about one child out of twenty-eight, and a percentage whose denominator lived in a
 * caption underneath it — where a screenshot leaves it behind.
 *
 * The matrix below is generated rather than listed, so a class shape nobody thought of is
 * still checked: every combination of roster/no roster, empty room to full room, nothing read
 * to everything read, and every assessed count either side of the minimum denominator.
 */

/**
 * Every number in a sentence, paired with what it is a count of.
 *
 * Two forms are legal — `22 of 27` and `71% of the 21` — and nothing else. What is left over
 * after both are struck out must contain no digits at all, which is the whole of the rule
 * "no number without a denominator" expressed as something a build can fail on.
 */
function denominated(text: string, demandLabel = ""): { ok: boolean; leftover: string; pairs: [number, number][]; shares: [number, number][] } {
  const pairs: [number, number][] = [];
  const shares: [number, number][] = [];
  const rest = text
    // The objective's own code — "1.3" — is a name, not a count, and it reaches the headline
    // because the headline now says *showed what*. It is struck out by identity rather than by
    // a pattern, so a real number can never be mistaken for one.
    .replace(demandLabel, demandLabel ? "" : "")
    .replace(/(\d+)% of the (\d+)/g, (_match, share: string, whole: string) => {
      shares.push([Number(share), Number(whole)]);
      return "";
    })
    .replace(/(\d+) of (?:the )?(\d+)/g, (_match, count: string, whole: string) => {
      pairs.push([Number(count), Number(whole)]);
      return "";
    });
  return { ok: !/\d/.test(rest), leftover: rest, pairs, shares };
}

/** Every class shape this page can be opened in. */
function everyShape(): ClassLeadInput[] {
  const shapes: ClassLeadInput[] = [];
  for (const hasRoster of [true, false]) {
    for (const inClass of [1, 6, 28]) {
      for (const turnedIn of [0, 1, 4, Math.min(6, inClass), inClass]) {
        if (turnedIn > inClass) continue;
        for (const awaitingReading of [0, 1, turnedIn]) {
          if (awaitingReading > turnedIn) continue;
          // Every student who turned in, not `turnedIn - awaitingReading`.
          //
          // The old ceiling encoded a model this product does not have: that a usable result
          // and a marked explanation are the same thing. They are not — `assessed` is a run
          // that produced a result for everything the work asks for, and several of those
          // requirements are read off decisions rather than off writing. A teacher-experience
          // review found a real class sitting at `awaitingReading: 21, assessed: 9`, which the
          // generator below could not produce, and the two sentences the page printed about
          // that class contradicted each other for exactly that reason.
          const assessedCeiling = turnedIn;
          for (const assessed of [0, 1, 4, assessedCeiling]) {
            if (assessed > assessedCeiling) continue;
            for (const demonstrated of [0, assessed]) {
              const percentDemonstrated = assessed >= MINIMUM_ASSESSED_FOR_A_STATE
                ? Math.round((demonstrated / assessed) * 100)
                : null;
              const rest = inClass - turnedIn;
              const working = Math.min(rest, 2);
              shapes.push({
                inClass,
                hasRoster,
                turnedIn,
                working,
                notStarted: hasRoster ? rest - working : null,
                awaitingReading,
                assessed,
                demonstrated,
                percentDemonstrated,
                state: assessed === 0 ? "not-assessed" : percentDemonstrated === null ? "too-few-assessed" : "strong",
                narratable: turnedIn >= 5,
                demandLabel: "everything 1.3 asks for",
              });
            }
          }
        }
      }
    }
  }
  return shapes;
}

describe("the ten-second lead", () => {
  it("never renders a number without the denominator it is a count of", () => {
    for (const shape of everyShape()) {
      const lead = classLeadFor(shape);
      for (const line of [lead.headline, lead.detail]) {
        const read = denominated(line, shape.demandLabel);
        expect(read.ok, `bare number in "${line}" (left over: "${read.leftover}") for ${JSON.stringify(shape)}`).toBe(true);
      }
    }
  });

  it("never states a count larger than the thing it is counted against", () => {
    for (const shape of everyShape()) {
      const lead = classLeadFor(shape);
      for (const line of [lead.headline, lead.detail]) {
        const read = denominated(line);
        for (const [count, whole] of read.pairs) {
          expect(count, `"${line}" counts ${count} out of ${whole}`).toBeLessThanOrEqual(whole);
        }
        // A share is a share of something, and the something is the number of students it was
        // computed over — never the class, and never a number this file rounded on its own.
        for (const [share, whole] of read.shares) {
          expect(share, `"${line}"`).toBeLessThanOrEqual(100);
          expect(whole, `"${line}"`).toBe(shape.assessed);
        }
      }
    }
  });

  it("never leads with a share the domain refused, and never at a denominator under the minimum", () => {
    for (const shape of everyShape()) {
      const lead = classLeadFor(shape);
      if (!lead.headline.includes("%")) continue;
      expect(shape.percentDemonstrated).not.toBeNull();
      expect(shape.assessed).toBeGreaterThanOrEqual(MINIMUM_ASSESSED_FOR_A_STATE);
      // And the denominator is in the headline itself, because the caption is what a
      // screenshot pasted into a department report leaves behind.
      expect(lead.headline).toContain(`of the ${shape.assessed}`);
    }
  });

  it("says a refusal in the words the refusal is defined by, and never as a low result", () => {
    for (const shape of everyShape()) {
      const lead = classLeadFor(shape);
      if (shape.turnedIn === 0 || shape.awaitingReading > 0) continue;
      if (shape.assessed > 0 && shape.percentDemonstrated === null) {
        expect(lead.note, JSON.stringify(shape)).toContain(`Under ${MINIMUM_ASSESSED_FOR_A_STATE}`);
      }
    }
  });

  it("leads with who is not in while nothing has been turned in, and with the reading once work arrives", () => {
    const roomOf = (over: Partial<ClassLeadInput>): ClassLeadInput => ({
      inClass: 28, hasRoster: true, turnedIn: 0, working: 19, notStarted: 9, awaitingReading: 0,
      assessed: 0, demonstrated: 0, percentDemonstrated: null, state: "not-assessed", narratable: false,
      demandLabel: "everything 1.3 asks for", ...over,
    });
    // Minute five. The nine at the door are the only thing a teacher can act on.
    expect(classLeadFor(roomOf({})).headline).toBe("9 of 28 have not started.");
    // Minute thirty. The pile is the job, and the way into it is named.
    const mid = classLeadFor(roomOf({ turnedIn: 22, working: 2, notStarted: 3, awaitingReading: 22 }));
    expect(mid.headline).toBe("22 of 28 turned in. 22 of 22 still to read.");
    expect(mid.action).toEqual({ label: "Read the 22 explanations", route: "reading" });
    // A single unread explanation is still the job, and it is still the thing to do next.
    expect(classLeadFor(roomOf({ turnedIn: 22, awaitingReading: 1, assessed: 21, demonstrated: 15, percentDemonstrated: 71, state: "strong" })).action)
      .toEqual({ label: "Read the 1 explanation", route: "reading" });
  });

  it("only puts the assessment in the headline once every explanation has been read", () => {
    for (const shape of everyShape()) {
      const lead = classLeadFor(shape);
      if (shape.awaitingReading > 0) {
        expect(lead.headline, JSON.stringify(shape)).not.toContain("%");
        expect(lead.action?.route).toBe("reading");
      }
    }
  });

  it("invents no denominator for a class nobody has arrived in", () => {
    // Minute zero: no list pasted, nobody signed in, nothing to count. "0 of the 0 students
    // BOW has seen" is a denominator made of nothing, which is the same disease as no
    // denominator at all.
    const nobody = classLeadFor({
      inClass: 0, hasRoster: false, turnedIn: 0, working: 0, notStarted: null, awaitingReading: 0,
      assessed: 0, demonstrated: 0, percentDemonstrated: null, state: null, narratable: false,
      demandLabel: "everything the work had to show",
    });
    expect(nobody.headline).toBe("Nothing turned in yet.");
    expect(denominated(nobody.headline).ok).toBe(true);
    expect(denominated(nobody.detail).ok).toBe(true);
  });

  it("counts the class BOW can see, and says which class that is when there is no list", () => {
    const seen = classLeadFor({
      inClass: 6, hasRoster: false, turnedIn: 4, working: 1, notStarted: null, awaitingReading: 0,
      assessed: 0, demonstrated: 0, percentDemonstrated: null, state: "not-assessed", narratable: false,
      demandLabel: "everything the work had to show",
    });
    expect(seen.headline).toContain("students BOW has seen");
    // Without a list there is no missing student to name, and the lead does not invent one.
    expect(seen.headline).not.toContain("not started");
  });
});
