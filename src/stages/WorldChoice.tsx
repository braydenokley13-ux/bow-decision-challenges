import { useEffect, useRef } from "react";
import { useChallenge } from "../app/ChallengeContext";
import { AppMark } from "../components/primitives/AppMark";
import { Button } from "../components/primitives/Button";
import { CourtBackdrop } from "../components/story/CourtBackdrop";
import { MarketBackdrop } from "../components/story/MarketBackdrop";
import { STUDENT_COPY } from "../content/studentCopy";
import type { WorldId } from "../domain/core/ids";
import { DEFAULT_WORLD_ID, PLAYABLE_WORLDS, WORLD_CHOICE_UI_READY, WORLD_REGISTRY } from "../domain/scenario/registry";
import { worldOffer } from "./worldOffer";

const COPY = STUDENT_COPY.choose;
const PLAYABLE = PLAYABLE_WORLDS.map((world) => world.id);

/**
 * The world choice (§13.3).
 *
 * Two things happen here and only one of them is a screen. The other is the case where there
 * is nothing to choose — one world allowed, or a teacher who kept the choice — and then this
 * component draws nothing at all and opens that world. A picker with one card is a question
 * with one answer, and §13.1 is explicit that choice, where it exists, has to be real.
 *
 * The offer is re-read from the class rather than carried in the URL or the log, because a
 * student who reloads mid-choice has to land back on the same offer. `worldOffer` is where
 * the rule lives; this is where it is asked.
 */
export function WorldChoice() {
  const { state, dispatch, transport, offer, setOffer, enterWorld } = useChallenge();
  // A ref, not state: asking the class what it was set is a one-off errand, and a second
  // render is not what should record that the errand is under way.
  const asking = useRef(false);
  const opened = useRef(false);
  const classCode = state.meta.classCode;
  const assignmentId = state.meta.assignmentId;

  useEffect(() => {
    if (offer || asking.current) return;
    asking.current = true;
    // A refresh lands here with a session but no answer from the class in memory. Ask again;
    // an unreachable class falls back to every world this build can open, because the student
    // has already joined once and a network that dropped afterwards is not their problem.
    const resolve = async () => {
      const fallback = { allowedWorldIds: [] as readonly WorldId[], assignmentAllowsChoice: true };
      let found = fallback;
      if (classCode) {
        const result = await transport.join(classCode);
        if (result.ok) {
          const assignment = result.joined.assignments.find((entry) => entry.id === assignmentId)
            ?? result.joined.assignments[0];
          found = assignment
            ? { allowedWorldIds: assignment.allowedWorldIds, assignmentAllowsChoice: assignment.studentChoosesWorld }
            : fallback;
        }
      }
      setOffer(worldOffer({
        ...found,
        playableWorldIds: PLAYABLE,
        pickerReady: WORLD_CHOICE_UI_READY,
        defaultWorldId: DEFAULT_WORLD_ID,
      }));
    };
    void resolve();
  }, [offer, classCode, assignmentId, transport, setOffer]);

  const open = (worldId: WorldId) => {
    if (opened.current) return;
    opened.current = true;
    // Basketball's own machine confirms and moves; the pop-up brings its own machine, which
    // starts itself with this seat's session. Neither world is told about the other, and the
    // action type only admits the one world this provider's reducer can actually play — so a
    // bug here cannot start one world's machine inside another world's story.
    if (worldId === "basketball") dispatch({ type: "WORLD_CONFIRMED", worldId: "basketball" });
    else enterWorld(worldId);
  };

  useEffect(() => {
    if (!offer || offer.studentChooses) return;
    open(offer.opensInto);
    // `open` is stable in effect: it guards itself and neither dispatch nor enterWorld change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offer]);

  // Nothing to choose between, so nothing is drawn. The world is already opening.
  if (!offer || !offer.studentChooses) {
    return (
      <div className="worldpick worldpick--waiting">
        <p aria-live="polite">{COPY.checking}</p>
      </div>
    );
  }

  return (
    <div className="worldpick">
      <div className="worldpick__bar">
        <AppMark />
        <span>{state.meta.classCode} · seat {state.meta.seatCode}</span>
      </div>
      <main className="worldpick__main">
        <header className="worldpick__say">
          <h1>{COPY.title}</h1>
          <p>{COPY.deck}</p>
        </header>
        <ul className="worldpick__cards">
          {offer.worldIds.map((worldId) => {
            const world = WORLD_REGISTRY[worldId];
            if (!world) return null;
            return (
              <li key={worldId}>
                <article className="worldcard" data-world={worldId}>
                  <div className="worldcard__scene scene">
                    {worldId === "food-truck" ? <MarketBackdrop variant="stall" /> : <CourtBackdrop variant="key" />}
                    <h2>{world.title}</h2>
                  </div>
                  <div className="worldcard__body">
                    <p className="worldcard__hook">{world.subtitle}</p>
                    <dl className="worldcard__facts">
                      <div>
                        <dt>{COPY.role}</dt>
                        <dd>{world.role}</dd>
                      </div>
                      <div>
                        <dt>{COPY.length}</dt>
                        <dd>{world.durationMinutes.min}–{world.durationMinutes.max} {COPY.minutes}</dd>
                      </div>
                    </dl>
                    {/* Two cards carrying one label is two buttons a screen reader cannot
                        tell apart. The accessible name names the world and still contains
                        the visible words, so both readings agree. */}
                    <Button type="button" aria-label={`${COPY.start}: ${world.title}`} onClick={() => open(worldId)}>{COPY.start}</Button>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      </main>
    </div>
  );
}
