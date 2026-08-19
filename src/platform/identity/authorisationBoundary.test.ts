import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../../../server/handler";
import { IDENTITY_ROUTES, UNGATED_AUTH, type IdentityRoute } from "../../../server/identity";
import { memoryStore, type ClassStore } from "../../../server/store";
import { PLAN_UNDER_PRESSURE } from "../challenges/registry";
import type { ClassCreation } from "../classes/types";
import type { JoinCard } from "./types";

/**
 * The test that has to fail when somebody adds an unguarded route.
 *
 * An engineering review counted, inside one 717-line function: nine copies of the class-opening
 * check, eight copies of the 403 it produces, ten copies of "no class with that code", fifteen
 * calls to `callerOf`. Then they added a tenth route the way a second engineer would, left the
 * four-line preamble out, and got a **200 carrying every child's name, their join-code hashes
 * and the class's teacher key to an unauthenticated caller** — with `tsc`, `eslint` and a
 * hundred and eighty tests all green. Their conclusion is the reason this file exists:
 *
 * > It is not that the current authorization is wrong — I could not break it. It is that its
 * > correctness lives in nine copies of four lines and in the reviewer's attention, and the
 * > product is one enthusiastic Tuesday away from a tenth copy that is missing.
 *
 * So there are three assertions here and they close three different doors, because any one of
 * them alone leaves a way in:
 *
 *  1. **Every ungated route is on an allow-list written out below.** Adding a route that answers
 *     a stranger is allowed; doing it silently is not. The list is short enough to read as
 *     "everything a person with no credential can ask this service", which is the sentence a
 *     district's reviewer actually wants.
 *  2. **Every gated route refuses an unauthenticated caller, over the real handler.** A route
 *     can be in the table with the wrong `auth` — that is a declaration, not a behaviour — so
 *     each one is sent a real request with no token and no key and has to refuse it.
 *  3. **The router contains no route branch outside the table.** Assertions 1 and 2 both read
 *     the table, so a hand-written `if (request.method === …)` inside the dispatcher would be
 *     invisible to them — which is exactly the shape of the route the review added. This one
 *     reads the source.
 *
 * The proof that this test does what it says is in the receipts: the review's `/everything`
 * route was added back, this file went red, and it was removed again.
 */

const NOW = 1_770_000_000_000;
const SOURCE = fileURLToPath(new URL("../../../server/identity.ts", import.meta.url));

/**
 * Everything a caller who has proved nothing may ask, written out by hand.
 *
 * Four rows. Three are the account doors — you cannot sign up while signed in — and the fourth
 * pair are the two doors a student stands at with a class code and nothing else: reading the
 * label off a code, and presenting a card. Neither of those answers with a name; the roster
 * door returns `{label, joinMode}` to everybody except a caller `opensClass` recognises.
 *
 * A route arriving here that is not on this list is not a bug in the route. It is a route
 * nobody has said out loud is public, which is the only kind that gets shipped by accident.
 */
const UNGATED_ALLOW_LIST: readonly string[] = [
  "POST auth/teacher",
  "POST auth/teacher/session",
  "POST auth/teacher/recovery",
  "GET classes/:code/roster",
  "POST classes/:code/join",
];

const nameOf = (route: IdentityRoute) => `${route.method} ${route.path}`;

/**
 * The handler, called the way the transport calls it.
 *
 * The query is split off the path here rather than left on the end of it, because
 * `handleApiRequest` splits the path into segments and a `?` left in place becomes part of the
 * last one — which silently turns a probe of `…/roster/1?erase=1` into a probe of a route
 * spelled `1?erase=1`. It answers 403 either way, so the test goes green while testing
 * something else.
 */
function api(store: ClassStore, clientId: string, now = NOW) {
  return (method: string, url: string, body?: unknown, headers: Record<string, string | undefined> = {}) => {
    const [path = url, query = ""] = url.split("?");
    return handleApiRequest(
      { method, path, query, headers, ...(body !== undefined ? { body } : {}), clientId },
      { store, now: () => now },
    );
  };
}

/**
 * One class with a name on its roster, one turned-in run and one note about it.
 *
 * The probe below needs a `:seat`, a `:sessionId` and a `:id` that genuinely exist, because a
 * route that 404s on a made-up id would pass a "did not return 200" assertion while being wide
 * open to a caller who knew a real one.
 */
async function aClassWithEverythingInIt(store: ClassStore) {
  const call = api(store, "boundary-setup");
  const signedUp = await call("POST", "/auth/teacher", { email: "boundary@school.example", password: "a long enough passphrase" });
  const token = (signedUp.body as { token: string }).token;
  const owner = { authorization: `Bearer ${token}` };
  const created = (await call("POST", "/classes", { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id }, owner)).body as ClassCreation;
  const cards = ((await call("POST", `/classes/${created.code}/roster`, { names: ["Aiden R"] }, owner)).body as { cards: JoinCard[] }).cards;
  const card = cards[0];
  expect(card, "the roster paste must produce a card for the probe to use").toBeTruthy();
  const joined = await call("POST", `/classes/${created.code}/join`, { joinCode: card?.joinCode });
  const student = { authorization: `Bearer ${(joined.body as { token: string }).token}` };
  const sessionId = "boundary-session-1";
  const turnedIn = await call("POST", `/classes/${created.code}/submissions`, {
    classCode: created.code,
    seatCode: card?.seatCode,
    sessionId,
    challengeId: PLAN_UNDER_PRESSURE.id,
    challengeVersion: PLAN_UNDER_PRESSURE.version,
    log: [{
      id: "event-1", sequence: 1, timestamp: NOW, type: "SESSION_STARTED", stage: "entry",
      challengeId: PLAN_UNDER_PRESSURE.id, challengeVersion: PLAN_UNDER_PRESSURE.version,
      sessionId, worldId: "basketball", conceptIds: [], competencyIds: [], evidenceRequirementIds: [],
      payload: {}, supportLevel: "standard_access",
    }],
  }, student);
  expect(turnedIn.status, "the probe needs a real submission to hang a real note on").toBe(202);
  const note = await call("POST", `/classes/${created.code}/feedback`, { seatCode: card?.seatCode, sessionId, body: "Read Week 5 again." }, owner);
  expect(note.status, JSON.stringify(note.body)).toBe(201);
  return {
    code: created.code,
    seatCode: card?.seatCode ?? "1",
    sessionId,
    noteId: (note.body as { id: string }).id,
  };
}

describe("the authorisation boundary is a property of the router, not of the reviewer", () => {
  it("declares an auth mode for every route and puts every ungated one on the allow-list", () => {
    const ungated = IDENTITY_ROUTES.filter((route) => UNGATED_AUTH.includes(route.auth)).map(nameOf);

    // The direction that matters: a new public route fails here until somebody writes it down.
    expect(ungated.filter((route) => !UNGATED_ALLOW_LIST.includes(route))).toEqual([]);
    // And the direction that stops the list rotting into a description of a router that moved on.
    const declared = IDENTITY_ROUTES.map(nameOf);
    expect(UNGATED_ALLOW_LIST.filter((route) => !declared.includes(route))).toEqual([]);
    expect([...ungated].sort()).toEqual([...UNGATED_ALLOW_LIST].sort());
  });

  it("refuses every gated route to a caller carrying no token and no key", async () => {
    const store = memoryStore();
    const room = await aClassWithEverythingInIt(store);
    const call = api(store, "boundary-stranger");

    const refusals = await Promise.all(
      IDENTITY_ROUTES
        .filter((route) => !UNGATED_AUTH.includes(route.auth))
        .map(async (route) => {
          const path = `/${route.path}`
            .replace(":code", room.code)
            .replace(":seat", room.seatCode)
            .replace(":sessionId", room.sessionId)
            .replace(":id", room.noteId);
          // `?erase=1` is the one route distinguished by its query rather than its path, and
          // the destructive one of the pair, so the probe has to actually name it.
          const query = route.when ? "?erase=1" : "";
          const result = await call(route.method, `${path}${query}`, route.method === "GET" ? undefined : {});
          return { route: nameOf(route), status: result.status };
        }),
    );

    // 401 for a route that wanted an account, 403 for one that wanted this class. Never a 2xx,
    // and never a 404 — a 404 here would mean the probe missed the route rather than that the
    // route refused.
    expect(refusals.filter((entry) => entry.status !== 401 && entry.status !== 403)).toEqual([]);
    expect(refusals.length).toBeGreaterThan(10);
  });

  it("holds no route branch outside the table", () => {
    const source = readFileSync(SOURCE, "utf8");
    const uncommented = source
      .split("\n")
      .filter((line) => !line.trimStart().startsWith("//") && !line.trimStart().startsWith("*"))
      .join("\n");

    // The shape the review's tenth route had. A route decided by comparing the method inside the
    // dispatcher is a route the table does not know about, and neither of the assertions above
    // can see it.
    expect(uncommented.match(/request\.method\s*===/g) ?? []).toEqual([]);

    // The other shape the same route could take, without naming a method: reading a path
    // segment inside the dispatcher and branching on it. `request.segments` is indexed in
    // exactly one place — the fall-through that hands `/classes/:code/…` paths this file does
    // not own to the class service — and it reads two of them.
    expect((uncommented.match(/request\.segments\[/g) ?? []).length).toBe(2);

    // The preamble, once. `opensClass` is declared once and called once — the definition, and
    // the dispatcher — and a second call site is a second copy of the check the review's route
    // was missing. It is why `ClassRouteContext` carries the answer rather than the question.
    expect((uncommented.match(/opensClass\(/g) ?? []).length).toBe(2);

    // The 403 body, written in one place. There were eight.
    expect((uncommented.match(/This link does not open that class/g) ?? []).length).toBe(1);

    // And the dispatcher itself stays small enough to read in one go. Every assertion above
    // names a shape somebody might use to add a route without the table; this one catches the
    // shapes nobody has thought of yet, because all of them make this function longer.
    const dispatcher = uncommented.slice(uncommented.indexOf("export async function handleIdentityRequest"));
    const lines = dispatcher.slice(0, dispatcher.indexOf("\n}\n")).split("\n").length;
    expect(lines, "handleIdentityRequest is the authorisation boundary; a route belongs in IDENTITY_ROUTES").toBeLessThan(70);
  });
});
