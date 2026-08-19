import { describe, expect, it } from "vitest";
import { analyseClass, classRoll } from "./analysis";
import { shareOutCandidates, shareOutReading, shareOutSlides } from "./shareOut";
import { buildSubmission } from "../test/runChallenge";
import { buildPopUpSubmission } from "../test/runPopUp";
import type { AttributedSubmission, SubmissionRecord } from "../platform/classes/types";

/**
 * What a share-out is allowed to offer, stated as three rules rather than as three examples.
 *
 * All three were reproduced by an independent reviewer on a running class, and each one is a
 * different way of the same failure: the list a teacher trusts to be *selection* was not one.
 * It offered one paragraph twice under two opposite reasons, it offered a student the teacher
 * had removed from the roster, and in a class where students chose their world it offered
 * four Basketball candidates and silently dropped a finished market run with a write-up on it
 * — while a market-only class offered the same run normally, which is what made it a parity
 * bug rather than a missing feature.
 *
 * So: **one submission, one card. Never a submission from outside the class. And the same
 * rules in every world.** The last one is the one that needs a test rather than a reading,
 * because the way it broke was a per-student reason reading a Basketball-only field
 * (`resolution`) that is `null` for every market run ever submitted, which no amount of
 * looking at the market's code would have shown.
 */

const attributed = (submission: SubmissionRecord): AttributedSubmission =>
  ({ ...submission, assignmentId: "assignment-TEST-legacy" });

/** Two Basketball runs that decided differently, and both wrote. */
function basketballPair(): AttributedSubmission[] {
  return [
    attributed(buildSubmission({
      seatCode: "1", setupId: "cousin-room", reserveSeat: true, countOutcome: true,
      defenseText: "I reserved the seat early so that money was gone before Week 5 could touch it.",
    })),
    attributed(buildSubmission({
      seatCode: "2", setupId: "gym-sublet", takeClinics: true, countCompletion: true, split: { goal: 0.8, reserve: 0.05 },
      defenseText: "I counted the bonus and put almost everything on the course, which left me thin.",
    })),
  ];
}

/**
 * A finished market run beside one that stopped early — the exact shape the reviewer had, and
 * the shape that produced nothing at all. One write-up in the world means neither pairwise
 * rule can fire, so everything rests on the per-student reasons.
 */
function marketPair(seats: readonly [string, string] = ["3", "4"]): AttributedSubmission[] {
  return [
    attributed(buildPopUpSubmission({
      seatCode: seats[0], spotId: "bridge-gate", countCatering: true,
      writeUpText: "I kept the cushion big enough for the generator, which cost me a smaller cut.",
    })),
    attributed(buildPopUpSubmission({ seatCode: seats[1], spotId: "middle-row", stopAfterSaturdayThree: true })),
  ];
}

function candidatesOf(submissions: readonly AttributedSubmission[]) {
  return shareOutCandidates(analyseClass([...submissions]).rows, submissions);
}

describe("a candidate list never offers one submission twice", () => {
  it("carries one card per submission however many rules it earns", () => {
    // These five between them earn contrast, same-call, an absorbed loss and a shortfall, so
    // several submissions qualify under more than one rule.
    const submissions = [
      ...basketballPair(),
      ...marketPair(),
      attributed(buildSubmission({
        seatCode: "5", setupId: "teammate-share", split: { goal: 0.3, reserve: 0.5 },
        defenseText: "I kept a big reserve because the bonus is not guaranteed.",
      })),
    ];
    const candidates = candidatesOf(submissions);
    expect(candidates.length).toBeGreaterThan(0);
    expect(new Set(candidates.map((candidate) => candidate.sessionId)).size).toBe(candidates.length);
  });

  it("never offers one paragraph under two reasons at once", () => {
    const candidates = candidatesOf(basketballPair());
    const byQuote = new Map<string, string[]>();
    for (const candidate of candidates) {
      if (!candidate.quote) continue;
      byQuote.set(candidate.quote, [...(byQuote.get(candidate.quote) ?? []), candidate.reason]);
    }
    for (const reasons of byQuote.values()) expect(reasons).toHaveLength(1);
  });
});

describe("the class the share-out offers is the class the class page counts", () => {
  it("does not offer a seat the teacher removed from the roster", () => {
    const submissions = [...basketballPair(), ...marketPair()];
    const roll = classRoll({
      rows: analyseClass(submissions).rows,
      roster: [
        { seatCode: "1", removedAt: null },
        { seatCode: "2", removedAt: 1_780_000_000_000 },
        { seatCode: "3", removedAt: null },
        { seatCode: "4", removedAt: null },
      ],
    });
    const candidates = shareOutCandidates(roll.rows, submissions);
    expect(candidates.map((candidate) => candidate.seatCode)).not.toContain("2");
    expect(candidates.length).toBeGreaterThan(0);
  });

  it("offers a seat's latest attempt and not the one before it", () => {
    const first = attributed({ ...buildSubmission({ seatCode: "1", defenseText: "First go." }), sessionId: "session-first", submittedAt: 10 });
    const second = attributed({ ...buildSubmission({ seatCode: "1", setupId: "gym-sublet", defenseText: "Second go, and I moved the reserve." }), sessionId: "session-second", submittedAt: 20 });
    const submissions = [first, second, ...basketballPair().slice(1)];
    const roll = classRoll({ rows: analyseClass(submissions).rows, roster: [{ seatCode: "1" }, { seatCode: "2" }] });
    const candidates = shareOutCandidates(roll.rows, submissions);
    expect(candidates.map((candidate) => candidate.sessionId)).not.toContain("session-first");
  });
});

describe("every world is offered on the same terms", () => {
  it("offers a finished market run that a Basketball run in the same shape would be offered for", () => {
    const market = candidatesOf(marketPair());
    expect(market.map((candidate) => candidate.worldId)).toContain("food-truck");
  });

  it("offers the market's work in a mixed class exactly as it does in a market class", () => {
    // The regression: four Basketball candidates and nothing from the market, in a class the
    // product itself invited to choose. What a world is offered can only depend on that
    // world's own work — never on who else is in the room.
    const market = marketPair();
    const mixed = [...basketballPair(), ...market];
    const inMixed = candidatesOf(mixed).filter((candidate) => candidate.worldId === "food-truck");
    const alone = candidatesOf(market);
    expect(inMixed.length).toBeGreaterThan(0);
    expect(inMixed.map((candidate) => `${candidate.seatCode} ${candidate.kind} ${candidate.reason}`))
      .toEqual(alone.map((candidate) => `${candidate.seatCode} ${candidate.kind} ${candidate.reason}`));
  });

  it("says the same thing about a Basketball class as about a market class of the same shape", () => {
    // Both worlds put the same question to a student — did the plan absorb what landed on it
    // — so a class of either kind gets at least one candidate out of it. Before this, only
    // one of the two could.
    for (const submissions of [basketballPair(), marketPair()]) {
      expect(candidatesOf(submissions).length).toBeGreaterThan(0);
    }
  });
});

describe("what reaches the projector", () => {
  it("carries nothing of the teacher's own onto a slide", () => {
    const submissions = basketballPair();
    const note = "Start here — she protected the backup money";
    const slides = shareOutSlides({
      items: submissions.map((submission, index) => ({ sessionId: submission.sessionId, seatCode: submission.seatCode, note, order: index })),
      submissions,
      named: false,
      nameFor: (seatCode) => `Seat ${seatCode}`,
      summaryFor: () => "Eight Weeks to the Showcase",
    });
    expect(slides.length).toBe(submissions.length);
    // The note is not a field to be blanked — it is not on the object the projector renders,
    // so no future edit to the frame can print it.
    expect(JSON.stringify(slides)).not.toContain(note);
    for (const slide of slides) expect(slide).not.toHaveProperty("note");
  });

  it("names the plans positionally unless the teacher asked for names", () => {
    const submissions = basketballPair();
    const items = submissions.map((submission, index) => ({ sessionId: submission.sessionId, seatCode: submission.seatCode, note: "", order: index }));
    const anonymous = shareOutSlides({ items, submissions, named: false, nameFor: () => "Ana R.", summaryFor: () => "" });
    expect(anonymous.map((slide) => slide.title)).toEqual(["Plan A", "Plan B"]);
    const named = shareOutSlides({ items, submissions, named: true, nameFor: () => "Ana R.", summaryFor: () => "" });
    expect(named.every((slide) => slide.title === "Ana R.")).toBe(true);
  });
});

/**
 * A reason has to tell one child's work apart from the next, or it is not a reason.
 *
 * The list a teacher gets two minutes before a lesson had *"Their cushion covered the
 * generator in full."* against seven of its candidates — more than the other three reasons put
 * together, and a property of **every** student who ran that story, which the class page states
 * on the same data as *10 of 10*. Reading seven paragraphs to discover they are interchangeable
 * is exactly the two minutes a teacher does not have, and it costs the trust in the four
 * candidates that were selective.
 *
 * The invariant is not a threshold number. It is: **nothing is offered under a reason that most
 * of a story earned**, whatever the reason says and whichever story it came from.
 */
describe("a reason that does not discriminate is not offered", () => {
  /** Ten market runs that all did the same thing, plus two that wrote something worth reading. */
  function aStoryWhereEverybodyDidTheSameThing(): AttributedSubmission[] {
    return Array.from({ length: 10 }, (_, index) =>
      attributed(buildPopUpSubmission({
        seatCode: String(index + 1),
        spotId: index % 2 === 0 ? "bridge-gate" : "middle-row",
        countCatering: index % 3 === 0,
        writeUpText: index === 0
          ? "I kept the cushion big enough for the generator, and gave up my own cut on Saturday 2 to do it."
          : index === 1
            ? "I went for the big booth because the demand was worth more than the fee, and I still had cash on the last Saturday."
            : "I planned it out and it worked.",
      })));
  }

  it("offers nothing under a reason most of the story earned", () => {
    const submissions = aStoryWhereEverybodyDidTheSameThing();
    const rows = analyseClass([...submissions]).rows;
    const reading = shareOutReading(rows, submissions);
    const perReason = new Map<string, number>();
    for (const candidate of reading.candidates) {
      perReason.set(candidate.reason, (perReason.get(candidate.reason) ?? 0) + 1);
    }
    for (const [reason, count] of perReason) {
      expect(count, `"${reason}" is offered against ${count} of ${rows.length} candidates`)
        .toBeLessThanOrEqual(Math.max(2, Math.floor(rows.length / 3)));
    }
  });

  it("says what it suppressed, and how much of the story it was true of", () => {
    const submissions = aStoryWhereEverybodyDidTheSameThing();
    const reading = shareOutReading(analyseClass([...submissions]).rows, submissions);
    expect(reading.tooCommon.length).toBeGreaterThan(0);
    for (const common of reading.tooCommon) {
      // Suppressed, not hidden: it comes back with its own count and denominator, which is
      // what makes it a fact for the debrief rather than a disappearance.
      expect(common.earned).toBeGreaterThan(Math.max(2, Math.floor(common.ran / 3)));
      expect(common.ran).toBeGreaterThanOrEqual(common.earned);
      expect(common.reason.length).toBeGreaterThan(0);
    }
    // And nothing it suppressed is still on the list under the same words.
    for (const common of reading.tooCommon) {
      expect(reading.candidates.map((candidate) => candidate.reason)).not.toContain(common.reason);
    }
  });

  it("keeps a pair, because two is a selection and not a category", () => {
    // The two-student class every small group is. A reason both of them earned is still the
    // reason to put those two beside each other.
    const reading = shareOutReading(analyseClass([...basketballPair()]).rows, basketballPair());
    expect(reading.candidates.length).toBeGreaterThan(0);
    expect(reading.tooCommon).toEqual([]);
  });

  it("never claims a different reason for two identical paragraphs", () => {
    // Two students who made the same call and wrote, word for word, the same thing. The claim
    // "and gave a different reason for it" was made against the two identical paragraphs
    // printed directly underneath it, because the comparison read a different field from the
    // one the card renders.
    const same = "I picked the cousin's room because it was the cheapest over eight weeks.";
    const submissions = [
      attributed(buildSubmission({ seatCode: "1", setupId: "cousin-room", defenseText: same })),
      attributed(buildSubmission({ seatCode: "2", setupId: "cousin-room", defenseText: same })),
      attributed(buildSubmission({ seatCode: "3", setupId: "cousin-room", defenseText: same })),
    ];
    const candidates = shareOutCandidates(analyseClass([...submissions]).rows, submissions);
    for (const candidate of candidates) {
      expect(candidate.reason).not.toContain("different reason");
    }
  });
});
