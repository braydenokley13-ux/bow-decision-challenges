import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../components/primitives/Button";
import { EducatorShell } from "./EducatorShell";
import { CLASS_API_BASE } from "../platform/evidence/transports";
import { keyForClass } from "./classMemory";
import { MAX_ROSTER_SIZE, type ClassJoinMode, type JoinCard } from "../platform/identity/types";

/**
 * The class list, and the cards that come off it.
 *
 * This surface did not exist, and its absence was the whole account system's largest defect:
 * every route below is one the service has had since accounts shipped, and a teacher had no
 * way to reach any of them. Four other screens told teachers to read out a class code and
 * hand out seat numbers — instructions for a sign-in the student flow stopped having. A
 * product where the only way to run the thing it is for is `curl` is not a product.
 *
 * Two facts drive the whole layout.
 *
 * **A card is shown once.** The join code is hashed the moment it is made and the service
 * cannot produce it again — which is the right design and a hostile one to a teacher who
 * navigates away. So the cards are the loudest thing on the screen the moment they exist, the
 * page says plainly that this is the only time they appear, and reissuing is one press from
 * every row for the rest of the term.
 *
 * **A name here is not a claim about a child.** BOW stores no personal information about a
 * student at all: the account behind a seat is an id and a credential. Every human-readable
 * label on this page belongs to the teacher's own class, was typed by them, and BOW has no way
 * to know whether any of it is a real name. The page says so where a teacher is about to type,
 * rather than in a policy nobody opens.
 */

interface RosterRow {
  seatCode: string;
  displayName: string;
  claimed: boolean;
  claimedAt: number | null;
  removedAt: number | null;
}

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; rows: RosterRow[]; joinMode: ClassJoinMode };

/** Two names are the same name when a person would say they were. */
function normalName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}

export function Roster() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const keyQuery = params.get("key") ? `?key=${params.get("key")}` : "";
  const teacherKey = code ? params.get("key") ?? keyForClass(code) : null;
  // A browser with no key for this class is a fact about the arrival, not a load that fails —
  // so it resolves during render rather than as the first thing an effect does.
  const [state, setState] = useState<State>(() => (code && teacherKey
    ? { status: "loading" }
    : { status: "error", message: "This browser does not hold the key for that class. Open it from the link you were given, or from My classes." }));
  // Held in component state and nowhere else, deliberately. A card that survived a reload
  // would be a join code sitting in a browser store on a staffroom machine.
  const [cards, setCards] = useState<JoinCard[]>([]);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  // A paste that is mostly names already on the list, held back with the question asked rather
  // than added. See `add` below.
  const [duplicates, setDuplicates] = useState<{ already: string[]; fresh: string[] } | null>(null);
  // The seats the last paste created, so one press can take them off again.
  const [lastBatch, setLastBatch] = useState<string[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  // Which seat has been asked to be erased, and is one press from being erased. Erasure is the
  // one thing on this page that cannot be undone, so it asks — once, in place, naming the
  // person — rather than firing off a control that sits beside "Print a new card".
  const [erasing, setErasing] = useState<string | null>(null);

  const call = useCallback(async (path: string, init: RequestInit = {}) => {
    const response = await fetch(`${CLASS_API_BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", "X-BOW-Teacher-Key": teacherKey ?? "", ...(init.headers ?? {}) },
    });
    const text = await response.text();
    const body: unknown = text ? JSON.parse(text) : null;
    if (!response.ok) {
      const message = typeof (body as { message?: unknown })?.message === "string"
        ? (body as { message: string }).message
        : "That did not work. Try again.";
      throw new Error(message);
    }
    return body;
  }, [teacherKey]);

  const load = useCallback(async () => {
    if (!code || !teacherKey) return;
    try {
      const body = (await call(`/classes/${code}/roster`)) as { roster: RosterRow[]; joinMode: ClassJoinMode };
      setState({ status: "ready", rows: body.roster, joinMode: body.joinMode });
    } catch (error) {
      setState({ status: "error", message: error instanceof Error ? error.message : "That class did not open." });
    }
  }, [call, code, teacherKey]);

  useEffect(() => {
    let cancelled = false;
    void (async () => { if (!cancelled) await load(); })();
    return () => { cancelled = true; };
  }, [load]);

  /**
   * Adding the names, and the second press that used to double the class.
   *
   * Pasting twenty-eight names takes about three seconds of server work behind a button that
   * says *Making cards…* and nothing else, which is exactly long enough for a teacher on a
   * school laptop to decide it has hung and press again. What came back was fifty-six on the
   * list, every child twice, twenty-eight dead cards and no way back but twenty-eight
   * "take off the list" presses.
   *
   * So a name already on the live list is not added silently. If the whole paste is already
   * there it says so and adds nothing; if part of it is, it asks which — and the answer that
   * needs no thought, *add the four who are new*, is the one that takes one press. A teacher
   * who really does have two children with the same name can still add both, deliberately.
   *
   * Names are compared the way a person would compare them: case and spacing do not count.
   */
  const namesTyped = (): string[] => typed.split("\n").map((line) => line.trim()).filter((line) => line.length > 0);

  const send = async (names: string[]) => {
    if (names.length === 0 || busy) return;
    setBusy(true);
    setProblem(null);
    setDuplicates(null);
    try {
      const body = (await call(`/classes/${code}/roster`, { method: "POST", body: JSON.stringify({ names }) })) as { cards: JoinCard[] };
      setCards(body.cards);
      setLastBatch(body.cards.map((card) => card.seatCode));
      setTyped("");
      await load();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Those names were not added.");
    }
    setBusy(false);
  };

  const add = async () => {
    const names = namesTyped();
    if (names.length === 0 || busy) return;
    const onList = new Set(
      (state.status === "ready" ? state.rows : [])
        .filter((row) => !row.removedAt)
        .map((row) => normalName(row.displayName)),
    );
    const already = names.filter((name) => onList.has(normalName(name)));
    if (already.length === 0) {
      await send(names);
      return;
    }
    setProblem(null);
    setDuplicates({ already, fresh: names.filter((name) => !onList.has(normalName(name))) });
  };

  /**
   * Taking the last paste back off the list.
   *
   * The undo the paste box never had. It removes the seats this page just created and nothing
   * else — a seat added in an earlier batch, or by hand, is not in the list it holds.
   */
  const undoLastBatch = async () => {
    if (busy || !lastBatch || lastBatch.length === 0) return;
    setBusy(true);
    setProblem(null);
    try {
      for (const seatCode of lastBatch) {
        await call(`/classes/${code}/roster/${seatCode}`, { method: "DELETE" });
      }
      setCards([]);
      setLastBatch(null);
      await load();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Those names were not taken off.");
    }
    setBusy(false);
  };

  const reissue = async (seatCode: string) => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      const body = (await call(`/classes/${code}/roster/${seatCode}/code`, { method: "POST" })) as { card: JoinCard };
      setCards([body.card]);
      await load();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "That card was not reissued.");
    }
    setBusy(false);
  };

  const remove = async (row: RosterRow) => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await call(`/classes/${code}/roster/${row.seatCode}`, { method: "DELETE" });
      await load();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "That student was not removed.");
    }
    setBusy(false);
  };

  const erase = async (row: RosterRow) => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await call(`/classes/${code}/roster/${row.seatCode}?erase=1`, { method: "DELETE" });
      setErasing(null);
      await load();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "That student was not erased.");
    }
    setBusy(false);
  };

  const signOutEveryone = async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    try {
      await call(`/classes/${code}/signout`, { method: "POST" });
      await load();
    } catch (error) {
      setProblem(error instanceof Error ? error.message : "Nobody was signed out.");
    }
    setBusy(false);
  };

  if (state.status === "loading") {
    return <EducatorShell><p className="class-state" aria-live="polite">Opening the class…</p></EducatorShell>;
  }
  if (state.status === "error") {
    return (
      <EducatorShell>
        <header className="page-header"><p className="eyebrow">Class list</p><h1>This class did not open.</h1><p>{state.message}</p></header>
      </EducatorShell>
    );
  }

  const live = state.rows.filter((row) => !row.removedAt);
  const room = MAX_ROSTER_SIZE - live.length;

  return (
    <EducatorShell>
      <header className="page-header page-header--with-back">
        <Link to={`/educator/class/${code ?? ""}${keyQuery}`}>← Class evidence</Link>
        <p className="eyebrow">Class list</p>
        <h1>Who is in this class.</h1>
        <p>
          Paste your class list and BOW gives you one card per student to hand out. A student
          signs in by typing the class code and the code on their card — nothing else, and
          never a name they type themselves.
        </p>
      </header>

      {cards.length > 0 && <Cards cards={cards} classCode={code ?? ""} onDone={() => setCards([])} />}

      <section className="dashboard-section roster-add">
        <div className="section-heading">
          <p className="eyebrow">{live.length} on the list · room for {Math.max(0, room)} more</p>
          <h2>Add students</h2>
        </div>
        <label className="field" htmlFor="roster-names">
          <span className="field-label">One name per line</span>
          <textarea
            id="roster-names"
            rows={6}
            value={typed}
            onChange={(event) => setTyped(event.target.value)}
            placeholder={"Ana R.\nDevon P.\nLeila H."}
          />
        </label>
        {/* Said where a teacher is about to type it, not in a policy. */}
        <p className="roster-add__note">
          Write what you want to see on your own screens. First names, initials, table numbers —
          BOW never checks it against anything and never asks a student for a name of their own.
        </p>
        <Button variant="primary" aria-disabled={typed.trim().length === 0 || busy} onClick={() => void add()}>
          {busy ? "Making cards…" : "Add them and make the cards"}
        </Button>
        {duplicates && (
          <div className="roster-add__note" role="group" aria-label="Names already on the list">
            <p>
              <strong>
                {duplicates.already.length} of these {duplicates.already.length + duplicates.fresh.length}{" "}
                {duplicates.already.length === 1 ? "name is" : "names are"} already on the list.
              </strong>{" "}
              {duplicates.already.slice(0, 6).join(", ")}
              {duplicates.already.length > 6 ? ` and ${duplicates.already.length - 6} more` : ""}.
            </p>
            <div className="feedback__actions">
              {duplicates.fresh.length > 0 && (
                <Button variant="primary" aria-disabled={busy} onClick={() => void send(duplicates.fresh)}>
                  Add the {duplicates.fresh.length} that {duplicates.fresh.length === 1 ? "is" : "are"} new
                </Button>
              )}
              {/* Two children really can have the same name, and a teacher who means it says so. */}
              <Button variant="secondary" aria-disabled={busy} onClick={() => void send(namesTyped())}>
                Add all {duplicates.already.length + duplicates.fresh.length} anyway
              </Button>
              <Button variant="quiet" aria-disabled={busy} onClick={() => setDuplicates(null)}>Cancel</Button>
            </div>
          </div>
        )}
        {lastBatch && lastBatch.length > 0 && !duplicates && (
          <p className="roster-add__note">
            <Button variant="quiet" aria-disabled={busy} onClick={() => void undoLastBatch()}>
              Undo — take those {lastBatch.length} back off the list
            </Button>
          </p>
        )}
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <p className="eyebrow">{live.filter((row) => row.claimed).length} of {live.length} have signed in</p>
          <h2>The list</h2>
        </div>
        {live.length === 0 ? (
          <p className="class-state">
            Nobody yet. Until you add a list, anybody with the class code can sign in by typing
            their own name — which is fine for a lesson you set up in four minutes, and is the
            reason to paste a list before one you are marking.
          </p>
        ) : (
          <ul className="roster-list">
            {live.map((row) => (
              <li key={row.seatCode}>
                <div>
                  <strong>{row.displayName}</strong>
                  <span className="roster-list__seat">Seat {row.seatCode}</span>
                </div>
                <span className="roster-list__state" data-claimed={row.claimed}>
                  {row.claimed ? `Signed in ${row.claimedAt ? new Date(row.claimedAt).toLocaleDateString() : ""}` : "Has not signed in"}
                </span>
                <div className="roster-list__acts">
                  {erasing === row.seatCode ? (
                    <>
                      {/* Said in the sentence, not in a dialog: what goes, what it cannot be
                          undone from, and that the rest of the class is untouched. */}
                      <p className="roster-list__warn">
                        Erase {row.displayName}? Their name, everything they turned in and everything you
                        wrote back are deleted from BOW. It cannot be undone, and the rest of the class is
                        not affected.
                      </p>
                      <Button variant="primary" onClick={() => void erase(row)}>Erase everything</Button>
                      <Button variant="quiet" onClick={() => setErasing(null)}>Keep it</Button>
                    </>
                  ) : (
                    <>
                      <Button variant="quiet" onClick={() => void reissue(row.seatCode)}>Print a new card</Button>
                      <Button variant="quiet" onClick={() => void remove(row)}>Take off the list</Button>
                      <Button variant="quiet" onClick={() => setErasing(row.seatCode)}>Erase</Button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {/* What each control actually does, once, rather than a confirm dialog per press. */}
        <p className="roster-add__note">
          A new card stops the old one working. Taking a student off the list keeps everything they
          turned in — it stops them signing in, and their work stays in the evidence. <strong>Erase</strong>
          {" "}is the other one: it deletes the name and everything that student did, for a family who has
          asked you to. Nobody else in the class is affected, and it cannot be undone.
        </p>
      </section>

      <section className="dashboard-section">
        <div className="section-heading">
          <p className="eyebrow">End of the day</p>
          <h2>Sign everybody out</h2>
        </div>
        <p>
          One press ends every student session in this class, on every device. Nothing they did
          is lost. Use it when the Chromebooks go back on the trolley.
        </p>
        <Button variant="secondary" aria-disabled={busy} onClick={() => void signOutEveryone()}>Sign the whole class out</Button>
      </section>

      <p className="join-error" role="alert">{problem}</p>
    </EducatorShell>
  );
}

/**
 * The cards, once.
 *
 * The service hashes a join code the instant it makes one and cannot produce it again, so this
 * block is the only moment these six characters exist anywhere a person can read them. That is
 * worth being blunt about rather than decorating: the heading says it, the print button is the
 * primary action, and dismissing it is a deliberate press rather than a navigation away.
 */
function Cards({ cards, classCode, onDone }: { cards: readonly JoinCard[]; classCode: string; onDone: () => void }) {
  return (
    <section className="cards-sheet" aria-live="polite">
      <div className="cards-sheet__head">
        <div>
          <p className="eyebrow">{cards.length === 1 ? "One new card" : `${cards.length} cards`}</p>
          <h2>Print these now. They are not shown again.</h2>
          <p>
            Cut them up and hand one to each student. If one goes missing you can print a
            replacement from the list below — the lost one stops working when you do.
          </p>
        </div>
        <div className="cards-sheet__acts">
          <Button variant="primary" onClick={() => window.print()}>Print</Button>
          <Button variant="quiet" onClick={onDone}>I have them</Button>
        </div>
      </div>
      <ol className="cards-sheet__grid">
        {cards.map((card) => (
          <li key={card.seatCode} className="join-card">
            <p className="join-card__name">{card.displayName}</p>
            <dl>
              <div><dt>Class code</dt><dd>{classCode}</dd></div>
              <div><dt>Your code</dt><dd>{card.joinCode}</dd></div>
            </dl>
            <p className="join-card__where">Go to BOW · type the class code · type your code</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
