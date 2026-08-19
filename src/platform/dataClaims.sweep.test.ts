import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { handleApiRequest } from "../../server/handler";
import { memoryStore, type ClassStore } from "../../server/store";
import { PLAN_UNDER_PRESSURE } from "./challenges/registry";
import type { ClassCreation } from "./classes/types";
import { localOnlyTransport } from "./evidence/transports";
import type { JoinCard } from "./identity/types";
import { withoutComments } from "../test/source";

/**
 * The rest of what this product says about the data it holds — the claims the name scan was
 * never shaped to see.
 *
 * `src/educator/dataClaims.test.ts` enforces one rule beautifully: no screen may say BOW does
 * not hold a student's name. It holds them, by two doors, and the sentence that denied it was
 * the first thing a district reviewer read. This file is the same rule applied to the four
 * other things a product like this is tempted to promise — that something is **deleted**, that
 * something is **never sent**, that something is **encrypted**, that something is
 * **anonymous** — plus the one blind spot that let two of the original three defects sit in
 * the tree unseen.
 *
 * **The blind spot is comments.** Every drift scan in this repository strips them first, and
 * for a good reason stated in `src/test/source.ts`: a scan that read comments fails the moment
 * one quotes the thing it is warning about, which happened three times in one evening to three
 * different people. But two of the false claims found in this sweep were *only* in comments —
 * `classes/types.ts` opened with "there are no student accounts, no roster, no names and no
 * email addresses" and `identity/types.ts` said the only name in the system was one a teacher
 * typed, twenty-five lines above the field recording the other door. Neither was reachable by
 * any test here. A file-head comment is not decoration: it is what the next engineer believes,
 * and both of these were read and believed for a release.
 *
 * So comments are scanned, and the landmine is defused by construction rather than by
 * exemption: **a quoted claim is exempt, an asserted one is not.** Anything inside `"..."`,
 * `*"..."*` or backticks is removed before the rules run, which is already how this codebase
 * quotes a sentence it is retiring. To write the old lie down you have to mark it as a
 * quotation, which is the thing that makes it safe to write down.
 *
 * What this file does **not** do is decide whether any of it satisfies a law, a framework or a
 * district. It checks that a sentence is true of the code, which is the only claim a test can
 * make.
 */

const SOURCE_ROOT = "src";

function sources(root = SOURCE_ROOT): { path: string; text: string }[] {
  const found: { path: string; text: string }[] = [];
  for (const name of readdirSync(root).sort()) {
    const path = join(root, name);
    if (statSync(path).isDirectory()) found.push(...sources(path));
    else if (/\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name)) found.push({ path, text: readFileSync(path, "utf8") });
  }
  return found;
}

/**
 * Every sentence a reader could meet, split at string boundaries as well as at full stops.
 *
 * `dataClaims.test.ts` splits on `[.!?]` alone, which is right for its rules and wrong for
 * these: a claim keyword is a single common word, so a run of code with no full stop in it
 * becomes one four-hundred-character "sentence" that collects a keyword from a template URL
 * and a scope word from an identifier, and reports a defect that is not there. A quote mark is
 * a claim boundary — the copy starts and stops there — so treating it as a sentence boundary
 * costs nothing and removes every one of those.
 */
function claims(text: string): string[] {
  return withoutComments(text)
    .replace(/\s+/g, " ")
    .replace(/["`]/g, ". ")
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    // A claim a person reads is a sentence. Past this length it is a run of code that happens
    // to contain English, and the register would be keyed to punctuation rather than to words.
    .filter((sentence) => sentence.length > 0 && sentence.length <= 400);
}

/**
 * The claim has to be about this product before it is a claim about this product.
 *
 * Both worlds talk about money leaving and being spent — *"cash Avery does not spend that week
 * goes nowhere"* is the fiction, not the privacy notice, and a scan that could not tell them
 * apart would train everybody to ignore it.
 */
const ABOUT_THE_PRODUCT = /\b(?:BOW|class|classes|evidence|account|roster|teacher|model|browser|computer|laptop|device|server|seat|submission|writing|names?|work)\b/i;

/**
 * A denial is dangerous when it is absolute, and merely a status when it is not.
 *
 * *"That did not send."* and *"Your plan is saved, but not sent yet."* are true of this second
 * and make no promise about anything. *"Nothing is sent"* is a claim about the product for all
 * time. So `not` is deliberately absent here and `never`, `nothing` and `no` are deliberately
 * present, which is the same distinction `dataClaims.test.ts` draws between a qualified name
 * and a bare one.
 *
 * The gap is five words rather than the name rule's two, because a sending claim puts a subject
 * between the two halves — *"Nothing a student writes is ever sent to a model"* — and widening
 * it adds no offender to this tree.
 */
const DENIED_SENDING = /\b(?:never|nothing|no)\b(?:\s+\w+){0,5}\s+(?:sent|sends|send|leaves?|transmitted|uploaded|shared)\b/i;

/** What makes a deletion claim a sweep rather than a fact about one row. */
const ABSOLUTE = /\b(?:everything|every|nothing|all|classes|evidence)\b/i;

const SHAPES: Record<string, (sentence: string) => boolean> = {
  /** "everything they turned in ... is deleted" — a promise about a whole class of data. */
  deleted: (sentence) => ABSOLUTE.test(sentence) && /\b(?:deleted|erased|destroyed)\b/i.test(sentence),
  /** "it is never sent to a model", "Your work stays on this computer". */
  sent: (sentence) =>
    DENIED_SENDING.test(sentence) || /\bstays? on (?:this|your)\b/i.test(sentence) || /\bgoes nowhere\b/i.test(sentence),
  /** Any claim about cryptography, which a reviewer will check against the vault. */
  encrypted: (sentence) => /\bencrypt(?:ed|ion|s)?\b/i.test(sentence) || /\bend-to-end\b/i.test(sentence),
  /** Nothing in this product claims it today. The rule exists so that adding one is a decision. */
  anonymous: (sentence) => /\banonym/i.test(sentence),
};

function shapesIn(sentence: string): string[] {
  if (!ABOUT_THE_PRODUCT.test(sentence)) return [];
  return Object.entries(SHAPES).filter(([, matches]) => matches(sentence)).map(([shape]) => shape);
}

/**
 * Every absolute claim this product makes about where a child's data goes, with the code that
 * makes it true. Keyed by the sentence, so rewording one into an unchecked claim fails.
 *
 * This is a register rather than an exemption list: nothing here is excused, everything here
 * has been read against the handler, the vault and the sweep that ship. Adding a row is a
 * deliberate act, and the thing being deliberate about is whether the new sentence is true.
 */
const CHECKED: { path: string; sentence: string; why: string }[] = [
  {
    path: "src/educator/MyClasses.tsx",
    sentence: "Classes and their evidence are kept for ${CLASS_RETENTION_DAYS} days, then deleted",
    why: "`server/retention.ts` sweeps `expiredClassCodes` hourly and calls `store.deleteClass`; the "
      + "figure is the constant the expiry is computed from rather than a number somebody typed",
  },
  {
    path: "src/educator/RealClassPages.tsx",
    sentence: "it is never sent to a model",
    why: "there is no model client in the tree and `connect-src 'self'` forbids the browser reaching "
      + "one — both asserted below",
  },
  {
    path: "src/educator/Roster.tsx",
    sentence: "everything you wrote back are deleted from BOW",
    why: "`store.eraseSeat` drops the roster row, the submissions, the checkpoints, the feedback and "
      + "the share-out entries for that seat — asserted below through the handler that ships",
  },
  {
    path: "src/educator/SampleRun.tsx",
    sentence: "Nothing is saved, nothing is sent, and no class is made",
    why: "the route runs on `localOnlyTransport`, whose `deliver` resolves without touching the "
      + "network — asserted below — and whose `join` never calls the class service",
  },
  {
    path: "src/educator/SignIn.tsx",
    sentence: "They are stored with the class, encrypted",
    why: "`server/vault.ts` seals every durable record with AES-256-GCM and a durable store with no "
      + "key refuses to start (`src/platform/classes/atRest.test.ts`)",
  },
  {
    path: "src/educator/SignIn.tsx",
    sentence: "A class and everything in it is deleted",
    why: "the same retention sweep; `dataClaims.test.ts` holds `expiresAt` to `CLASS_RETENTION_DAYS`",
  },
  {
    path: "src/platform/evidence/transports.ts",
    sentence: "Your work stays on this computer",
    why: "`localOnlyTransport.deliver` resolves without I/O, and a transport's promise is only ever "
      + "shown by the transport that makes it",
  },
];

// ---------------------------------------------------------------------------
// The same name rules, in the place no scan was looking
// ---------------------------------------------------------------------------

/** Denial bound to the verb it denies. The shape `dataClaims.test.ts` uses, on comments. */
const denied = (verbs: string) =>
  new RegExp(`\\b(?:never|not|nothing|cannot|can't|no)\\b(?:\\s+\\w+){0,2}\\s+(?:${verbs})\\b`, "i");

const DENIED_HOLDING = denied("see|sees|store|stores|hold|holds|keep|keeps|record|records|receive|receives|know|knows|collect|collects");
const DENIED_ASKING = denied("ask|asks|require|requires|need|needs");

/**
 * The list of nouns the README's own defect was made of, plural because the sweep is the
 * offence. "there is no name field on the teacher's account" is true and stays sayable.
 */
const BARE_DENIALS: readonly RegExp[] = [
  /\bno (?:student )?accounts\b/i,
  /\bno e-?mail addresses\b/i,
  /\bno (?:student |child(?:ren)?'s )?names\b/i,
];

/**
 * Exclusivity, with the one thing prose has that rendered copy does not: "names" as a verb.
 *
 * *"A tag only names a requirement the observer produces"* is a sentence about a tag, and the
 * flat rule convicts it. A determiner after the word is what tells them apart — a verb takes an
 * object, `the only name in the system` does not.
 */
const ONLY_A_NAME: readonly RegExp[] = [
  /\bthe only names?\b/i,
  /\bonly\s+(?:the\s+)?names?\b(?!\s+(?:an?|the|it|its|them|their|what|which|one)\b)/i,
];

const QUALIFIED_NAME = /\b(?:last|sur|full|real|legal|family)[- ]?names?\b/gi;
const A_NAME = /\bnames?\b/i;

/**
 * A denial is about a person, or it is about something else.
 *
 * Product prose says "does not need to name it again" and "the spec names seven objectives"
 * constantly, and neither is a claim about a child. Requiring the reach to carry a person or a
 * contact detail alongside the name is what separates them, and it keeps every sentence this
 * sweep exists for: *"never sees a student's email address, name or birthday"*, *"never asks a
 * student for a name of their own"*, *"asks for a name, an email address or a birthday"*.
 */
const ABOUT_A_PERSON = /\b(?:student|child|children|pupil|e-?mail|birthday|address)\b/i;

const REACH = 70;

function comments(text: string): string {
  const found: string[] = [];
  for (const block of text.matchAll(/\/\*[\s\S]*?\*\//g)) found.push(block[0]);
  for (const line of text.matchAll(/(^|[^:])(\/\/[^\n]*)/g)) found.push(line[2] ?? "");
  return found.join("\n");
}

/** A quoted claim is a record of what was said. An unquoted one is what this file says. */
function withoutQuotations(text: string): string {
  return text.replace(/\*"[\s\S]*?"\*/g, " ").replace(/"[^"]*"/g, " ").replace(/`[^`]*`/g, " ");
}

function nameDenialsIn(sentence: string): string[] {
  const found: string[] = [];
  for (const bare of BARE_DENIALS) {
    const match = bare.exec(sentence);
    if (match) found.push(`bare: ${match[0]}`);
  }
  if (ONLY_A_NAME.some((pattern) => pattern.test(sentence))) found.push("only");
  for (const [rule, pattern] of [["holds", DENIED_HOLDING], ["asks", DENIED_ASKING]] as const) {
    const match = pattern.exec(sentence);
    if (!match) continue;
    const reached = sentence.slice(match.index + match[0].length, match.index + match[0].length + REACH);
    if (A_NAME.test(reached.replace(QUALIFIED_NAME, " ")) && ABOUT_A_PERSON.test(reached)) found.push(rule);
  }
  return found;
}

/**
 * The same defect, in a comment this change does not own, listed rather than skipped — keyed by
 * the sentence, so the exemption covers exactly the claim it was written for.
 *
 * Delete the entry when the sentence goes.
 */
const ROUTED_ELSEWHERE: { path: string; sentence: string; why: string }[] = [
  {
    path: "src/App.tsx",
    sentence: "Nothing here asks for a name, an email address or a birthday",
    // Written over the student routes, and wrong twice: `/join` asks a student for a first name
    // in every class that has no list, and the "tap your name" step the same comment describes
    // was removed when the door stopped publishing the roster to anyone with the class code.
    why: "the open-join door asks the student for their own first name, and the step above it no longer exists",
  },
];

// ---------------------------------------------------------------------------

const NOW = 1_770_000_000_000;

function api(store: ClassStore) {
  // `query` is its own field on `ApiRequest` rather than part of the path, and erasure is the
  // one route in this file that takes one — a seat code with "?erase=1" glued to it parses as a
  // seat that does not exist, which answers 404 and would have read as a passing test.
  return (method: string, path: string, body?: unknown, headers: Record<string, string | undefined> = {}, query = "") =>
    handleApiRequest(
      { method, path, headers, query, ...(body !== undefined ? { body } : {}), clientId: "claim-sweep" },
      { store, now: () => NOW },
    );
}

describe("what this product promises about where a child's data goes", () => {
  it("makes no absolute claim about deletion, sending, encryption or anonymity that is not registered", () => {
    const offenders: string[] = [];
    for (const { path, text } of sources()) {
      for (const sentence of claims(text)) {
        const shapes = shapesIn(sentence);
        if (shapes.length === 0) continue;
        if (CHECKED.some((known) => known.path === path && sentence.includes(known.sentence))) continue;
        offenders.push(`${path} [${shapes.join(", ")}] — ${sentence.slice(0, 200)}`);
      }
    }
    expect(
      offenders,
      "a new promise about what BOW deletes, sends, encrypts or anonymises. Read it against the "
      + "code that would have to make it true, then add it to CHECKED with that reading written "
      + "down — or say something narrower that is true",
    ).toEqual([]);
  });

  it("fires on the shapes it exists for, rather than passing because it reads nothing", () => {
    for (const claim of [
      "Everything that student turned in is deleted from BOW.",
      "Nothing a student writes is ever sent to a model.",
      "Their answers are encrypted before they leave the browser.",
      "Every submission a teacher reads is anonymous.",
    ]) {
      expect(shapesIn(claim), claim).not.toEqual([]);
    }
    // And nothing fires on the fiction, or the world's own money would be a privacy claim.
    for (const fiction of [
      "Cash Avery does not spend this week goes nowhere.",
      "Your plan is saved, but not sent yet.",
      "That did not send. Try again.",
    ]) {
      expect(shapesIn(fiction), fiction).toEqual([]);
    }
  });

  it("lets no comment deny that BOW holds a student's name", () => {
    const offenders: string[] = [];
    for (const { path, text } of sources()) {
      const prose = withoutQuotations(comments(text)).replace(/\s+/g, " ");
      for (const sentence of prose.split(/(?<=[.!?])\s+/)) {
        const offences = nameDenialsIn(sentence);
        if (offences.length === 0) continue;
        if (ROUTED_ELSEWHERE.some((known) => known.path === path && sentence.includes(known.sentence))) continue;
        offenders.push(`${path} [${offences.join(", ")}] — ${sentence.trim().slice(0, 180)}`);
      }
    }
    expect(
      offenders,
      "a file-head comment saying BOW does not hold what it holds. It is what the next engineer "
      + "believes, and two of these were believed for a release. Quote the retired sentence if it "
      + "has to be recorded — a quoted claim is exempt, an asserted one is not",
    ).toEqual([]);
  });

  it("catches the two comments that shipped, and clears the prose that only looks like them", () => {
    for (const shipped of [
      "There are no student accounts, no roster, no names and no email addresses.",
      "so the only name in the system is one a teacher typed, about their own students",
      "Nothing here asks for a name, an email address or a birthday.",
    ]) {
      expect(nameDenialsIn(shipped).length, shipped).toBeGreaterThan(0);
    }
    for (const innocent of [
      "A tag only names a requirement Basketball's observer actually produces.",
      "The line above has said what the rule is, so this one does not need to name it again.",
      "§4.3 of the spec names seven prerequisite objectives and says the challenge does not teach them.",
      "There is no name field on the teacher's account.",
      "A class that has no roster still reads exactly as it did.",
      "BOW does not ask a student for a last name.",
    ]) {
      expect(nameDenialsIn(innocent), innocent).toEqual([]);
    }
  });
});

describe("the receipts behind the three claims a reviewer would check first", () => {
  /** *"it is never sent to a model"* — the strongest claim in the product, and the cheapest to hold. */
  it("has no model client to send anything to, and a policy that forbids reaching one", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const packages = [...Object.keys(manifest.dependencies ?? {}), ...Object.keys(manifest.devDependencies ?? {})];
    const modelClients = /openai|anthropic|generativeai|@google\/gen|cohere|mistral|replicate|huggingface|langchain/i;
    expect(packages.filter((name) => modelClients.test(name)), "a model SDK in the manifest").toEqual([]);

    const importers: string[] = [];
    for (const { path, text } of [...sources("src"), ...sources("server")]) {
      for (const match of withoutComments(text).matchAll(/from\s+"([^"]+)"/g)) {
        if (modelClients.test(match[1] ?? "")) importers.push(`${path} → ${match[1]}`);
      }
    }
    expect(importers, "a module importing a model client").toEqual([]);

    // And the half a reviewer can check from outside: the browser may not reach one either.
    expect(readFileSync("index.html", "utf8")).toContain("connect-src 'self'");
  });

  /** *"Nothing is saved, nothing is sent, and no class is made."* — the sample run's whole promise. */
  it("sends nothing at all on the transport whose promise is that nothing is sent", async () => {
    const transport = localOnlyTransport();
    const fetched = vi.fn();
    const before = globalThis.fetch;
    globalThis.fetch = fetched;
    try {
      const joined = await transport.join("DEMO1");
      const delivered = await transport.deliver({
        classCode: "", seatCode: "", sessionId: "s", challengeId: PLAN_UNDER_PRESSURE.id,
        challengeVersion: "1", log: [],
      });
      expect(joined.ok, "the local transport joins without a service").toBe(true);
      expect(delivered.ok, "and reports the delivery it did not make as done").toBe(true);
    } finally {
      globalThis.fetch = before;
    }
    expect(fetched, "the transport that promises nothing is sent sent something").not.toHaveBeenCalled();
    expect(transport.promise).toBe("Your work stays on this computer. Nothing is sent anywhere.");
  });

  /**
   * *"Their name, everything they turned in and everything you wrote back are deleted from
   * BOW."* — the sentence a parent's request rests on, held to the store rather than to the
   * button. Removing a student is a tombstone on purpose; erasing is the other request, and the
   * copy promises the stronger one.
   */
  it("erases the name, the work and the notes when the erase button says it does", async () => {
    const store = memoryStore();
    const call = api(store);
    const teacher = (await call("POST", "/auth/teacher", { email: "ms.reyes@example.org", password: "a long enough passphrase" })).body as { token: string };
    const bearer = { authorization: `Bearer ${teacher.token}` };
    const made = (await call("POST", "/classes", { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id }, bearer)).body as ClassCreation;
    const cards = ((await call("POST", `/classes/${made.code}/roster`, { names: ["Ana R.", "Devon P."] }, bearer)).body as { cards: JoinCard[] }).cards;
    const seat = cards[0]!.seatCode;

    await call("POST", `/classes/${made.code}/submissions`, {
      classCode: made.code, seatCode: seat, sessionId: "s1", challengeId: PLAN_UNDER_PRESSURE.id,
      challengeVersion: "1", log: [],
    });
    await call("POST", `/classes/${made.code}/feedback`, { seatCode: seat, sessionId: "s1", body: "Good use of the reserve.", flagged: false }, bearer);

    const erased = await call("DELETE", `/classes/${made.code}/roster/${seat}`, undefined, bearer, "erase=1");
    expect(erased.status, JSON.stringify(erased.body)).toBe(200);

    const roster = (await call("GET", `/classes/${made.code}/roster`, undefined, bearer)).body as { roster: { seatCode: string; displayName: string }[] };
    expect(roster.roster.map((row) => row.seatCode), "the erased seat is off the roster entirely").toEqual([cards[1]!.seatCode]);
    expect(JSON.stringify(roster.roster), "and the name is not anywhere in what comes back").not.toContain("Ana R.");
    expect(await store.listRoster(made.code), "no tombstone left behind, which is what erase means")
      .toEqual([expect.objectContaining({ seatCode: cards[1]!.seatCode })]);
    expect((await store.listSubmissions(made.code)).filter((row) => row.seatCode === seat), "their work").toEqual([]);
    expect((await store.listFeedback(made.code)).filter((row) => row.seatCode === seat), "and the notes written to them").toEqual([]);
    // The rest of the class is untouched, which the same sentence also promises.
    expect((await store.listRoster(made.code)).length).toBe(1);
  });
});
