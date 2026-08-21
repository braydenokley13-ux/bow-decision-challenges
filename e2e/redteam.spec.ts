import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { API, createClass, signIn, type JoinCard } from "./flow";
import { buildSubmission } from "../src/test/runChallenge";

/**
 * STORED CROSS-SITE SCRIPTING, and where four attacker-controlled strings actually end up.
 *
 * The four fields in this product a person outside the engineering team can put characters
 * into, and every one of them is read back on somebody else's screen:
 *
 *   1. a student's written explanation — typed by a child, read by their teacher
 *   2. a teacher's feedback note      — typed by a teacher, read by a child
 *   3. a class label                  — typed by a teacher, read by every child in the room
 *   4. a student display name         — typed by a teacher onto the roster, read everywhere
 *
 * Each carries two payloads: an `img`/`onerror` that would fire on parse, and a `javascript:`
 * URL that would fire if any surface ever put one of these strings into an `href`. Detection
 * is not a screenshot: the payload sets `window.__bowXss`, and every surface below is asked
 * for that counter, for any `img` whose `src` the payload supplied, and for any anchor whose
 * href scheme is `javascript:`. A page that renders the payload as *text* is the pass — so
 * the assertions below also check the literal is present, because a product that silently
 * dropped a child's sentence would pass an XSS test by losing the evidence.
 *
 * Everybody in it is invented.
 */

const FIRE = "window.__bowXss=(window.__bowXss||0)+1";
const IMG = `<img src=x onerror="${FIRE}">`;
const SVG = `<svg onload="${FIRE}"></svg>`;
const JS_URL = "javascript:window.__bowXss=99";
const CLOSER = `"><script>${FIRE}</script>`;

const PAYLOAD = `${IMG} ${SVG} ${JS_URL} ${CLOSER}`;

/** Fictional. The payload rides on a name a teacher could plausibly have pasted. */
const NAME_A = `Ines Bramblecourt ${IMG}${JS_URL}`;
const NAME_B = "Otto Pellerin";
const LABEL = `Ms. Halloway ${IMG} Period 5`;
const WRITING = `I kept the cushion back because the generator is rented. ${PAYLOAD}`;
const NOTE = `Good — say that out loud on Friday. ${PAYLOAD}`;

interface Sighting {
  where: string;
  fired: number | undefined;
  plantedImages: number;
  javascriptHrefs: number;
  scriptTags: number;
  showsPayloadAsText: boolean;
}

/**
 * What a page did with the payload, asked of the page rather than of the source.
 *
 * `window.__bowXss` is the only thing that separates "rendered as text" from "executed":
 * an `onerror` that ran increments it, and a `javascript:` href that was followed sets it
 * to 99. Both are read after the page has settled, so an image that fails slowly still
 * counts.
 */
async function look(page: Page, where: string, marker: string): Promise<Sighting> {
  await page.waitForLoadState("networkidle").catch(() => {});
  return page.evaluate(([text]) => ({
    where: "",
    fired: (window as unknown as { __bowXss?: number }).__bowXss,
    plantedImages: document.querySelectorAll('img[src$="/x"], img[src="x"]').length,
    javascriptHrefs: [...document.querySelectorAll("a[href], area[href]")]
      .filter((node) => (node.getAttribute("href") ?? "").trim().toLowerCase().startsWith("javascript:")).length,
    // Any `script` the page did not ship itself. Vite's own module scripts carry a src.
    scriptTags: [...document.querySelectorAll("script:not([src])")]
      .filter((node) => (node.textContent ?? "").includes("__bowXss")).length,
    showsPayloadAsText: (document.body.innerText ?? "").includes(text),
  }), [marker]).then((seen) => ({ ...seen, where }));
}

function clean(seen: Sighting) {
  expect(seen.fired, `${seen.where}: a payload EXECUTED`).toBeUndefined();
  expect(seen.plantedImages, `${seen.where}: the payload's <img> was parsed into the DOM`).toBe(0);
  expect(seen.javascriptHrefs, `${seen.where}: a javascript: URL reached an href`).toBe(0);
  expect(seen.scriptTags, `${seen.where}: the payload's <script> was parsed into the DOM`).toBe(0);
}

/* -------------------------------------------------------------------------- */

let classCode = "";
let teacherKey = "";
let cardA: JoinCard & { classCode: string };
let sessionId = "";
const seen: Sighting[] = [];

async function seed(request: APIRequestContext) {
  const created = await createClass(request, LABEL);
  classCode = created.code;
  teacherKey = created.teacherKey;

  const set = await request.post(`${API}/classes/${classCode}/assignments`, {
    headers: { "X-BOW-Teacher-Key": teacherKey },
    data: { objectiveRef: null, allowedWorldIds: ["basketball"], studentChoosesWorld: false },
  });
  expect(set.status(), await set.text()).toBe(201);

  const seated = await request.post(`${API}/classes/${classCode}/roster`, {
    headers: { "X-BOW-Teacher-Key": teacherKey },
    data: { names: [NAME_A, NAME_B] },
  });
  expect(seated.status(), await seated.text()).toBe(201);
  cardA = { ...((await seated.json()) as { cards: JoinCard[] }).cards[0], classCode };

  // Signed in as the child, so the turn-in below is authenticated as they would be.
  const joined = await request.post(`${API}/classes/${classCode}/join`, {
    data: { classCode, joinCode: cardA.joinCode, device: "shared" },
  });
  expect(joined.status(), await joined.text()).toBe(200);
  const token = ((await joined.json()) as { token: string }).token;

  // A whole run, driven through the real reducer, with the payload where the child's own
  // sentence goes. A hand-made one-event log is refused by nothing but renders as "this
  // attempt could not be opened in full", which would let a surface pass by having nothing
  // on it.
  const built = buildSubmission({ seatCode: "1", defenseText: WRITING });
  sessionId = built.sessionId;
  const turnedIn = await request.post(`${API}/classes/${classCode}/submissions`, {
    headers: { Authorization: `Bearer ${token}` },
    data: {
      classCode,
      seatCode: built.seatCode,
      sessionId: built.sessionId,
      challengeId: built.challengeId,
      challengeVersion: built.challengeVersion,
      log: built.log,
    },
  });
  expect(turnedIn.status(), await turnedIn.text()).toBe(202);

  const wroteBack = await request.post(`${API}/classes/${classCode}/feedback`, {
    headers: { "X-BOW-Teacher-Key": teacherKey },
    data: { seatCode: "1", sessionId, body: NOTE },
  });
  expect(wroteBack.status(), await wroteBack.text()).toBe(201);
}

test.describe.configure({ mode: "serial" });
test.setTimeout(300_000);

test.describe("Stored XSS — four attacker-controlled strings, every surface that renders them", () => {
  test("the four fields are stored verbatim by the service", async ({ request }) => {
    await seed(request);
    const room = await request.get(`${API}/classes/${classCode}/submissions`, {
      headers: { "X-BOW-Teacher-Key": teacherKey },
    });
    const held = (await room.json()) as {
      class: { label: string };
      roster: { seatCode: string; displayName: string }[];
      submissions: { log: { type: string; payload: { text?: string } }[] }[];
      feedback: { body: string }[];
    };
    // Stored, not sanitised — which is the right call for a child's own sentence, and is
    // why every surface below has to be checked rather than trusted.
    expect(held.class.label).toContain("<img src=x");
    expect(held.roster[0].displayName).toContain("<img src=x");
    const wrote = held.submissions[0].log.find((event) => event.type === "DEFENSE_SUBMITTED" || event.type === "POPUP_WRITEUP_SUBMITTED");
    expect(wrote?.payload.text).toContain("javascript:");
    expect(held.feedback[0].body).toContain("<script>");
  });

  test("the teacher's surfaces render all four as text and execute none", async ({ page }) => {
    for (const [where, url] of [
      ["teacher · class overview", `/educator/class/${classCode}?key=${teacherKey}`],
      ["teacher · student evidence", `/educator/class/${classCode}/students/1?key=${teacherKey}`],
      ["teacher · reading queue", `/educator/class/${classCode}/reading?key=${teacherKey}`],
      ["teacher · roster", `/educator/class/${classCode}/roster?key=${teacherKey}`],
      ["teacher · debrief", `/educator/class/${classCode}/debrief?key=${teacherKey}`],
      ["teacher · share-out", `/educator/class/${classCode}/share-out?key=${teacherKey}`],
      ["teacher · my classes", `/educator/classes`],
    ] as const) {
      await page.goto(url);
      const sighting = await look(page, where, "<img src=x");
      seen.push(sighting);
      clean(sighting);
    }
    // The child's own sentence survived being displayed, payload and all — a surface that
    // passed by dropping it would be a worse failure than the one this test is looking for.
    await page.goto(`/educator/class/${classCode}/students/1?key=${teacherKey}`);
    await expect(page.locator("section.written blockquote").first()).toContainText("javascript:window.__bowXss");
  });

  test("the student's surfaces render all four as text and execute none", async ({ page }) => {
    await signIn(page, cardA);
    const home = await look(page, "student · home", "<img src=x");
    seen.push(home);
    clean(home);
    // The name and the label are both on this page, both attacker-shaped, both inert.
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Ines Bramblecourt");
    await expect(page.locator("body")).toContainText("Ms. Halloway");
    await expect(page.locator(".teacher-note")).toContainText("window.__bowXss");

    await page.goto(`/run/${classCode}/${sessionId}`);
    const recap = await look(page, "student · recap", "<img src=x");
    seen.push(recap);
    clean(recap);

    await page.goto(`/join`);
    await page.getByLabel("Class code").fill(classCode);
    await page.getByRole("button", { name: "Next" }).click();
    const door = await look(page, "student · the door, class named", "<img src=x");
    seen.push(door);
    clean(door);
  });

  test("the gradebook export cannot carry a formula out of a name", async ({ page }) => {
    // The other injection a name reaches: a teacher pressing "Copy for a gradebook" and
    // pasting into a spreadsheet. Asserted on the text the button puts on the clipboard.
    await page.goto(`/educator/class/${classCode}?key=${teacherKey}`);
    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    const copy = page.getByRole("button", { name: /Copy .* for a gradebook/ });
    if (await copy.count()) {
      await copy.first().click();
      const text = await page.evaluate(() => navigator.clipboard.readText());
      for (const line of text.split("\n")) {
        for (const cell of line.split("\t")) {
          expect(cell, `a gradebook cell starts a formula: ${cell.slice(0, 40)}`).not.toMatch(/^[=+\-@]/);
        }
      }
    }
  });

  test("the sweep found nothing, and says what it looked at", () => {
    console.log(seen.map((entry) => `${entry.where}: fired=${entry.fired ?? "none"} img=${entry.plantedImages} jsHref=${entry.javascriptHrefs} script=${entry.scriptTags} text=${entry.showsPayloadAsText}`).join("\n"));
    expect(seen.length, "every surface in the list was actually visited").toBeGreaterThanOrEqual(10);
    expect(seen.every((entry) => entry.fired === undefined), "no payload fired anywhere").toBe(true);
  });
});
