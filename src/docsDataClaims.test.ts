import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../server/handler";
import { memoryStore, type ClassStore } from "../server/store";
import { PLAN_UNDER_PRESSURE } from "./platform/challenges/registry";
import { CLASS_RETENTION_DAYS, type ClassCreation } from "./platform/classes/types";
import type { ClassDoor, JoinCard } from "./platform/identity/types";
import { withoutComments } from "./test/source";

/**
 * What the two standalone documents may say about the data this product holds.
 *
 * `README.md` line 36 read *"No student accounts, no email addresses, no names. A class is a
 * code; a seat is a number."* Every clause was false and had been for several features: there
 * are student accounts (`{ id, createdAt, sessionGeneration }`), there is a teacher account
 * whose identifier **is** an email address, there are names on every roster entry — arriving
 * either from a class list a teacher pasted or from a first name a child typed at `/join` —
 * and a seat is a number that usually has one of those names on it.
 *
 * It survived because nothing looked. `docsTruth.test.ts` checks that every backticked name in
 * these documents still exists, which is the shape staleness usually takes in a document about
 * code — but the sentence that goes stale in a document about *data* has no backticks in it at
 * all. `dataClaims.test.ts` holds the same rule beautifully and scans `src/`, so the one page a
 * district reviewer opens first was outside every net in the repository.
 *
 * This is that net, for `README.md` and `ARCHITECTURE.md`. It is the first page a privacy
 * officer reads; a vendor whose README is wrong about where children's names go does not get
 * asked a second question.
 *
 * Two rules and one set of receipts:
 *
 * 1. **Neither document may deny that BOW holds a student's name.** It holds them.
 * 2. **Neither document may claim compliance with anything.** No law, no framework, no
 *    district. The product has never made such a claim on a rendered screen and the documents
 *    must not become the place it starts.
 * 3. Every clause of README's *What BOW holds* is checked against the handler that ships.
 */

const DOCUMENTS = ["README.md", "ARCHITECTURE.md"] as const;

/**
 * The sentence a document has to carry if it is not one of the two.
 *
 * The repository root holds three more markdown files, all with authoritative names and all
 * headed **Definitive**: the V2 master specification, the V2.1 interaction review and the V3
 * architecture blueprint. They are the briefs this product was built *from*, and the V3 one
 * names its reader in its own opening paragraph — *"a District 26 discovery conversation asked
 * whether BOW has a stand-alone resource a curriculum lead could review without a BOW
 * representative present"*. That curriculum lead opens this repository and finds five
 * documents, two of which are true and three of which say the audience is Grades 6–8, the
 * second world is Fashion, the grade is out of 100 and there is no backend. All four were true
 * when they were written and none is true now.
 *
 * So the rule is: a markdown file at the root is **either** current — in `DOCUMENTS`, and held
 * to every rule in this file — **or** it carries a provenance banner saying it is history and
 * naming where it disagrees with the product. There is no third state, and adding a document
 * to the root is now a decision about which of the two it is.
 */
const PROVENANCE = "Provenance — read this before anything below it";

function rootDocuments(): string[] {
  return readdirSync(".", { encoding: "utf8" }).filter((entry) => entry.endsWith(".md")).sort();
}

function sentencesOf(path: string): string[] {
  return withoutComments(readFileSync(path, "utf8"), { html: true })
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/);
}

// ---------------------------------------------------------------------------
// 1. Neither document may deny holding a name
// ---------------------------------------------------------------------------

/**
 * Denial bound to the verb it denies, rather than anywhere in the sentence. The same shape
 * `dataClaims.test.ts` uses on `src/`, because one rule stated two ways is two rules.
 */
const denied = (verbs: string) =>
  new RegExp(`\\b(?:never|not|nothing|cannot|can't|no)\\b(?:\\s+\\w+){0,2}\\s+(?:${verbs})\\b`, "i");

const DENIED_HOLDING = denied("see|sees|store|stores|hold|holds|keep|keeps|record|records|receive|receives|know|knows|collect|collects");
const DENIED_ASKING = denied("ask|asks|require|requires|need|needs");

/** "no last names" and "no real name" stay true and stay sayable. A bare name does not. */
const QUALIFIED_NAME = /\b(?:last|sur|full|real|legal|family)[- ]?names?\b/gi;
const A_NAME = /\bnames?\b/i;

/** Long enough to cover "no student accounts, no email addresses, no names". */
const REACH = 70;

/**
 * The shape the README's own defect took, which the verb-bound rule above cannot see.
 *
 * *"No student accounts, no email addresses, no names."* has no verb in it at all — it is a
 * list of nouns the product is said not to have, and every scan in this repository was built
 * to catch a claim with a verb in it. Plural, because the sweep is the offence: *"there is no
 * name field on the teacher's account"* is true and stays sayable, and so does any scoped
 * singular. A document that wants to say a particular export carries no names says which
 * export, in words that are not this list.
 */
const BARE_DENIALS: readonly RegExp[] = [
  /\bno (?:student )?accounts?\b/i,
  /\bno e-?mail addresses\b/i,
  /\bno (?:student |child(?:ren)?'s )?names\b/i,
];

function nameDenialsIn(sentence: string): string[] {
  const found: string[] = [];
  for (const bare of BARE_DENIALS) {
    const match = bare.exec(sentence);
    if (match) found.push(`bare: ${match[0]}`);
  }
  for (const [rule, pattern] of [["holds", DENIED_HOLDING], ["asks", DENIED_ASKING]] as const) {
    const match = pattern.exec(sentence);
    if (!match) continue;
    const reached = sentence.slice(match.index + match[0].length, match.index + match[0].length + REACH);
    if (A_NAME.test(reached.replace(QUALIFIED_NAME, " "))) found.push(rule);
  }
  // Exclusivity is the same defect wearing a positive sentence: names arrive by two doors, so
  // "the only name here is the one the teacher typed" is false in every class with no list.
  if (/\bonly\s+(?:the\s+)?names?\b/i.test(sentence) || /\bthe only name\b/i.test(sentence)) found.push("only");
  return found;
}

describe("the standalone documents do not deny holding a student's name", () => {
  it("catches the sentence that shipped, rather than passing because it reads nothing", () => {
    const shipped = "No student accounts, no email addresses, no names. A class is a code; a seat is a number.";
    expect(nameDenialsIn(shipped).length, shipped).toBeGreaterThan(0);
    // And nothing fires on the section that replaced it, or the README could not say what is
    // true — including the sentence that reclaims the old one honestly.
    for (const replacement of [
      "BOW does hold student names.",
      "A class is a code and a seat is a number.",
      "The seat usually has a name on it.",
      "BOW checks neither against anything and has no way to know whether either is a real name.",
      "A student is asked for no email address, no password and no birthday.",
    ]) {
      expect(nameDenialsIn(replacement), replacement).toEqual([]);
    }
  });

  for (const document of DOCUMENTS) {
    it(`finds no such denial in ${document}`, () => {
      const offenders = sentencesOf(document)
        .flatMap((sentence) => nameDenialsIn(sentence).map((rule) => `[${rule}] ${sentence.trim().slice(0, 160)}`));
      expect(
        offenders,
        `${document} says BOW does not have what it has. It receives student names, stores them `
        + "and hands them back to their teacher — say what is held instead, as the What BOW "
        + "holds section does",
      ).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------
// 2. Neither document may claim compliance with anything
// ---------------------------------------------------------------------------

/**
 * The claim this product has never made and must not start making in a document.
 *
 * An adoption reviewer searched the whole of `src/`, `server/`, `api/`, `index.html` and
 * `docs/` for these and found every hit to be a source comment explaining an obligation the
 * code is trying to meet, with none reaching a rendered string. That clean record is worth
 * more than any sentence it would buy, and a README is exactly where it would be spent.
 */
const COMPLIANCE_CLAIMS: readonly RegExp[] = [
  /\bFERPA\b/i,
  /\bCOPPA\b/i,
  /\bNYCPS\b/i,
  /\bPart 121\b/i,
  /§\s*2-?d\b/i,
  /\bEd(?:ucation)? Law\b/i,
  /\bcomplian(?:t|ce)\b/i,
  /\bcomplies with\b/i,
  /\bapproved by\b/i,
];

describe("neither document claims compliance with anything", () => {
  it("catches a claim, rather than passing because it reads nothing", () => {
    expect(COMPLIANCE_CLAIMS.some((claim) => claim.test("BOW is FERPA compliant."))).toBe(true);
    expect(COMPLIANCE_CLAIMS.some((claim) => claim.test("Sealed with AES-256-GCM under BOW_STORE_KEY."))).toBe(false);
  });

  for (const document of DOCUMENTS) {
    it(`makes no such claim in ${document}`, () => {
      const text = readFileSync(document, "utf8");
      const found = COMPLIANCE_CLAIMS.flatMap((claim) => {
        const match = claim.exec(text);
        return match ? [`${document} — ${match[0]}`] : [];
      });
      expect(
        found,
        "a standalone document claims the product complies with something. It has never made "
        + "that claim on any screen; describe what is stored, for how long and who can delete "
        + "it, and let the district draw its own conclusion",
      ).toEqual([]);
    });
  }
});

// ---------------------------------------------------------------------------
// 3. What makes README's "What BOW holds" true
// ---------------------------------------------------------------------------

const NOW = 1_770_000_000_000;

function api(store: ClassStore) {
  return (method: string, path: string, body?: unknown, headers: Record<string, string | undefined> = {}) =>
    handleApiRequest(
      { method, path, headers, ...(body !== undefined ? { body } : {}), clientId: "docs-data-claims" },
      { store, now: () => NOW },
    );
}

describe("the README's account of what BOW holds is the handler's account", () => {
  it("takes names by the two doors it names, and publishes none of them at the open door", async () => {
    const call = api(memoryStore());
    const teacher = (await call("POST", "/auth/teacher", { email: "ms.chen@example.org", password: "a long enough passphrase" })).body as { token: string };
    const bearer = { authorization: `Bearer ${teacher.token}` };

    // Door one: the teacher pastes a class list.
    const listed = (await call("POST", "/classes", { label: "Period 5", challengeId: PLAN_UNDER_PRESSURE.id }, bearer)).body as ClassCreation;
    const cards = ((await call("POST", `/classes/${listed.code}/roster`, { names: ["Ana R."] }, bearer)).body as { cards: JoinCard[] }).cards;
    expect(cards.map((card) => card.displayName), "names a teacher pasted").toEqual(["Ana R."]);

    // Door two: no list, so the child types a first name and BOW files the work under it.
    const open = (await call("POST", "/classes", { label: "Period 6", challengeId: PLAN_UNDER_PRESSURE.id }, bearer)).body as ClassCreation;
    const joined = await call("POST", `/classes/${open.code}/join`, { displayName: "Jaylen", device: "shared" });
    expect(joined.status, JSON.stringify(joined.body)).toBe(201);
    const typed = (await call("GET", `/classes/${open.code}/roster`, undefined, bearer)).body as { roster: { displayName: string }[] };
    expect(typed.roster.map((row) => row.displayName), "a name a child typed is stored like one a teacher typed").toEqual(["Jaylen"]);

    // And the door anybody can knock on publishes the label and the join mode and nothing else.
    const door = (await call("GET", `/classes/${listed.code}/roster`)).body as ClassDoor;
    expect(door, "the unauthenticated door publishes no names").toEqual({ label: "Period 5", joinMode: "roster" });
  });

  it("deletes a class on the schedule the README names, and names it as a constant", async () => {
    const call = api(memoryStore());
    const made = (await call("POST", "/classes", { label: "Period 5", challengeId: PLAN_UNDER_PRESSURE.id })).body as ClassCreation;
    expect(made.expiresAt - made.createdAt).toBe(CLASS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    const readme = readFileSync("README.md", "utf8");
    const section = readme.slice(readme.indexOf("## What BOW holds"), readme.indexOf("## Check it"));
    expect(section, "the retention figure a district reads has to be the constant, not a literal")
      .toContain("`CLASS_RETENTION_DAYS` days from the day the class is made");
    expect(section, "a hard-coded number here is the defect one rename away").not.toMatch(/\b\d+ days\b/);
  });

  it("has no model to send a child's writing to", () => {
    const manifest = JSON.parse(readFileSync("package.json", "utf8")) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> };
    const declared = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies });
    expect(
      declared.filter((name) => /openai|anthropic|google-?(?:ai|genai)|cohere|mistral|langchain|replicate|huggingface/i.test(name)),
      "a model client is a dependency now, so the README's 'never sent to a model' has to be "
      + "re-earned rather than assumed",
    ).toEqual([]);
    // And the deployed policy that stops anything reaching one from the browser.
    expect(readFileSync("vercel.json", "utf8")).toContain("connect-src 'self'");
  });

  it("does not advertise a score the product refuses to produce", () => {
    // **The hole this closes.** This file has held README's *"What BOW holds"* to the shipping
    // handler since a privacy officer would read it first — and it had never been pointed at
    // what the same file says about a child's *assessment*. So README advertised *"90
    // structured points across 18 micro-skill observations, plus 10 points of written
    // reasoning"* for as long as that was false, and an assessment judge found it while
    // confirming, in a browser and in the export, that there is no total anywhere.
    //
    // The composite is still computed in `domain/evidence/grade.ts`; the rule is that nothing
    // renders it and no document may promise it.
    const readme = readFileSync("README.md", "utf8");
    const section = readme.slice(readme.indexOf("## How the assessment works"), readme.indexOf("## What an educator gets"));
    expect(section.length, "the section itself").toBeGreaterThan(400);
    // A quoted retirement is exempt; an advertisement is not. The retired sentence is kept in
    // the file, in quotation marks, saying what it used to claim — the same rule
    // `dataClaims.sweep.test.ts` draws between a quoted claim and an asserted one.
    const asserted = section
      .split("\n")
      .filter((line) => !line.includes("used to open"))
      .join("\n");
    for (const advertisement of [/\b90 structured points\b/, /\b100[- ]point\b/i, /\bout of 100\b/i]) {
      expect(asserted, `README advertises ${advertisement}`).not.toMatch(advertisement);
    }
    // And it says the true things, so deleting the correction fails rather than passes.
    for (const clause of [
      "There is no score",
      "there is no level 1",
      "absent, never a zero",
      "Missing evidence settles nothing in either direction",
      "no student writing is ever sent to a model",
    ]) {
      expect(section.replace(/\s+/g, " "), clause).toContain(clause);
    }
  });

  it("finds no rendered composite to advertise, which is what makes the section true", () => {
    // The claim above is only honest while the composite stays unrendered. This is the check
    // the judge did by hand — every `.tsx` under `src/`, for a use of the grade total.
    const rendered = readdirSync("src", { recursive: true, encoding: "utf8" })
      .filter((entry) => entry.endsWith(".tsx") && !entry.includes(".test."))
      .filter((entry) => /\bfinalPoints\b|\bderiveGrade\b/.test(withoutComments(readFileSync(`src/${entry}`, "utf8"))));
    expect(rendered, "a screen has started rendering the composite total").toEqual([]);
  });

  it("still says all of it, so deleting the section fails rather than passes", () => {
    const readme = readFileSync("README.md", "utf8");
    const section = readme.slice(readme.indexOf("## What BOW holds"), readme.indexOf("## Check it"));
    expect(section.length, "the section itself").toBeGreaterThan(400);
    const flat = section.replace(/\s+/g, " ");
    for (const clause of [
      "A teacher's account is an email address and a password",
      "asked for no email address, no password and no birthday",
      "BOW does hold student names",
      "ever sent to a model",
      "the teacher key or the account that owns the class",
      "AES-256-GCM",
      "The seat usually has a name on it",
    ]) {
      expect(flat, clause).toContain(clause);
    }
  });
});

// ---------------------------------------------------------------------------
// 4. And no document at the root is silently out of date
// ---------------------------------------------------------------------------

describe("every document at the root is either current or marked as history", () => {
  const roots = rootDocuments();

  it("finds all five, so a sixth cannot arrive unnoticed", () => {
    expect(roots).toEqual(expect.arrayContaining([...DOCUMENTS]));
    expect(roots.length).toBeGreaterThanOrEqual(5);
  });

  it.each(roots)("%s is in DOCUMENTS or carries the provenance banner", (path) => {
    const current = (DOCUMENTS as readonly string[]).includes(path);
    const marked = readFileSync(path, "utf8").includes(PROVENANCE);
    expect(
      current || marked,
      `${path} is neither held to its claims by this file nor marked as an input brief. `
      + "Add it to DOCUMENTS and make its claims true, or give it the provenance banner.",
    ).toBe(true);
    // Not both: a document that is held to its claims must not also excuse itself.
    expect(current && marked, `${path} claims to be both current and history`).toBe(false);
  });

  it("puts the banner where a reader meets it, not at the bottom", () => {
    for (const path of roots.filter((entry) => !(DOCUMENTS as readonly string[]).includes(entry))) {
      const text = readFileSync(path, "utf8");
      // Inside the first 40 lines, and after the title rather than before it.
      const line = text.split("\n").findIndex((entry) => entry.includes(PROVENANCE));
      expect(line, `${path}: the banner is ${line} lines down`).toBeGreaterThan(0);
      expect(line, `${path}: the banner is ${line} lines down`).toBeLessThan(40);
    }
  });
});
