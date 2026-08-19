import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  browserMarker, browserVoice, collectUnits, createReader, scrollUnitIntoView, speechAvailable, textOf,
  type Marker, type ReaderState, type Voice,
} from "./readAloud";
import { GlossaryPanel } from "./GlossaryPanel";
import { useReadingPreference } from "./preference";
import { useInPlaceArrival } from "../../components/primitives/useInPlaceArrival";
import "../../design/reading.css";

/**
 * The two things a student can do about the reading on this screen: hear it, or look a word up.
 *
 * It starts as one control in the page's own bar, because thirteen screens of run are already
 * carrying a money rail, a plan board and a decision, and an accommodation that takes a strip
 * of every screen from every student is an accommodation that gets removed. Pressing it opens
 * the tools, and **that stays open** — for this student, on this machine, across every screen
 * and every session after it. A child who needs the screen read does not press the same button
 * fourteen times a lesson.
 *
 * **The closed control is in a bar and not over one.** It was a fixed pill in the bottom-left
 * corner at `z-index: 40`, and the bottom-left corner is where both worlds put the sentence
 * that says what the screen is waiting for: measured across two complete runs at 1366×768,
 * 1024×600, 768×1024, 390×844 and 320×640, `document.elementFromPoint` at the first readable
 * pixel of a status line or at a corner of a primary button answered `BUTTON.reading-tools__pill`
 * at **150 points on 25 screens** — over *"$4,900 still has no job."*, over *"Say what the jar
 * pays for"*, over *"Check this plan"*. A tap there opened Reading help instead. Lifting the
 * pill was tried twice and measured worse both times, because there is no height in that corner
 * that is free on every screen at every scroll position.
 *
 * So the closed control stops floating. Every shell renders this component inside its own top
 * bar — the challenge bar, the market bar, the picker's bar, the class door's bar, the home bar
 * — and closed it is a control in that bar, in flow, laid out by the same grid as the wordmark
 * beside it. A layout that places a control cannot also draw over it.
 *
 * Opened, the tools still take the bottom edge and the stage still gives up exactly
 * `--bow-reading-tools` of itself, which is the half of this that was already right. The panel
 * is portalled to `<body>` to keep that true of the keyboard as well as of the pixels: rendered
 * where the pill sits, a toolbar drawn across the bottom of the window would be tabbed to
 * immediately after the wordmark and before the stage it is offering to read, which is the
 * mismatch between focus order and reading order that 2.4.3 is about. At the end of the document
 * it is reached where it is seen.
 *
 * Off by default, for everybody. Nothing here is granted by a teacher, nothing is reported to
 * one, and nothing about who used it goes anywhere near the evidence a student turns in.
 */
export function ReadingTools({ screenKey, region, voice, marker }: {
  /**
   * The screen. When it changes the voice stops, because the words it was saying have gone —
   * and if this student has asked for every screen to be read, the new one starts itself.
   */
  screenKey?: string | number;
  /**
   * What gets read. Defaults to the page's `<main>` landmark, which in both worlds is the
   * stage and none of the chrome above it.
   */
  region?: { current: HTMLElement | null };
  /** Seams for tests. The browser's own voice and highlight are used when they are absent. */
  voice?: Voice;
  marker?: Marker;
}) {
  const [preference, setPreference] = useReadingPreference();
  const [state, setState] = useState<ReaderState>("idle");
  const [showWords, setShowWords] = useState(false);
  const [screenText, setScreenText] = useState("");
  const [world, setWorld] = useState<string | null>(null);
  // A machine that has `speechSynthesis` and no voice behind it. Found by pressing the button:
  // the control was there, the screen did nothing, and nothing said why.
  const [voiceless, setVoiceless] = useState(false);
  /**
   * Opening the tools removes the pill, and closing them removes the panel — an in-place swap
   * with nothing else on the screen changing, which is the shape that was dropping focus onto
   * `<body>` everywhere else in this product. Measured here too: pressing *Reading help* left
   * `activeElement = BODY`, on the control a student presses precisely because they are having
   * trouble reading the screen. So each half takes focus when it arrives — and only when it
   * arrives, so a new screen opening with the tools already open (the preference is per device
   * and survives every screen) leaves focus on that screen's own heading.
   */
  const wordsButton = useRef<HTMLButtonElement>(null);
  const readButton = useRef<HTMLButtonElement>(null);
  const opener = useInPlaceArrival<HTMLButtonElement>(!preference.toolsOpen);
  const box = useRef<HTMLElement>(null);

  const canSpeak = (voice !== undefined || speechAvailable()) && !voiceless;
  // The other half of the same swap. Which control the panel opens on depends on whether this
  // machine has a voice at all: without one, *Read this screen* is not drawn and *Words* is
  // the first thing there is.
  useInPlaceArrival<HTMLButtonElement>(preference.toolsOpen, canSpeak ? readButton : wordsButton);
  const reader = useMemo(
    () => createReader({
      voice: voice ?? browserVoice(() => setVoiceless(true)),
      marker: marker ?? browserMarker(),
      scroll: scrollUnitIntoView,
    }),
    [voice, marker],
  );

  useEffect(() => reader.subscribe(setState), [reader]);
  useEffect(() => () => reader.stop(), [reader]);
  // The run down the screen is already under way when the first sentence fails, and every
  // sentence after it would fail in silence too.
  useEffect(() => {
    if (voiceless) reader.stop();
  }, [voiceless, reader]);

  /**
   * How much of the bottom of the screen the tools are standing on, published to the stylesheet.
   *
   * They sit over the run, and on a phone the run has a money rail stuck to the same edge. A
   * number in the stylesheet would be wrong twice over — the panel is a row taller on a screen
   * that changed under the voice, and shorter on a machine with no voice at all — so the panel
   * measures itself and `reading.css` reserves exactly that. Zero when it is closed, because the
   * closed control stands in the page's own bar rather than over the run.
   */
  useLayoutEffect(() => {
    const root = document.documentElement;
    const panel = preference.toolsOpen ? box.current?.getBoundingClientRect().height ?? 0 : 0;
    root.style.setProperty("--bow-reading-tools", `${Math.round(panel)}px`);
    return () => { root.style.removeProperty("--bow-reading-tools"); };
  });

  // A new screen: stop, then start again if that is what this student asked for. The delay is
  // the run's own stage entrance — reading over a heading that is still animating in puts the
  // voice ahead of the screen, which is the one thing a student following along cannot recover
  // from.
  useEffect(() => {
    reader.stop();
    if (!preference.readEveryScreen || !canSpeak) return;
    const timer = window.setTimeout(() => reader.start(regionOf(region)), 450);
    return () => window.clearTimeout(timer);
  }, [screenKey, preference.readEveryScreen, canSpeak, reader, region]);

  const toggleReading = () => {
    if (state === "reading") reader.stop();
    else reader.start(regionOf(region));
  };

  const openWords = () => {
    const stage = regionOf(region);
    setScreenText(collectUnits(stage).map(textOf).join(" "));
    setWorld(stage?.closest("[data-world]")?.getAttribute("data-world") ?? null);
    setShowWords(true);
  };

  // A landmark, because everything on a page belongs in one and this is the only thing on
  // these screens that sits outside the stage. `data-read-aloud="skip"` keeps the voice from
  // reading its own controls back, wherever a shell chooses to render it — which now includes
  // the two shells whose bar is inside their own `<main>`.
  const tools = (
    <aside ref={box} className="reading-tools" aria-label="Reading help" data-read-aloud="skip" data-open={preference.toolsOpen ? "true" : "false"}>
      {preference.toolsOpen ? (
        <div className="reading-tools__panel">
          <div className="reading-tools__row">
            {canSpeak && (
              <button type="button" className="reading-tools__button" ref={readButton} data-reading={state === "reading"} onClick={toggleReading}>
                <SpeakerIcon />
                {state === "reading" ? "Stop reading" : "Read this screen"}
              </button>
            )}
            <button type="button" className="reading-tools__button" ref={wordsButton} onClick={openWords}>
              <BookIcon />
              Words
            </button>
          </div>
          <div className="reading-tools__foot">
            {canSpeak && (
              <label className="reading-tools__every">
                <input
                  type="checkbox"
                  checked={preference.readEveryScreen}
                  onChange={(event) => setPreference({ readEveryScreen: event.target.checked })}
                />
                Read every screen to me
              </label>
            )}
            <button
              type="button"
              className="reading-tools__hide"
              onClick={() => { reader.stop(); setShowWords(false); setPreference({ toolsOpen: false }); }}
            >
              Hide
            </button>
          </div>
          {state === "changed" && (
            <p className="reading-tools__note" role="status">The screen changed, so the voice stopped. Press read to hear it as it is now.</p>
          )}
          {voiceless && (
            <p className="reading-tools__note" role="status">This computer has no voice, so it cannot read out loud. Words still works.</p>
          )}
        </div>
      ) : (
        <button
          type="button"
          className="reading-tools__pill"
          ref={opener}
          onClick={() => setPreference({ toolsOpen: true })}
        >
          <SpeakerIcon />
          Reading help
        </button>
      )}
      {showWords && (
        <GlossaryPanel
          screenText={screenText}
          world={world}
          canRead={canSpeak}
          onRead={(element) => reader.start(element)}
          onClose={() => { reader.stop(); setShowWords(false); }}
          returnFocusTo={wordsButton}
        />
      )}
    </aside>
  );

  /*
   * Closed, it stays in the bar it was rendered into. Opened, it leaves for the end of the
   * document, where the bottom of the window is also the end of the reading order.
   *
   * `document.body` rather than a node this component has to find: there is nothing to look up,
   * nothing to hold in state and nothing to be stale, which is the whole of why the panel moves
   * at render time rather than in an effect.
   */
  return preference.toolsOpen ? createPortal(tools, document.body) : tools;
}

/**
 * What gets read: whatever the wiring named, or the page's own `<main>` landmark.
 *
 * The landmark default is what makes the wiring a single line in each shell. It is also the
 * honest answer to "which part of the screen is the scenario": the one the document itself
 * declares is the main content, rather than a class name this file would have to know.
 */
function regionOf(region: { current: HTMLElement | null } | undefined): HTMLElement | null {
  if (region) return region.current;
  return typeof document === "undefined" ? null : document.querySelector("main");
}

function SpeakerIcon() {
  return (
    <svg className="reading-tools__icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M4 8h3l4-3.5v11L7 12H4z" fill="currentColor" />
      <path d="M13.5 7.2a4 4 0 0 1 0 5.6M15.8 5a7 7 0 0 1 0 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function BookIcon() {
  return (
    <svg className="reading-tools__icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <path d="M3 4.5h5a2 2 0 0 1 2 2v9a2 2 0 0 0-2-2H3zM17 4.5h-5a2 2 0 0 0-2 2v9a2 2 0 0 1 2-2h5z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
