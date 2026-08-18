import { describe, expect, it } from "vitest";
import { buildSubmission } from "../../test/runChallenge";
import { buildPopUpSubmission } from "../../test/runPopUp";
import { recapFor } from ".";
import { RECAP_CONCEPTS, RECAP_TOPIC_ORDER } from "./types";
import type { EvidenceEvent } from "../evidence/types";
import type { RunRecap } from "./types";

/**
 * The promises this surface makes about a child, held as tests.
 *
 * Every one of these is a sentence somebody could otherwise write into this product by
 * accident in an afternoon: a count that stands for the student, a topic that reads like a
 * failure when the run simply never asked, a scaffold rendered as a mistake, a line about
 * writing nobody has read. The point of the file is that none of them can be added quietly.
 */

const BASKETBALL = "basketball" as const;
const POPUP = "food-truck" as const;

function recapOf(record: { sessionId: string; log: unknown[] }, worldId: typeof BASKETBALL | typeof POPUP): RunRecap {
  const recap = recapFor(worldId, record.sessionId, record.log as EvidenceEvent[]);
  expect(recap).not.toBeNull();
  return recap!;
}

function everyNote(recap: RunRecap) {
  return recap.topics.flatMap((topic) => topic.notes);
}

function everyWord(recap: RunRecap): string {
  return [
    ...recap.topics.map((topic) => topic.heading),
    ...everyNote(recap).map((note) => note.text),
  ].join(" ");
}

/** Four students, and they are the four this surface has to be true for. */
const RECORDS = {
  /** Played it all, engaged with every beat. */
  confident: { world: BASKETBALL, submission: buildSubmission({ setupId: "teammate-share", countCompletion: true, reserveSeat: true, takeClinics: true }) },
  /** Reached the end having walked past whole beats without touching them. */
  sparse: { world: POPUP, submission: buildPopUpSubmission({ skipTipClaims: true, closeByHand: true }) },
  /** Used every piece of help the run offers. */
  scaffolded: { world: POPUP, submission: buildPopUpSubmission({ scaffold: ["owed-up-front", "cash-to-plan", "first-order", "swap-gap", "opening", "repair"] }) },
  /** Got things wrong, corrected some, and grabbed at money that was already gone. */
  wrong: { world: POPUP, submission: buildPopUpSubmission({ fumbleSums: ["owed-up-front", "swap-gap"], reachForCommitted: 3 }) },
} as const;

const RUNS = {
  confident: () => recapOf(RECORDS.confident.submission, RECORDS.confident.world),
  sparse: () => recapOf(RECORDS.sparse.submission, RECORDS.sparse.world),
  scaffolded: () => recapOf(RECORDS.scaffolded.submission, RECORDS.scaffolded.world),
  wrong: () => recapOf(RECORDS.wrong.submission, RECORDS.wrong.world),
} as const;

describe("nothing on this surface comes from anywhere but this student's own log", () => {
  it("names, for every sentence it writes, the events in this log that produced it", () => {
    for (const [name, record] of Object.entries(RECORDS)) {
      const recap = recapOf(record.submission, record.world);
      const ids = new Set(record.submission.log.map((event) => event.id));
      for (const note of everyNote(recap)) {
        if (note.kind === "absence") {
          // An absence is the one note with no event behind it, because there is no event.
          expect(note.eventRefs).toHaveLength(0);
          continue;
        }
        expect(note.eventRefs.length, `${name}: “${note.text}”`).toBeGreaterThan(0);
        for (const ref of note.eventRefs) expect(ids.has(ref), `${name}: ${ref}`).toBe(true);
      }
    }
  });

  it("refuses a session that is not the one asked for, even when the log is right there", () => {
    const mine = buildPopUpSubmission({ seatCode: "7" });
    const theirs = buildPopUpSubmission({ seatCode: "9" });
    expect(mine.sessionId).not.toEqual(theirs.sessionId);
    // Both logs in one array — a shared machine, a replayed export, a bug upstream. The
    // recap has to be about the run it says it is about and about nothing else.
    const mixed: EvidenceEvent[] = [...mine.log, ...theirs.log];
    const recap = recapFor(POPUP, mine.sessionId, mixed)!;
    const mineIds = new Set(mine.log.map((event) => event.id));
    for (const note of everyNote(recap)) {
      for (const ref of note.eventRefs) expect(mineIds.has(ref)).toBe(true);
    }
  });

  it("has nothing to say about a session with no events of its own", () => {
    const record = buildPopUpSubmission();
    expect(recapFor(POPUP, "somebody-elses-session", record.log)).toBeNull();
  });
});

describe("no sentence appears about a decision the student never faced", () => {
  it("says the beat never came up rather than describing it", () => {
    const recap = RUNS.sparse();
    const jar = recap.topics.find((topic) => topic.id === "not-enough-for-everything")!;
    expect(jar.neverCameUp).toBe(true);
    expect(jar.notes).toHaveLength(1);
    expect(jar.notes[0]!.kind).toBe("absence");
    expect(jar.notes[0]!.text).toContain("never came up");
    // And the words of that beat appear nowhere on the page at all.
    expect(everyWord(recap)).not.toMatch(/cool box|night cleaner|painted sign/i);
  });

  it("carries every topic in both worlds even when a run reached almost none of them", () => {
    const stopped = recapOf(
      { sessionId: buildPopUpSubmission().sessionId, log: buildPopUpSubmission().log.slice(0, 4) },
      POPUP,
    );
    expect(stopped.topics.map((topic) => topic.id)).toEqual([...RECAP_TOPIC_ORDER]);
    const absent = stopped.topics.filter((topic) => topic.neverCameUp);
    expect(absent.length).toBeGreaterThan(0);
    // An absence is a sentence about the run, never a zero and never an empty measure.
    for (const topic of absent) {
      expect(topic.notes).toHaveLength(1);
      expect(topic.notes[0]!.text).toMatch(/never|did not get as far|stopped before|did not reach/i);
    }
  });
});

describe("a student who used a scaffold is described as having used one", () => {
  it("writes the help down as help, and never as a failure", () => {
    const recap = RUNS.scaffolded();
    const support = everyNote(recap).filter((note) => note.kind === "support");
    expect(support.length).toBeGreaterThan(0);
    for (const note of support) {
      expect(note.text).toMatch(/help|Show the answer/);
      expect(note.text).not.toMatch(/fail|wrong|could not|cheat|should have|did not manage/i);
    }
  });

  it("says a supplied answer limits what the run shows, without saying anything about the student", () => {
    const supplied = recapOf(buildPopUpSubmission({ missSums: ["cash-to-plan"], scaffold: [] }), POPUP);
    // A run with a wrong answer still describes the correction rather than the child.
    for (const note of everyNote(supplied)) {
      expect(note.text).not.toMatch(/\byou (?:are|seem|struggle|need|cannot|always|never)\b/i);
    }
  });

  it("keeps a mistake and what happened next in the same sentence", () => {
    const recap = RUNS.wrong();
    const corrections = everyNote(recap).filter((note) => note.kind === "correction");
    expect(corrections.length).toBeGreaterThan(0);
    for (const note of corrections) {
      expect(note.text).toMatch(/changed it to|did not match|went again/);
    }
  });
});

describe("no number on this surface stands for the student", () => {
  it("writes no score, level, band, percentage or count of how it went", () => {
    for (const build of Object.values(RUNS)) {
      const words = everyWord(build());
      expect(words).not.toMatch(/\bscore|\bpoints?\b|\blevel\b|\bmastery\b|\bgrade[sd]?\b|\bbadge\b|\brating\b/i);
      expect(words).not.toMatch(/\d+\s*(?:\/|out of)\s*\d+/);
      expect(words).not.toMatch(/\d+\s?%/);
      expect(words).not.toMatch(/\bdemonstrated\b|\bdeveloping\b|\bnot yet\b|\bproficien/i);
    }
  });

  it("prints no bare count of how many topics went one way or the other", () => {
    const recap = RUNS.confident();
    // Every figure on the page is one the student put into the run. The strongest form of
    // that rule available to a test: nothing counts the topics.
    const counts = everyWord(recap).match(/\b\d+\s+(?:of\s+\d+|topics|sections|ideas)\b/gi) ?? [];
    expect(counts).toEqual([]);
  });
});

describe("nothing here is about the writing", () => {
  it("never quotes, mentions or characterises the explanation", () => {
    const words = "Marisol was worth it because the queue on the fireworks night was out of the gate.";
    const recap = recapOf(buildPopUpSubmission({ writeUpText: words }), POPUP);
    const page = everyWord(recap);
    expect(page).not.toContain("Marisol was worth it");
    expect(page).not.toMatch(/\bexplanation\b|\bwrite-?up\b|\bsentences you wrote\b|\bparagraph\b/i);
  });
});

describe("both worlds give back the same kind of thing", () => {
  it("carries the same six ideas, in the same order, under the same names", () => {
    const season = RUNS.confident();
    const market = recapOf(buildPopUpSubmission(), POPUP);
    expect(season.topics.map((topic) => topic.id)).toEqual(market.topics.map((topic) => topic.id));
    expect(season.topics.map((topic) => topic.concept.term)).toEqual(market.topics.map((topic) => topic.concept.term));
    expect(season.topics.map((topic) => topic.concept.means)).toEqual(market.topics.map((topic) => topic.concept.means));
    for (const topic of [...season.topics, ...market.topics]) {
      expect(topic.concept).toBe(RECAP_CONCEPTS[topic.id]);
    }
  });

  it("tells each story in its own words and never in the other world's", () => {
    const season = everyWord(RUNS.confident());
    const market = everyWord(recapOf(buildPopUpSubmission(), POPUP));
    expect(season).toMatch(/Avery/);
    expect(season).not.toMatch(/tray|booth|night market|tips jar|Marisol|cushion/i);
    expect(market).toMatch(/booth|tray|Saturday/i);
    expect(market).not.toMatch(/Avery|showcase|Week 5|Week 3|clinic|course seat/i);
  });

  it("gives a heading and a concept to every topic in both worlds, always", () => {
    for (const recap of [RUNS.confident(), RUNS.sparse(), RUNS.scaffolded(), RUNS.wrong()]) {
      for (const topic of recap.topics) {
        expect(topic.heading.length).toBeGreaterThan(0);
        expect(topic.concept.term.length).toBeGreaterThan(0);
        expect(topic.notes.length).toBeGreaterThan(0);
      }
    }
  });
});

describe("the same figures the run used", () => {
  it("says back the amounts the student actually typed and placed", () => {
    const record = buildPopUpSubmission({ spotId: "bridge-gate", countCatering: true, coverLine: "cut" });
    const recap = recapOf(record, POPUP);
    const words = everyWord(recap);
    // The booth this student took, at this world's price, and the line they named behind the
    // money with a rule on it. Both are their own decisions, printed back unchanged.
    expect(words).toContain("Bridge Gate");
    expect(words).toContain("$480");
    expect(words).toContain("Your cut");
  });
});
