import { CLASS_RETENTION_DAYS } from "../platform/classes/types";
import { MAX_ROSTER_SIZE, OWN_DEVICE_SESSION_DAYS, SHARED_DEVICE_SESSION_HOURS } from "../platform/identity/types";

/**
 * The per-seat ceiling on an unfinished run, written out rather than imported.
 *
 * `MAX_CHECKPOINT_BYTES` lives in `server/identity.ts`, and `eslint.config.js` stops anything
 * in `src/**` importing it — the browser bundle never reaches into the class service. So the
 * number is a literal here and `dataInventory.test.ts` holds it to the constant, which is the
 * same trade the retention figure does not have to make because `CLASS_RETENTION_DAYS` is
 * shared by both sides already.
 */
const CHECKPOINT_CEILING_KB = 256;

/**
 * What BOW holds, who can open it, and what has not been established — as data, so that a
 * test can hold every sentence of it to the service that ships.
 *
 * ## Why this file exists
 *
 * A district adoption reviewer played the whole product by hand, liked it, and stopped at the
 * same place every New York City district stops: *"There is no document a district can sign,
 * and no surface that would produce one."* `/privacy`, `/terms`, `/security`, `/dpa` and
 * `/legal` all rendered the home page, because the router sends every unknown route there. So
 * the vendor review could not begin — not because the engineering was thin, but because none
 * of it was written down for the person who decides.
 *
 * ## Why it is a module and not a page of prose
 *
 * A privacy notice nobody checks is exactly the artefact a district has been burned by
 * before, and this repository has already caught itself twice: `README.md` line 36 said *"No
 * student accounts, no email addresses, no names"* while every clause of it was false, and
 * the sign-in screen told a teacher BOW *"never sees a student's email address, name or
 * birthday"* on the screen where they decide to hand over a class. Both survived because
 * nothing looked. `src/docsDataClaims.test.ts` is the net for the first and
 * `src/educator/dataClaims.test.ts` for the second.
 *
 * This is the net for the third, and it is the strictest of the three, because the audience is
 * the one that checks. The claims live here as structured data, `src/legal/dataInventory.test.ts`
 * checks every row of the inventory against `server/handler.ts` and a real sealed
 * `fileStore`, and `src/legal/noticeRenders.test.tsx` checks that the page a district opens
 * still says all of it. A clause that cannot be supported is deleted rather than softened.
 *
 * ## The rule that governs the whole file
 *
 * **No compliance claim, of any kind.** Not FERPA, not COPPA, not New York Education Law
 * §2-d, not Part 121, not NYCPS, not WCAG, not district approval. The product has never made
 * one — an adoption reviewer scanned sixteen rendered routes and found every hit to be a
 * disclaimer — and a privacy notice is the single most likely place for that record to break.
 * Every regulated name in this product's legal surface therefore lives in `NOT_ESTABLISHED`
 * below and nowhere else, and the rendering test enforces that by reading the DOM: any such
 * word outside the *What is not established* section fails the build.
 *
 * ## What this file is not
 *
 * It is not a contract, not a data processing agreement, not a §2-d rider and not a legal
 * determination. It describes behaviour. Whether that behaviour satisfies any particular law,
 * framework or district is a judgement for the people who make it, on evidence — and the last
 * section of the page tells them where the evidence is.
 */

// ---------------------------------------------------------------------------
// The inventory
// ---------------------------------------------------------------------------

/**
 * One row of the data inventory.
 *
 * `id` is the join to the check. `src/legal/dataInventory.test.ts` declares a
 * `Record<InventoryId, …>` of assertions against the running service, so a row added here
 * without a check against the handler does not compile — which is the whole mechanism. A
 * claim on this page is either exercised or it is not on this page.
 */
export interface InventoryRow {
  id: string;
  /** What it is, named as a district would name it. */
  field: string;
  /** How it gets here. Every door, not the tidiest one. */
  arrives: string;
  /** Who can read it back, and by what proof. */
  reader: string;
  /** How long it lasts and what ends it sooner. */
  life: string;
}

/**
 * Everything this product holds about a person, in one table.
 *
 * The order is a reviewer's: the child first, then the child's work, then the adults, then
 * the room, then the device — because the question a district asks first is what happens to a
 * twelve-year-old, and the question it asks second is who else can see it.
 */
export const INVENTORY = [
  {
    id: "display-name",
    field: "A student's display name",
    arrives:
      "Two doors, and both are real. A teacher pastes a class list on the class's roster page, "
      + "or — in a class with no list — the child types a first name at /join, which is stored as "
      + "self-named. "
      + "The two are stored identically. BOW checks neither against anything and has no way to "
      + "know whether either is a real name.",
    reader:
      "The class's teacher key or the account that owns the class. The child sees their own "
      + "row on their own screen. A caller holding only the class code gets the class label "
      + "and the join mode, and nothing about who is in the class.",
    life:
      "With the class, and sooner if the teacher erases the seat. Taking a child off the list is "
      + "a different action and keeps the row: the child stops seeing the class and cannot sign "
      + "in again, and their teacher can still see their name and what they did. Erasing is the "
      + "one that leaves nothing.",
  },
  {
    id: "seat",
    field: "A seat number",
    arrives:
      `Issued by BOW, 1 upwards, at most ${MAX_ROSTER_SIZE} to a class. It is the join between a `
      + "child and every piece of work they have done, and it is what the evidence is filed "
      + "under rather than a name.",
    reader: "The same two proofs as the name above, plus the child for their own seat.",
    life: "With the class, or with the erase. A number freed by an erase can be given to the next name added.",
  },
  {
    id: "card-code",
    field: "The code printed on a join card",
    arrives:
      "Generated by BOW when a teacher pastes a list, or when a child joins a class that has "
      + "no list. It is handed back once, on the card.",
    reader:
      "Nobody. It is stored as a scrypt hash and a keyed lookup index, checked at the door and "
      + "never returned again — a teacher who needs one reissues the card, which replaces the "
      + "old code and releases the seat.",
    life: "With the class, or with the erase, or the moment the card is reissued.",
  },
  {
    id: "evidence-log",
    field: "A finished run: the evidence log, including the child's own written explanation",
    arrives:
      "Sent by the child's browser when they turn the work in, from a signed-in seat. It holds "
      + "every decision the run recorded and the two-to-four sentences the child wrote in their "
      + "own words. Free text written by a twelve-year-old can contain anything, so this is the "
      + "most sensitive thing here and is named first among the things that are.",
    reader:
      "The class's teacher key or the account that owns the class. The child can read back "
      + "their own run and no other. Nothing is sent to a model, and there is no model client "
      + "in this repository to send it to.",
    life: "With the class, or with the erase.",
  },
  {
    id: "checkpoint",
    field: "An unfinished run",
    arrives:
      "Written by the child's browser as they work, so that a lesson survives a closed tab. It "
      + `is an opaque payload the service never reads inside, capped at ${CHECKPOINT_CEILING_KB}KB per seat.`,
    reader:
      "The child, for their own attempt. Their teacher sees the story, the screen and two "
      + "timestamps — enough for a lap of the room — and never the payload.",
    life: "With the class, or with the erase, or when the work is turned in and the seat stops being in progress.",
  },
  {
    id: "teacher-note",
    field: "A note a teacher writes back to a child",
    arrives: "Typed by the teacher on the child's evidence page.",
    reader:
      "The child reads the text. A separate flag — worth talking about in person — is kept for "
      + "the teacher and is never sent to the child.",
    life:
      "With the class, or with the erase. A teacher can take a note back, which hides it from "
      + "the child and keeps it for the teacher.",
  },
  {
    id: "marks",
    field: "A person's marks on the writing, and any judgement a teacher overruled",
    arrives:
      "Typed by the teacher in the reading queue: four criteria and a total. An override "
      + "carries a level and a required note saying why, and is appended beside the machine "
      + "judgement rather than replacing it.",
    reader: "The class's teacher key or the account that owns the class.",
    life: "With the class, or with the erase.",
  },
  {
    id: "student-account",
    field: "A student account",
    arrives: "Created when a child first signs in with a card.",
    reader:
      "Nothing about a person is on it to read. It is an opaque id, the time it was made and a "
      + "counter that lets a teacher end every session in the room at once.",
    life:
      "Deleted with the last seat it holds — by the erase, or by the class going. A child on "
      + "two classes' lists keeps the account until both are gone.",
  },
  {
    id: "teacher-account",
    field: "A teacher account",
    arrives:
      "An email address and a password the teacher types at sign-up. The address is the "
      + "sign-in identifier and nothing else; there is no name field on the account.",
    reader:
      "The teacher. The password is a scrypt hash at N=2^15 and the recovery code is another; "
      + "neither secret is stored in a form any request can read back.",
    life:
      "Indefinitely, and this is the one thing here with no end date. Nothing in the product "
      + "deletes a teacher account, the retention sweep does not reach one, and there is no "
      + "operation on the store that would remove it — an operator has to do it by hand. The "
      + "classes that account owns still go on their own schedule.",
  },
  {
    id: "class",
    field: "A class",
    arrives: "Created by a teacher in about four seconds: a label they type, and a challenge.",
    reader:
      "A caller with only the class code gets the label, the challenge and what the class was "
      + "set — no names, no work, no key. Everything else takes the key or the account.",
    life: `${CLASS_RETENTION_DAYS} days from the day it is made, then an hourly sweep deletes it and everything in it.`,
  },
  {
    id: "device-class",
    field: "Whether the machine is shared",
    arrives:
      "One question at the door, answered shared unless the child says otherwise, because a "
      + "cart Chromebook is the normal case in these rooms.",
    reader:
      "Nobody reads it back. It sets how long the session lasts — "
      + `${SHARED_DEVICE_SESSION_HOURS} hours on a shared machine against ${OWN_DEVICE_SESSION_DAYS} days on the child's own — so that the next `
      + "child does not sit down inside the last one's session.",
    life: "It lives in the token, which expires. Nothing stores it.",
  },
  {
    id: "device",
    field: "What sits on the child's own device",
    arrives:
      "The browser keeps the run in progress, any half-typed sentence, up to three attempts a "
      + "newer build could not read, the session token and one opaque student id. This is "
      + "local storage on the machine, and it is not encrypted.",
    reader:
      "Anybody holding the machine. It is cleared when a different child signs in on it, and a "
      + "teacher can end every session in the class in one action.",
    life:
      "Until a different child signs in, or the browser's storage is cleared. Nothing on the "
      + "service can reach it.",
  },
] as const satisfies readonly InventoryRow[];

export type InventoryId = (typeof INVENTORY)[number]["id"];

// ---------------------------------------------------------------------------
// What is not held
// ---------------------------------------------------------------------------

/**
 * The reassurances that survive being read against the code, and no others.
 *
 * Deliberately a list of fields rather than a sweep. *"No personal information"* is the
 * sentence that gets a vendor caught, because a child's own sentences are personal
 * information and this product holds them on purpose.
 */
export const NOT_HELD: readonly string[] = [
  "No email address for a child. There is no field on any student screen to type one into.",
  "No password for a child, and nothing a child chooses. The code on their card is issued by "
  + "BOW, checked at the door and never handed back.",
  "No date of birth, no age, no grade, no home address, no phone number.",
  "No student number, no SIS identifier, no school — nothing issued by anybody but BOW.",
  "No photograph, no voice, no video, no location.",
  "Nothing about any real money. Every dollar in this product belongs to a story.",
  "No behavioural profile that outlives the class, no cross-class picture of a child, no advertising identifier of any kind.",
  "No payment details, from anybody.",
];

// ---------------------------------------------------------------------------
// Who can open it
// ---------------------------------------------------------------------------

export interface DoorRow {
  id: string;
  /** Who is knocking. */
  caller: string;
  /** What they are holding. */
  proof: string;
  /** What opens. */
  opens: string;
}

export const DOORS = [
  {
    id: "anonymous",
    caller: "Anybody, holding a class code",
    proof: "A five-character code off a whiteboard.",
    opens:
      "The class label, the challenge and what the class was set — and, at the roster door, the "
      + "label and the join mode. No names, no work, no key. A class code is read aloud to a "
      + "room and photographed, so it opens nothing about who is in the room.",
  },
  {
    id: "student",
    caller: "A signed-in child",
    proof: "A card code, exchanged once for a session token.",
    opens:
      "Their own row, their own unfinished attempt, their own finished runs and the notes their "
      + "own teacher wrote to them. Another seat's work answers as if it did not exist.",
  },
  {
    id: "teacher",
    caller: "The class's teacher",
    proof: "The class's teacher key, or a session for the account that owns the class.",
    opens:
      "The whole class: the list, every submission, every checkpoint's position, every note. "
      + "The key is not echoed back in that response, because a response body is the easiest "
      + "place for a credential to end up in a screenshot.",
  },
  {
    id: "wrong-key",
    caller: "Somebody with the wrong key, or none",
    proof: "Nothing that opens this class.",
    opens: "Nothing. One refusal, in the same words either way.",
  },
] as const satisfies readonly DoorRow[];

export type DoorId = (typeof DOORS)[number]["id"];

// ---------------------------------------------------------------------------
// Where it sits
// ---------------------------------------------------------------------------

export const PROTECTION: readonly string[] = [
  "Every record a durable store writes is sealed with AES-256-GCM under a key the deployment "
  + "supplies in BOW_STORE_KEY — a fresh 96-bit IV per record, the tag beside it. Authenticated, "
  + "so a record edited on disk fails to open rather than opening as something else, which "
  + "matters because these records are read back as authorisation decisions and not only as "
  + "content.",
  "The secret that signs every session token is derived from that same key rather than stored. "
  + "It exists in memory and in the operator's secret manager and nowhere else. A file nobody "
  + "writes is a file nobody can steal.",
  "A durable deployment that has not been given a key does not start a class. It answers 503 "
  + "and says what to set. This is a refusal rather than a warning on purpose: the failure mode "
  + "of refusing to boot is a line in a log.",
  "A deployment whose key cannot open the records already there stops writing as well as "
  + "reading — sign-in, class creation and turning work in all refuse — so that nothing is ever "
  + "added under the wrong key while the old records sit sealed and unreachable.",
  "The class code and the seat number are the directory and file names on a self-hosted disk, "
  + "so those two are visible to anybody who can list the directory. Everything inside every "
  + "record is sealed. A teacher's account file is named by a SHA-256 of their lower-cased "
  + "address: that is not the address, but a known address can be checked against it.",
  "Passwords and card codes are scrypt at N=2^15, with the parameters stored beside each hash "
  + "so raising the cost later does not invalidate an existing account. Sign-in does the same "
  + "work when there is no such account as when there is, so timing does not turn the endpoint "
  + "into a directory of a district's teachers.",
  "A key can be replaced without losing a term of work: npm run rekey re-seals a store under a "
  + "new key, offline, reading the source read-only, verifying every record rather than a "
  + "sample, and planting the canary last so a half-finished directory cannot look complete.",
  "The API answers every request with no-store, nosniff, DENY and a same-origin referrer policy, "
  + "and grants cross-origin access to no address but the ones in BOW_ALLOWED_ORIGIN. Self-hosted "
  + "it speaks plain HTTP and says so on the console at startup: putting a TLS terminator in "
  + "front of it is the operator's job and the product cannot do it for them.",
];

// ---------------------------------------------------------------------------
// How long, and what deletion does
// ---------------------------------------------------------------------------

export const RETENTION: readonly string[] = [
  `A class is kept for CLASS_RETENTION_DAYS days from the day it is made — ${CLASS_RETENTION_DAYS} today — `
  + "and then an hourly sweep deletes the class, its list, every submission, every checkpoint, "
  + "every note and any share-out. The sweep runs on a timer where there is a process to hold "
  + "one and off the back of a request where there is not, and it never blocks the request it "
  + "rode in on.",
  "That promise is executable and the service reports on it: GET /api/health carries the "
  + "retention window, when this process last swept and how many classes that sweep deleted. "
  + "A retention policy nothing runs is a sentence in a document rather than a property of a "
  + "system, and this product shipped one of those once.",
  "One child can be erased sooner, by their teacher, from the class list. Their name, "
  + "everything they turned in, every checkpoint, every note their teacher wrote to them and "
  + "their place in any share-out go in the same request. Their account goes too when it holds "
  + "no other seat. The rest of the class is untouched.",
  "What survives an erase is what already left: a gradebook a teacher copied into a "
  + "spreadsheet, a debrief they printed, a share-out on a projector. BOW cannot reach any of "
  + "those, and a district's retention question about them is a question about the school.",
  "Deleting a whole class is one request against that class, and it deletes everything in it.",
];

// ---------------------------------------------------------------------------
// Third parties
// ---------------------------------------------------------------------------

export const THIRD_PARTIES: readonly string[] = [
  "Nothing a child does in this product is sent to a third party by the browser. There is no "
  + "analytics, no tag manager, no session recorder, no advertising pixel, no CDN and no error "
  + "reporter, and the type is the machine's own — no web font is fetched, from anywhere. The "
  + "deployed policy is connect-src 'self': the browser may talk to this deployment's own API "
  + "and to nothing else.",
  "There is no model client. A child's written explanation is read by their teacher, and there "
  + "is no package in this repository that could send it anywhere for a machine to read. "
  + "src/docsDataClaims.test.ts fails the build if one is added.",
  "Two links on the educator pages point at nysed.gov, and following one is an ordinary "
  + "navigation the reader's own browser makes. They carry rel=noreferrer, so no address from "
  + "this product travels with the click.",
  "At rest, who else holds the records is a deployment decision and this page will not pretend "
  + "otherwise. Configured with KV_REST_API_URL or UPSTASH_REDIS_REST_URL the service writes to "
  + "a managed key-value store — somebody else's hardware, sealed before it leaves this "
  + "process. With neither, it writes to a disk the operator owns. Whoever hosts the deployment "
  + "is a party to it either way. BOW ships no subprocessor list because the list belongs to "
  + "the deployment being bought, and the district should ask for that deployment's own.",
  "BOW keeps no access log of its own. There is exactly one line the class service ever writes "
  + "about a request, and it writes it when the request failed: the method, the path and the "
  + "exception's message. A path can carry a class code and never carries a name. Whatever the "
  + "host writes is the host's, and is the district's to ask about.",
];

/**
 * What would have to change for the section above to stop being true — named, because a
 * clean fact is only worth what its failure mode is worth.
 */
export const THIRD_PARTIES_WOULD_CHANGE: readonly string[] = [
  "A package appearing in package.json that talks to somebody — an analytics client, an error "
  + "reporter, a model client.",
  "Any host other than 'self' appearing in connect-src in vercel.json, which is the policy the "
  + "browser is actually served.",
  "A deployment configured against a managed key-value store, which is a choice the operator "
  + "makes and a party the district should be told about.",
];

// ---------------------------------------------------------------------------
// What is not established
// ---------------------------------------------------------------------------

/**
 * The regulated names, and the one place in this product they are allowed to appear.
 *
 * `noticeRenders.test.tsx` reads the rendered page, cuts out the section that renders this
 * list, and fails if any of these words survives anywhere else. That is the mechanism by
 * which this page cannot become the place the product starts claiming something: a claim
 * would have to be written outside the list, which is exactly what the test looks for.
 */
export const NOT_ESTABLISHED = [
  {
    id: "ferpa",
    name: "FERPA",
    what: "No determination has been made, by anybody, about how this product sits under it.",
  },
  {
    id: "coppa",
    name: "COPPA",
    what: "No determination has been made, and no verifiable parental consent mechanism exists here.",
  },
  {
    id: "ed-law",
    name: "New York Education Law §2-d and Part 121",
    what:
      "There is no signed rider, no parents' bill of rights supplement and no data security and "
      + "privacy plan attached to a contract, because there is no contract.",
  },
  {
    id: "nycps",
    name: "NYCPS and any district approval",
    what:
      "No district has reviewed or approved this product. Nobody has been asked, and nothing on "
      + "any screen says otherwise.",
  },
  {
    id: "nysed",
    name: "NYSED",
    what:
      "The state has not reviewed or endorsed this product. The objectives pages say so "
      + "themselves, and say that BOW can assess one of the twenty-three objectives in the "
      + "framework it names.",
  },
  {
    id: "wcag",
    name: "WCAG",
    what:
      "There is no conformance statement and no accessibility conformance report. The product "
      + "has accessibility work in it and has never been audited against a standard.",
  },
  {
    id: "audit",
    name: "Any external audit or certification",
    what:
      "No penetration test, no SOC 2, no third-party security review of the deployment a "
      + "district would buy. The engineering described above is described by the people who "
      + "wrote it, and the last section says how to check every line of it.",
  },
] as const satisfies readonly { id: string; name: string; what: string }[];

export type NotEstablishedId = (typeof NOT_ESTABLISHED)[number]["id"];

/** The sentence that governs the section, and the reason the words above are sayable at all. */
export const NOT_ESTABLISHED_LEDE =
  "BOW claims none of these. Each is named here so that a reviewer can see it has been "
  + "considered and left open, rather than finding the silence themselves.";

// ---------------------------------------------------------------------------
// The gaps in the product itself
// ---------------------------------------------------------------------------

/**
 * What a district asks for and this product does not have. Written as flatly as the rest,
 * because a gap a vendor names is a gap a district can plan around and a gap a vendor hides
 * is the reason the next four sentences are not believed.
 */
export const GAPS: readonly string[] = [
  "Retention is not configurable. CLASS_RETENTION_DAYS is a constant in the code, the same for "
  + "every deployment and every district; changing it is a code change and a redeploy, not a "
  + "setting. A district that needs one school year cannot have one today.",
  "There is no district-level anything. No view across classes, no erase across classes, no "
  + "administrator. Erasing one child from every class they are in means asking each of those "
  + "classes' teachers, one at a time.",
  "A teacher cannot delete their own account, and nothing else does either. Their address and "
  + "the hash of their password stay in the store until somebody removes them by hand.",
  "There is no signable document. No data processing agreement, no rider of the kind a New "
  + "York district attaches to a contract, no terms of service. This page is a description and "
  + "not an undertaking, and a district's counsel will need something else to open.",
  "There is no roster integration. No SIS, no Google Classroom, no Clever, and so no data "
  + "flowing either way with a district's own systems — which is a privacy fact as well as a "
  + "workload one.",
  "There is no email service behind this product at all. It cannot notify anybody of anything, "
  + "which is why a teacher's account recovery is a code printed once at sign-up.",
];

// ---------------------------------------------------------------------------
// Contact, and what happens if something goes wrong
// ---------------------------------------------------------------------------

/**
 * The section that says there is no answer.
 *
 * An honest gap beats a fabricated commitment, and an invented address or an invented
 * notification window is exactly the sentence a district quotes back at a vendor eighteen
 * months later. So nothing here is invented.
 */
export const CONTACT: readonly string[] = [
  "There is no published contact for data protection questions, and no named data protection "
  + "officer. This page will not invent one.",
  "There is no incident-notification commitment: no window, no channel, no named recipient. "
  + "There is also no mechanism in the product that could send a notification, because there is "
  + "no email service in it.",
  "Until those exist, the party accountable for a running deployment is whoever operates it. "
  + "For a district evaluating this, that is the first thing to establish in writing and it "
  + "cannot be established from this page.",
];

// ---------------------------------------------------------------------------
// How to check it
// ---------------------------------------------------------------------------

export interface CheckRow {
  id: string;
  /** The question a reviewer is actually asking. */
  question: string;
  /** What to run or read, and what comes back. */
  how: string;
}

export const CHECKS = [
  {
    id: "door",
    question: "Does a class code open anything about the children in the class?",
    how:
      "GET /api/classes/:code answers the label, the challenge and the assignment. "
      + "GET /api/classes/:code/roster answers the label and the join mode. "
      + "GET /api/classes/:code/submissions answers not_authorised — with no key and with a wrong one.",
  },
  {
    id: "sealed",
    question: "Are the records really sealed?",
    how:
      "Run a class against a file store, then search the store directory for a name you pasted. "
      + "It is not there in the clear; every record is a v/iv/tag/ct envelope.",
  },
  {
    id: "keyless",
    question: "What happens without a key, or with the wrong one?",
    how:
      "With no BOW_STORE_KEY, GET /api/health answers 503 with the unconfigured store and the "
      + "service will not open a class. Point a different key at a store that already has "
      + "records and health answers 503 with storeKey mismatch, and class creation, sign-in and "
      + "turning work in all refuse.",
  },
  {
    id: "retention",
    question: "Does the retention promise actually run?",
    how:
      "GET /api/health carries retention.days, retention.lastSweepAt and "
      + "retention.lastSweepDeleted. The last two are null until this process has swept, and "
      + "stop being null after the first request that touches the store.",
  },
  {
    id: "erase",
    question: "Does erasing a child really erase them?",
    how:
      "DELETE /api/classes/:code/roster/:seat?erase=1, then read the evidence room again: the "
      + "seat is gone from the list, the submissions and the notes, and on a file store the "
      + "records are gone from the disk.",
  },
  {
    id: "source",
    question: "Is any of this different in the code from what it says here?",
    how:
      "src/legal/dataInventory.test.ts runs every row of the inventory above against the "
      + "handler and a real sealed store, and src/legal/noticeRenders.test.tsx checks that this "
      + "page still says all of it. Both are in the repository and both run in npm test.",
  },
] as const satisfies readonly CheckRow[];

export type CheckId = (typeof CHECKS)[number]["id"];
