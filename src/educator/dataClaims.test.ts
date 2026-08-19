import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../../server/handler";
import { memoryStore, type ClassStore } from "../../server/store";
import { PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";
import { CLASS_RETENTION_DAYS, type ClassCreation } from "../platform/classes/types";
import type { ClassDoor, JoinCard } from "../platform/identity/types";
import { withoutComments } from "../test/source";

/**
 * What this product may say about the data it holds, checked against what it holds.
 *
 * The sign-in screen told a teacher, at the moment they decide whether to type their work
 * address, that BOW *"never sees a student's email address, name or birthday"*. A teacher
 * reviewer read that sentence and then read the API. BOW receives student names, stores them,
 * indexes them by seat and hands them back — `GET /classes/:code/roster` answers the teacher
 * who holds the key with every `displayName` on the list — and the product's own next screen
 * says that a class with no list lets students type their own first name. In New York this is
 * the sentence a district's data protection officer reads first, and a first name attached to
 * a class and to a piece of assessed work is squarely inside what §2-d and Part 121 call
 * student data. A vendor whose sign-up screen is wrong about where children's names go does
 * not get asked a second question; every other sentence in the product loses its credit.
 *
 * So the rule this file enforces is narrow and absolute: **no screen may say BOW does not hold
 * a student's name.** It holds them. What may be said — and what the false sentence was
 * reaching for — is the shape of what it holds, which is genuinely much less than a school
 * system's and is worth a teacher knowing:
 *
 * - **A teacher's account is `{ id, email, createdAt }` plus a scrypt hash of their password
 *   and one of their recovery code** (`server/identity.ts`, `POST /auth/teacher`). There is no
 *   name field, and the email address is the sign-in identifier and nothing else.
 * - **A student's account is `{ id, createdAt }`** (`src/platform/identity/types.ts`). No name,
 *   no email, no birthday, no school, no class.
 * - **Names live on a `RosterEntry`**, which is a seat with a label on it, which belongs to a
 *   class, which belongs to a teacher. They arrive by two doors and the copy has to own both:
 *   the teacher pastes a class list (`POST /classes/:code/roster`), or the class has no list
 *   and the student types a first name at `/join` (`POST /classes/:code/join`, stored with
 *   `selfNamed: true`). BOW does not check either against anything and has no way to learn
 *   whether it is real.
 * - **A student's own sentences are stored too**, inside the evidence log, and free text
 *   written by a twelve-year-old can contain anything. No claim of holding no personal
 *   information survives that, which is why none is made here.
 * - **Who can read a name.** The whole list takes the class's teacher key or the account that
 *   owns the class (`opensClass`). The unauthenticated door answers a class code with the
 *   label and the join mode and no names at all — that is asserted below and in
 *   `src/platform/identity/service.test.ts`. A signed-in student reads back their own row.
 * - **Where it is kept.** Sealed, AES-256-GCM, under a key the deployment supplies; a durable
 *   store with no key refuses to start (`server/vault.ts`, `src/platform/classes/atRest.test.ts`).
 * - **How long.** A class expires `CLASS_RETENTION_DAYS` after it is created and an hourly
 *   sweep deletes it and everything in it; one child can be erased sooner without touching the
 *   rest of the class.
 *
 * It is a source scan rather than a unit test because the defect was never a broken function.
 * It was a true-sounding sentence, written once, in the one place where it would be believed.
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
 * Every sentence a reader could meet, with the comments taken out.
 *
 * Comments are where the rule is explained and where the old sentence is quoted so the next
 * person knows why it went, so a scan that read them would fail on its own explanation — which
 * has happened three times in this repository to three different people.
 */
function sentences(text: string): string[] {
  return withoutComments(text).replace(/\s+/g, " ").split(/(?<=[.!?])\s+/);
}

/** Denial bound to the verb it denies, rather than anywhere in the sentence. */
const denied = (verbs: string) =>
  new RegExp(`\\b(?:never|not|nothing|cannot|can't|no)\\b(?:\\s+\\w+){0,2}\\s+(?:${verbs})\\b`, "i");

/** Having a name: the thing BOW does, and may not deny. */
const DENIED_HOLDING = denied("see|sees|store|stores|hold|holds|keep|keeps|record|records|receive|receives|know|knows|collect|collects");

/**
 * Asking for a name: the thing BOW does in exactly one mode, and may not deny in general.
 *
 * "BOW never asks a child for an email address or a **last** name" is true and stays true — the
 * open class asks for a first name and says so on the same screen. So a qualified name is not
 * an offence and a bare one is.
 */
const DENIED_ASKING = denied("ask|asks|require|requires|need|needs");

const QUALIFIED_NAME = /\b(?:last|sur|full|real|legal|family)[- ]?names?\b/gi;
const A_NAME = /\bnames?\b/i;

/**
 * What the denial reaches. Long enough for "never sees a student's email address, name or
 * birthday", short enough that a denial in one clause does not convict a name three clauses
 * later.
 */
const REACH = 70;

function offencesIn(sentence: string): string[] {
  const found: string[] = [];
  for (const [rule, pattern] of [["holds", DENIED_HOLDING], ["asks", DENIED_ASKING]] as const) {
    const match = pattern.exec(sentence);
    if (!match) continue;
    const reached = sentence.slice(match.index + match[0].length, match.index + match[0].length + REACH);
    if (A_NAME.test(reached.replace(QUALIFIED_NAME, " "))) found.push(rule);
  }
  // Exclusivity is the same defect wearing a positive sentence: names arrive from two doors, so
  // "the only name here is the one your teacher wrote" is false in every class without a list.
  if (/\bonly\s+(?:the\s+)?names?\b/i.test(sentence) || /\bthe only name\b/i.test(sentence)) found.push("only");
  return found;
}

/**
 * The same defect, found in three surfaces this change does not own, listed rather than
 * silently skipped — with the sentence itself as the key, so the exemption covers exactly the
 * claim it was written for. A file that is fixed passes; a file whose claim is reworded into a
 * different unverified one fails, which is the right answer for a sentence nobody has checked.
 *
 * Delete the entry when the sentence goes.
 */
const ROUTED_ELSEWHERE: { path: string; sentence: string; why: string }[] = [
  {
    path: "src/content/studentCopy.ts",
    sentence: "The only name here is the one your teacher wrote",
    // Rendered by `StudentChallenge` for every seat that has a label, including the seats in an
    // open class where the label is the one the student typed at /join themselves.
    why: "false in a class with no list, where the student typed the name",
  },
  {
    path: "src/educator/RealClassPages.tsx",
    sentence: "the only name it holds is the one you put on the list",
    // Pasting a list into a class that was open does not remove the rows students named
    // themselves before it; the class holds both.
    why: "a class that was open before the list was pasted still holds the names its students typed",
  },
  {
    path: "src/educator/Roster.tsx",
    sentence: "never asks a student for a name of their own",
    // Printed on the screen that creates the class list — while every class without one is
    // asking exactly that at /join.
    why: "a class with no list asks the student for their own first name",
  },
];

const NOW = 1_770_000_000_000;

function api(store: ClassStore) {
  return (method: string, path: string, body?: unknown, headers: Record<string, string | undefined> = {}) =>
    handleApiRequest(
      { method, path, headers, ...(body !== undefined ? { body } : {}), clientId: "data-claims" },
      { store, now: () => NOW },
    );
}

describe("the names this product says it does not have", () => {
  /**
   * The fact every sentence in this product has to survive, asserted against the handler that
   * ships rather than against a description of it. Both doors, because the copy has to own both.
   */
  it("takes student names by two doors and hands them back to their teacher", async () => {
    const store = memoryStore();
    const call = api(store);
    const teacher = (await call("POST", "/auth/teacher", { email: "ms.chen@example.org", password: "a long enough passphrase" })).body as { token: string };
    const bearer = { authorization: `Bearer ${teacher.token}` };

    // Door one: a teacher pastes their class list.
    const listed = (await call("POST", "/classes", { label: "Period 5", challengeId: PLAN_UNDER_PRESSURE.id }, bearer)).body as ClassCreation;
    const cards = ((await call("POST", `/classes/${listed.code}/roster`, { names: ["Ana R.", "Devon P."] }, bearer)).body as { cards: JoinCard[] }).cards;
    expect(cards.map((card) => card.displayName)).toEqual(["Ana R.", "Devon P."]);
    const asTeacher = (await call("GET", `/classes/${listed.code}/roster`, undefined, bearer)).body as { roster: { displayName: string }[] };
    expect(asTeacher.roster.map((row) => row.displayName), "the roster endpoint answers a teacher with names").toEqual(["Ana R.", "Devon P."]);

    // Door two: no list, so the child types their own first name and BOW files the work under it.
    const open = (await call("POST", "/classes", { label: "Period 6", challengeId: PLAN_UNDER_PRESSURE.id }, bearer)).body as ClassCreation;
    const joined = await call("POST", `/classes/${open.code}/join`, { displayName: "Jaylen", device: "shared" });
    expect(joined.status, JSON.stringify(joined.body)).toBe(201);
    expect((joined.body as { displayName: string }).displayName).toBe("Jaylen");
    const typed = (await call("GET", `/classes/${open.code}/roster`, undefined, bearer)).body as { roster: { displayName: string }[] };
    expect(typed.roster.map((row) => row.displayName), "a name a child typed is stored exactly like one a teacher typed").toEqual(["Jaylen"]);

    // And the two true halves of what the sign-in screen now says: the whole list takes the
    // teacher's credential, and a class is kept for as long as the copy says it is.
    const door = (await call("GET", `/classes/${listed.code}/roster`)).body as ClassDoor;
    expect(door, "the unauthenticated door publishes no names").toEqual({ label: "Period 5", joinMode: "roster" });
    expect(listed.expiresAt - listed.createdAt).toBe(CLASS_RETENTION_DAYS * 24 * 60 * 60 * 1000);
  });

  /** The literal defect: a sentence saying BOW does not have what it has. */
  it("lets no screen deny that it holds a student's name", () => {
    const offenders: string[] = [];
    for (const { path, text } of sources()) {
      for (const sentence of sentences(text)) {
        const offences = offencesIn(sentence);
        if (offences.length === 0) continue;
        if (ROUTED_ELSEWHERE.some((known) => known.path === path && sentence.includes(known.sentence))) continue;
        offenders.push(`${path} [${offences.join(", ")}] — ${sentence.trim().slice(0, 160)}`);
      }
    }
    expect(
      offenders,
      "BOW receives student names, stores them and hands them back to their teacher. A screen "
      + "that says otherwise is the sentence a district's privacy officer checks first. Say what "
      + "is held instead — see the head of this file",
    ).toEqual([]);
  });

  /**
   * The reassurance that is true, held to the code that makes it true. It is the whole of what
   * the false sentence was reaching for and it costs nothing to keep honest: the product has
   * one email field and one password field, both on the teacher's own sign-in screen.
   */
  it("asks a student for no address, no password and no birthday, on any screen", () => {
    const asked: string[] = [];
    for (const { path, text } of sources()) {
      const code = withoutComments(text);
      for (const match of code.matchAll(/type="(email|password|date|tel)"/g)) asked.push(`${path} → ${match[1]}`);
      for (const match of code.matchAll(/(?:htmlFor|id|name|placeholder)="[^"]*birth[^"]*"/gi)) asked.push(`${path} → ${match[0]}`);
    }
    expect(
      asked.filter((entry) => !entry.startsWith("src/educator/SignIn.tsx")),
      "a field that asks for one of the three things the join screen and the sign-in screen both "
      + "promise BOW never asks a child for",
    ).toEqual([]);
    // And the teacher's own two, which are the account and are named as such.
    expect(asked).toEqual(["src/educator/SignIn.tsx → email", "src/educator/SignIn.tsx → password"]);
  });

  /**
   * Saying nothing false is half of it. A teacher deciding whether to put their class in here
   * has to be told what BOW holds, and the retention figure has to be the one the service runs
   * on rather than a number somebody typed — 120 in the copy and 90 in the sweep is the same
   * class of defect as the sentence this file exists for.
   */
  it("says what it does hold, on the screen where a teacher decides", () => {
    const note = readFileSync("src/educator/SignIn.tsx", "utf8");
    // The note itself, rather than the file it is in, so a failure here prints the sentences
    // somebody has to rewrite and not four hundred lines of component around them.
    const copy = [...withoutComments(note).matchAll(/className="sign-in__note">([\s\S]*?)<\/p>/g)]
      .map((match) => match[1]?.replace(/\s+/g, " ").trim() ?? "")
      .join(" ");
    expect(copy, "the note has to name the thing it holds").toMatch(/It does hold student names/);
    expect(copy, "and both doors names arrive by").toMatch(/class list.*first name a student types for themselves/);
    expect(copy, "and who can open them").toMatch(/nothing opens them but your account or that class/);
    expect(copy, "and the true reassurance").toMatch(/No student is ever asked for an email address, a password or a birthday/);
    expect(
      copy,
      "the retention figure a teacher reads has to be the one the service runs on, not a literal",
    ).toContain("{CLASS_RETENTION_DAYS} days after you make it");
    expect(copy, "and BOW holds no more of the teacher than the account they are making").toMatch(/Your account is an email address and a password/);
  });

  /** The student's own sentence at the door, in the words a student reads. */
  it("keeps the student's own promise at the join screen", () => {
    const join = withoutComments(readFileSync("src/student/Join.tsx", "utf8")).replace(/\s+/g, " ");
    expect(join).toContain("BOW never asks for your email, your birthday, or anything about your real money.");
    // The name box says what the name is for. A child typing one is owed that much on the screen
    // they type it on, and it is the sentence that keeps the promise above from over-reaching.
    expect(join).toContain("What should your teacher see?");
  });
});
