// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { isReadableToken, screenTextOf } from "../../domain/scenario/readability";
import { browserVoice, collectUnits, createReader, textOf, type Voice } from "./readAloud";

/**
 * What the voice says, and when it stops.
 *
 * The load-bearing claim in this file is the parity one: **the voice reads what the product's
 * own reading-load ruler counts.** `readingLoad.test.tsx` measures a run at 2,367 words by
 * walking the rendered screen with `screenTextOf`; if read-aloud walked it by different rules
 * then the thing being measured and the thing being read would be two different screens, and
 * the number in the receipt would stop describing the experience the accommodation delivers.
 * So the two walks are held to the same output here, rule by rule.
 *
 * The fixtures are written rather than rendered. Rendering the run would mean a second copy of
 * the four-hundred-line action script that drives `readingLoad.test.tsx`, in a directory a
 * different change is editing this week; what is under test is the walk, and the walk is
 * exercised by the shapes below — inline text inside a sentence, a closed disclosure, an
 * `aria-hidden` subtree, a table, a symbol on its own.
 */

function html(markup: string): HTMLElement {
  const root = document.createElement("div");
  root.innerHTML = markup;
  return root;
}

/**
 * The words in a run of text, with the punctuation attached to them taken off.
 *
 * The two walks agree on words and differ on where a full stop lands: the ruler sees `.` as
 * its own text node after an inline `<b>`, the voice pulls it back onto the figure so the
 * sentence ends where a person would end it. Comparing words is comparing the thing that
 * matters — that neither walk has a rule the other does not.
 */
const wordsOf = (text: string) =>
  text.split(/\s+/).filter(isReadableToken).map((token) => token.replace(/[,.;:!?]+$/, ""));

/** A voice that says nothing and waits to be told the sentence finished. */
function fakeVoice() {
  const said: string[] = [];
  let pending: (() => void) | null = null;
  const voice: Voice = {
    say(text, done) {
      said.push(text);
      pending = done;
    },
    stop() {
      pending = null;
    },
  };
  return {
    voice,
    said,
    /** The browser finishing the sentence it was given. */
    finish() {
      const done = pending;
      pending = null;
      done?.();
    },
    get speaking() {
      return pending !== null;
    },
  };
}

describe("what the voice is handed", () => {
  it("says a sentence that has an amount inside it as one sentence", () => {
    const root = html(`<p>Enough to pay the <strong>$1,200</strong> the course costs.</p>`);
    expect(collectUnits(root).map(textOf)).toEqual(["Enough to pay the $1,200 the course costs."]);
  });

  it("breaks at every block, so one line is one breath", () => {
    const root = html(`
      <h2>Something has to give.</h2>
      <p>Week 5 landed on the plan you built.</p>
      <button>Check this plan</button>
    `);
    expect(collectUnits(root).map(textOf)).toEqual([
      "Something has to give.",
      "Week 5 landed on the plan you built.",
      "Check this plan",
    ]);
  });

  it("reads the money rail row by row rather than as one run-on", () => {
    const root = html(`<dl><div><dt>Arrives no matter what</dt><dd>$5,000</dd></div><div><dt>Where Avery lives</dt><dd>−$300</dd></div></dl>`);
    expect(collectUnits(root).map(textOf)).toEqual([
      "Arrives no matter what",
      "$5,000",
      "Where Avery lives",
      "−$300",
    ]);
  });

  it("says nothing for a run of text with no word or figure in it", () => {
    const root = html(`<p><span>·</span></p><p>▾</p><p>Take this booth</p>`);
    expect(collectUnits(root).map(textOf)).toEqual(["Take this booth"]);
  });

  it("skips what the product has already declared is not for the reader", () => {
    const root = html(`<p aria-hidden="true">07</p><p>Avery Reyes</p>`);
    expect(collectUnits(root).map(textOf)).toEqual(["Avery Reyes"]);
  });

  it("skips a region the wiring has marked silent", () => {
    const root = html(`<div data-read-aloud="skip"><button>Read this screen</button></div><p>Give every dollar a job.</p>`);
    expect(collectUnits(root).map(textOf)).toEqual(["Give every dollar a job."]);
  });

  it("reads the summary of a closed disclosure and not what is behind it", () => {
    const root = html(`<details><summary>The four payments</summary><p>Where Avery's money comes from</p></details>`);
    expect(collectUnits(root).map(textOf)).toEqual(["The four payments"]);
  });

  it("reads a disclosure the student has opened", () => {
    const root = html(`<details open><summary>The four payments</summary><p>Where Avery's money comes from</p></details>`);
    expect(collectUnits(root).map(textOf)).toEqual(["The four payments", "Where Avery's money comes from"]);
  });
});

describe("the voice and the ruler read the same screen", () => {
  /**
   * One fixture holding every rule the two walks share. If a rule is ever added to one of them
   * alone this comparison is what says so — and it compares words rather than chunks on
   * purpose, because the ruler counts a run of text per text node and the voice joins the runs
   * inside one block into a sentence. Same words, said differently.
   */
  const SCREEN = `
    <header><p class="eyebrow">Week 5 · first response</p><h1>Something has to give.</h1></header>
    <dl><div><dt>Arrives no matter what</dt><dd>$5,000</dd></div></dl>
    <p>Every amount below is money you already promised somewhere else. The bar at the
       bottom says how much is missing.</p>
    <p aria-hidden="true">#07</p>
    <details><summary>The four payments</summary><p>Base pay arrives every week.</p></details>
    <table><tbody><tr><th>Week 1</th><td>$825</td></tr></tbody></table>
    <p><span>·</span></p>
    <p>Cut from your earlier plan <b>$2,000</b>.</p>
    <dl><div><dt>Perfect attendance bonus<small>$800</small></dt></div></dl>
    <button>Check this plan</button>
  `;

  it("hands the voice exactly the words the reading-load instrument counts", () => {
    const root = html(SCREEN);
    const spoken = wordsOf(collectUnits(root).map(textOf).join(" "));
    const counted = wordsOf(screenTextOf(root).chunks.join(" "));
    expect(spoken).toEqual(counted);
  });

  /**
   * The one place they part, written down rather than left to be found.
   *
   * The ruler holds a student's own sentences out of its word count, because ninety seconds
   * after typing a paragraph a student re-reading it is glancing, not reading. The voice reads
   * them: on the screen that shows a student what they turned in, their own words are the most
   * likely thing they want read back, and falling silent exactly there would be answering a
   * measurement problem with a product decision.
   */
  it("reads the student's own words back, which the ruler deliberately does not count", () => {
    const root = html(`<p>Your 2 numbers, and what you said about them:</p><blockquote data-own-words>I protected the course money first.</blockquote>`);
    expect(screenTextOf(root).chunks).toEqual(["Your 2 numbers, and what you said about them:"]);
    expect(screenTextOf(root).ownWordsChunks).toEqual(["I protected the course money first."]);
    expect(collectUnits(root).map(textOf)).toEqual([
      "Your 2 numbers, and what you said about them:",
      "I protected the course money first.",
    ]);
  });
});

/**
 * A browser that has `speechSynthesis` and nothing behind it.
 *
 * Utterances are objects the browser constructs, so the fake is the constructor and the queue
 * together. `error` decides what the machine does with a sentence it is handed: nothing said
 * and a failure reported, or the ordinary finish.
 */
function stubSpeech(error: string | null) {
  const said: string[] = [];
  class FakeUtterance {
    text: string;
    lang = "";
    onend: (() => void) | null = null;
    onerror: ((event: { error: string }) => void) | null = null;
    constructor(text: string) {
      this.text = text;
    }
  }
  const synthesis = {
    speak(utterance: FakeUtterance) {
      said.push(utterance.text);
      if (error) utterance.onerror?.({ error });
      else utterance.onend?.();
    },
    cancel() {},
    resume() {},
  };
  vi.stubGlobal("SpeechSynthesisUtterance", FakeUtterance);
  vi.stubGlobal("speechSynthesis", synthesis);
  return said;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("a machine with no voice", () => {
  /**
   * `speechSynthesis` is on every browser this product supports. **A voice is not.**
   *
   * A Chromebook whose text to speech has never been switched on, and desktop Linux with no
   * speech service running, both answer `speak` with `synthesis-failed` and say nothing.
   * Measured on this repository's own Chromium: `speechSynthesis` present, `getVoices()` empty,
   * `error: synthesis-failed` on the first utterance. Before the voice could report that, the
   * control sat on every screen, a student pressed it, and the screen did nothing at all and
   * gave no reason — which is the worst version of an accommodation, because the child is left
   * to conclude the fault is theirs.
   */
  it("reports that it cannot speak, and still lets go of the sentence", () => {
    stubSpeech("synthesis-failed");
    let missing = 0;
    let finished = 0;
    browserVoice(() => { missing += 1; }).say("One.", () => { finished += 1; });
    expect(missing).toBe(1);
    // The reader is waiting on this callback. A voice that reported the failure and then held
    // the callback would leave the control stuck saying "Stop reading" over silence.
    expect(finished).toBe(1);
  });

  /**
   * The distinction that has to hold: the reader cancels an utterance every time a student
   * presses stop or leaves a screen, and Chrome reports every one of those through the same
   * callback as a real failure.
   */
  it("does not call a sentence the student stopped a missing voice", () => {
    for (const stopped of ["canceled", "cancelled", "interrupted"]) {
      stubSpeech(stopped);
      let missing = 0;
      browserVoice(() => { missing += 1; }).say("One.", () => {});
      expect(missing, stopped).toBe(0);
    }
  });

  it("says the sentence it was given when the machine does have a voice", () => {
    const said = stubSpeech(null);
    let missing = 0;
    let finished = 0;
    browserVoice(() => { missing += 1; }).say("Something has to give.", () => { finished += 1; });
    expect(said).toEqual(["Something has to give."]);
    expect(missing).toBe(0);
    expect(finished).toBe(1);
  });
});

describe("the reader", () => {
  it("works down the screen a sentence at a time, and stops when it runs out", () => {
    const root = html(`<p>One.</p><p>Two.</p>`);
    document.body.append(root);
    const speech = fakeVoice();
    const reader = createReader({ voice: speech.voice });
    reader.start(root);
    expect(reader.state()).toBe("reading");
    expect(speech.said).toEqual(["One."]);
    speech.finish();
    expect(speech.said).toEqual(["One.", "Two."]);
    speech.finish();
    expect(reader.state()).toBe("idle");
    root.remove();
  });

  it("stops when the student presses stop, and says nothing more", () => {
    const root = html(`<p>One.</p><p>Two.</p>`);
    document.body.append(root);
    const speech = fakeVoice();
    const reader = createReader({ voice: speech.voice });
    reader.start(root);
    reader.stop();
    expect(reader.state()).toBe("idle");
    // Chrome fires `onerror` on whatever it cancelled. That callback must not restart a run
    // the student has already stopped.
    speech.finish();
    expect(speech.said).toEqual(["One."]);
    root.remove();
  });

  /**
   * A figure moving under the voice is not a screen changing. The money rail re-prints while a
   * student edits a row, and a reader that treated every re-print as a new screen would stop
   * on every keystroke — so the text is read live, at the moment the sentence is said, and the
   * new figure is the one spoken.
   */
  it("says the figure the screen holds now, not the one it held when the student pressed play", () => {
    const root = html(`<p>One.</p><p>Still to find <b>$2,000</b>.</p>`);
    document.body.append(root);
    const speech = fakeVoice();
    const reader = createReader({ voice: speech.voice });
    reader.start(root);
    const amount = root.querySelector("b");
    if (amount?.firstChild) amount.firstChild.nodeValue = "$1,200";
    speech.finish();
    expect(speech.said).toEqual(["One.", "Still to find $1,200."]);
    root.remove();
  });

  it("stops, and says so, when a question appears under the voice", () => {
    const root = html(`<p>One.</p><p>Two.</p>`);
    document.body.append(root);
    const speech = fakeVoice();
    const reader = createReader({ voice: speech.voice });
    reader.start(root);
    root.append(html(`<p>What made you leave the rest out?</p>`).firstElementChild!);
    speech.finish();
    expect(reader.state()).toBe("changed");
    expect(speech.said).toEqual(["One."]);
    root.remove();
  });

  it("stops when the line it was about to read has been taken off the screen", () => {
    const root = html(`<p>One.</p><p>Two.</p><p>Three.</p>`);
    document.body.append(root);
    const speech = fakeVoice();
    const reader = createReader({ voice: speech.voice });
    reader.start(root);
    root.querySelectorAll("p")[1]?.remove();
    root.append(html(`<p>Four.</p>`).firstElementChild!);
    speech.finish();
    expect(reader.state()).toBe("changed");
    root.remove();
  });

  it("has nothing to say about an empty region, and does not claim to be reading one", () => {
    const speech = fakeVoice();
    const reader = createReader({ voice: speech.voice });
    reader.start(html(`<p>·</p>`));
    expect(reader.state()).toBe("idle");
    expect(speech.said).toEqual([]);
  });

  it("tells a control every time it changes what it is doing", () => {
    const root = html(`<p>One.</p>`);
    document.body.append(root);
    const speech = fakeVoice();
    const reader = createReader({ voice: speech.voice });
    const seen: string[] = [];
    const stop = reader.subscribe((state) => seen.push(state));
    reader.start(root);
    speech.finish();
    stop();
    expect(seen).toEqual(["idle", "reading", "idle"]);
    root.remove();
  });
});
