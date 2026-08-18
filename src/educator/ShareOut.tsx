import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { Button } from "../components/primitives/Button";
import { EducatorShell } from "./EducatorShell";
import { CLASS_API_BASE } from "../platform/evidence/transports";
import type { ShareOutItem, ShareOutSelection } from "../platform/identity/types";
import { useClassEvidence } from "./useClassEvidence";
import { classRoll } from "./analysis";
import { seatLabel, seatNames } from "./names";
import { shareOutCandidates, shareOutSlides, type ShareOutCandidate, type ShareOutSlide } from "./shareOut";
import type { AttributedSubmission } from "../platform/classes/types";
import { WORLD_REGISTRY } from "../domain/scenario/registry";
import { worldOfSubmission } from "./objectiveResults";

/**
 * Five minutes of conversation, prepared in about ninety seconds.
 *
 * Smith & Stein's five practices name the two things software can help with — **select** and
 * **sequence** — and the Debrief did neither: it printed the first four explanations in seat
 * order with no reason attached to any of them. This is the surface that does them.
 *
 * The teacher is shown candidates *with BOW's reason for offering each one*, chooses at most
 * five, writes their own note about why, and puts them in an order. Then there is a present
 * mode: one item at a time, sized for a room rather than for a laptop, driven by arrow keys.
 *
 * **Present mode is the projector, so nothing private is in it.** There is no second screen
 * here: what this renders is what thirty students are looking at. The teacher's note — the
 * field labelled *for you, not the room* — stays on the planning page they typed it on and is
 * not part of the slide at all; `ShareOutSlide` does not carry it, so no future edit to this
 * component can put it back on a wall by accident. It starts empty rather than pre-filled
 * with BOW's own sentence, because a field that says it holds the teacher's reason has to
 * hold the teacher's reason.
 *
 * Anonymity is the default and it is real anonymity. A seat number is the class's own
 * identifier for a person — every student in the room can read it off the board and half of
 * them know whose it is — so projected work is `Plan A` and `Plan B`, positional within one
 * selection and meaningless outside it, unless the teacher deliberately turns names on.
 */

const MAX_ITEMS = 5;

/** The control Present mode was opened from, and the one focus is handed back to on the way out. */
const PRESENT_BUTTON_ID = "share-out-present";

export function ShareOut() {
  const { code } = useParams();
  const [params] = useSearchParams();
  const keyQuery = params.get("key") ? `?key=${params.get("key")}` : "";
  const { state, teacherKey } = useClassEvidence(code);
  const [selection, setSelection] = useState<ShareOutSelection | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [saving, setSaving] = useState(false);

  /* Leaving Present mode used to drop focus on `<body>`, which puts a keyboard teacher at the
     top of a long page with no memory of where they were. The control that opened the
     projector is the place to come back to. `Button` is a plain function component and does
     not forward a ref, so the button is found by id rather than held in one — the alternative
     was changing a shared primitive this surface does not own. */
  const wasPresenting = useRef(false);
  useEffect(() => {
    if (wasPresenting.current && !presenting) document.getElementById(PRESENT_BUTTON_ID)?.focus();
    wasPresenting.current = presenting;
  }, [presenting]);

  const load = useCallback(async () => {
    if (!code || !teacherKey) return;
    try {
      const response = await fetch(`${CLASS_API_BASE}/classes/${code}/shareout`, {
        headers: { "X-BOW-Teacher-Key": teacherKey },
      });
      if (!response.ok) return;
      const body = (await response.json()) as { selection: ShareOutSelection | null };
      setSelection(body.selection);
    } catch { /* an unreachable service leaves the last-loaded selection on screen */ }
  }, [code, teacherKey]);

  // Read once when the class opens, and again after every write, because a share-out is a
  // thing two teachers might be editing from two devices at the front of the same room.
  useEffect(() => {
    let cancelled = false;
    void (async () => { if (!cancelled) await load(); })();
    return () => { cancelled = true; };
  }, [load]);

  const save = async (items: readonly ShareOutItem[], named: boolean) => {
    if (!code || !teacherKey || saving) return;
    setSaving(true);
    try {
      const response = await fetch(`${CLASS_API_BASE}/classes/${code}/shareout`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", "X-BOW-Teacher-Key": teacherKey },
        body: JSON.stringify({ items, named }),
      });
      if (response.ok) {
        const body = (await response.json()) as { selection: ShareOutSelection };
        setSelection(body.selection);
      }
    } catch { /* keeping the local edit is better than throwing it away */ }
    setSaving(false);
  };

  if (state.status === "loading") {
    return <EducatorShell><p className="class-state" aria-live="polite">Opening the class…</p></EducatorShell>;
  }
  if (state.status === "error") {
    return (
      <EducatorShell>
        <header className="page-header"><p className="eyebrow">Share-out</p><h1>This class did not open.</h1><p>{state.message}</p></header>
      </EducatorShell>
    );
  }

  const { analysis, submissions, record, roster } = state;
  const names = seatNames(roster);
  const nameFor = (seatCode: string) => seatLabel(seatCode, names);
  // The same class the class page counts: seats the teacher has not removed, one attempt
  // each. A share-out that offered a seat the roll no longer has would be putting a student
  // the teacher took out of the room onto the wall of it.
  const roll = classRoll({ rows: analysis.rows, roster });
  const inClass = new Set(roll.rows.map((row) => row.sessionId));
  const named = selection?.named ?? false;
  const items = (selection?.items ?? []).filter((item) => inClass.has(item.sessionId));
  const candidates = shareOutCandidates(roll.rows, submissions);
  const slides = shareOutSlides({ items, submissions, named, nameFor, summaryFor: summaryOf });

  if (presenting && slides.length > 0) {
    return <Present slides={slides} onClose={() => setPresenting(false)} />;
  }

  const toggle = (candidate: ShareOutCandidate) => {
    const already = items.find((item) => item.sessionId === candidate.sessionId);
    const next = already
      ? items.filter((item) => item.sessionId !== candidate.sessionId).map((item, index) => ({ ...item, order: index }))
      : items.length >= MAX_ITEMS
        ? items
        // Empty, not pre-filled. BOW's reason for offering this one is already on the card
        // beside it; copying it into a field labelled as the teacher's own would make the
        // machine's sentence read as theirs.
        : [...items, { sessionId: candidate.sessionId, seatCode: candidate.seatCode, note: "", order: items.length }];
    void save(next, named);
  };

  const move = (sessionId: string, by: number) => {
    const ordered = [...items].sort((a, b) => a.order - b.order);
    const at = ordered.findIndex((item) => item.sessionId === sessionId);
    const to = at + by;
    if (at < 0 || to < 0 || to >= ordered.length) return;
    const swapped = ordered[at]!;
    ordered[at] = ordered[to]!;
    ordered[to] = swapped;
    void save(ordered.map((item, index) => ({ ...item, order: index })), named);
  };

  return (
    <EducatorShell>
      <header className="page-header page-header--with-back">
        <Link to={`/educator/class/${record.code}${keyQuery}`}>← Class evidence</Link>
        <p className="eyebrow">{record.label} · Share-out</p>
        <h1>Pick what the room sees.</h1>
        <p>
          Nothing is shown unless you choose it. Up to {MAX_ITEMS}, in the order you want to take them —
          {" "}two that disagree first is usually the way in.
        </p>
      </header>

      {roll.rows.length === 0 ? (
        <p className="class-state">Nothing has been turned in yet, so there is nothing to show.</p>
      ) : (
        <>
          <section className="dashboard-section">
            <div className="section-heading">
              <p className="eyebrow">Chosen · {items.length} of {MAX_ITEMS}</p>
              <h2>What you will show, in order</h2>
            </div>
            {items.length === 0 ? (
              <p className="class-state">Nothing chosen yet. Pick from the list below.</p>
            ) : (
              <ol className="shareout-chosen">
                {[...items].sort((a, b) => a.order - b.order).map((item, index) => (
                  <li key={item.sessionId}>
                    <div>
                      <strong>{named ? nameFor(item.seatCode) : `Plan ${"ABCDE"[index] ?? index + 1}`}</strong>
                      <label className="field">
                        <span className="field-label">Why this one — for you, not the room</span>
                        <input
                          value={item.note}
                          maxLength={200}
                          placeholder="Your own reason. Stays on this page."
                          onChange={(event) => {
                            const note = event.target.value;
                            void save(items.map((entry) => entry.sessionId === item.sessionId ? { ...entry, note } : entry), named);
                          }}
                        />
                      </label>
                    </div>
                    <div className="shareout-chosen__moves">
                      <Button variant="quiet" aria-label="Move earlier" onClick={() => move(item.sessionId, -1)}>↑</Button>
                      <Button variant="quiet" aria-label="Move later" onClick={() => move(item.sessionId, 1)}>↓</Button>
                      <Button variant="quiet" onClick={() => void save(items.filter((entry) => entry.sessionId !== item.sessionId).map((entry, at) => ({ ...entry, order: at })), named)}>Remove</Button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
            <label className="checkline">
              <input type="checkbox" checked={named} onChange={(event) => void save([...items], event.target.checked)} />
              {/* Off by default and worth saying why on the control itself: a room discussing
                  Plan A and Plan B argues about the plans. A room discussing Ana's plan
                  argues about Ana. */}
              <span>Show names on the screen. Off means the room sees Plan A and Plan B.</span>
            </label>
            {items.length > 0 && (
              <Button id={PRESENT_BUTTON_ID} variant="primary" onClick={() => setPresenting(true)}>Show it</Button>
            )}
          </section>

          <section className="dashboard-section">
            <div className="section-heading">
              <p className="eyebrow">From this class&rsquo;s own work</p>
              <h2>Worth showing</h2>
            </div>
            <ul className="shareout-candidates">
              {candidates.map((candidate) => {
                const chosen = items.some((item) => item.sessionId === candidate.sessionId);
                return (
                  <li key={`${candidate.sessionId}-${candidate.kind}`} data-chosen={chosen}>
                    <div>
                      <p className="shareout-candidates__who">
                        {nameFor(candidate.seatCode)} · {worldTitle(candidate.worldId)}
                      </p>
                      <p className="shareout-candidates__why">{candidate.reason}</p>
                      {candidate.quote && <blockquote>{candidate.quote}</blockquote>}
                    </div>
                    <Button
                      variant={chosen ? "quiet" : "secondary"}
                      aria-disabled={!chosen && items.length >= MAX_ITEMS}
                      onClick={() => toggle(candidate)}
                    >
                      {chosen ? "Chosen" : "Show this"}
                    </Button>
                  </li>
                );
              })}
            </ul>
            {candidates.length === 0 && (
              <p className="class-state">Nothing here splits this class yet. The debrief has the counts.</p>
            )}
          </section>
        </>
      )}
    </EducatorShell>
  );
}

/** A world id off a student's own events, named. Unknown ids print themselves rather than throw. */
function worldTitle(worldId: string): string {
  return (WORLD_REGISTRY as Record<string, { title: string } | undefined>)[worldId]?.title ?? worldId;
}

/** What this student actually did, so a slide is not a quote floating on its own. */
function summaryOf(submission: AttributedSubmission): string {
  return WORLD_REGISTRY[worldOfSubmission(submission)]?.title ?? "";
}

/**
 * The projector.
 *
 * One item at a time, at a size that reads from the back of a room, driven by the arrow keys
 * so a teacher standing at the front is not hunting for a control.
 *
 * What is **not** here is the teacher's note. This component renders what the room sees, the
 * note is the teacher's own, and there is no second screen to put it on — so it is not on the
 * slide, not in `ShareOutSlide`, and not reachable from here at all.
 */
function Present({ slides, onClose }: { slides: readonly ShareOutSlide[]; onClose: () => void }) {
  const [at, setAt] = useState(0);
  const slide = slides[Math.min(at, slides.length - 1)]!;
  const heading = useRef<HTMLHeadingElement>(null);

  /* The projector had no heading and never took focus — entering it left `document.activeElement`
     on `<body>` and the view contained zero headings. The slide title is the heading of what is
     on the wall, so it is the `<h1>`, and it takes focus on arrival and on every slide. */
  useEffect(() => { heading.current?.focus(); }, [at]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") { onClose(); return; }
      /* Space is for a teacher standing at the front with nothing focused. When focus is on a
         control, the control's own activation is the press — handling it here as well made one
         press of Space on **Next →** move the counter from "1 of 5" to "3 of 5". */
      const onControl = event.target instanceof Element && event.target.closest("button, a, input, select, textarea") !== null;
      if (event.key === " " && onControl) return;
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        setAt((value) => Math.min(slides.length - 1, value + 1));
      }
      if (event.key === "ArrowLeft") setAt((value) => Math.max(0, value - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [slides.length, onClose]);

  return (
    <main className="present">
      <header className="present__bar">
        <span>{at + 1} of {slides.length}</span>
        <Button variant="quiet" onClick={onClose}>Done</Button>
      </header>
      {/* The live region is the slide and only the slide.
          It used to be the whole of `<main>` — 315 characters and three controls — so every
          arrow key re-read the counter and both button labels along with the work. What
          changes when a teacher presses an arrow is the slide, so that is what is announced. */}
      <section className="present__slide" aria-live="polite" aria-atomic="true">
        <h1 className="present__title" ref={heading} tabIndex={-1}>{slide.title}</h1>
        {slide.quote
          ? <blockquote className="present__quote">{slide.quote}</blockquote>
          : <p className="present__quote present__quote--none">This student did not write an explanation.</p>}
        <p className="present__summary">{slide.summary}</p>
      </section>
      <footer className="present__foot">
        <div className="present__moves">
          <Button variant="secondary" aria-disabled={at === 0} onClick={() => setAt(Math.max(0, at - 1))}>← Back</Button>
          <Button variant="primary" aria-disabled={at === slides.length - 1} onClick={() => setAt(Math.min(slides.length - 1, at + 1))}>Next →</Button>
        </div>
      </footer>
    </main>
  );
}
