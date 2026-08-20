import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppMark } from "../components/primitives/AppMark";
import { Button } from "../components/primitives/Button";
import { CODE_LENGTH, isWellFormedClassCode, normaliseClassCode } from "../platform/classes/codes";
import { MAX_DISPLAY_NAME, type ClassDoor, type DeviceClass } from "../platform/identity/types";
import { ReadingTools } from "./reading";
import { STUDENT_COPY } from "../content/studentCopy";
import { claimSeat, joinCodeHeld, readClassDoor, rememberJoinCode, rememberStudent, rememberStudentId, studentIdHeld } from "./session";
import { clearEveryAttempt } from "../domain/io/persistence";

/**
 * Fifteen seconds, and the same fifteen every time.
 *
 * The code goes on the board, the cards go round the room, and a student types five characters
 * and then four more. It is the same on the first day and on the fortieth, on their own laptop
 * and on whichever Chromebook they were handed — which is the whole design goal, because the
 * thing a twelve-year-old cannot do is remember a different route than the one they did last
 * time.
 *
 * There used to be a grid of names in the middle, and taking it out made this both safer and
 * shorter. Safer because the list came from an unauthenticated door: any five-character code —
 * and a class code is written on a whiteboard, read aloud, photographed and typed into group
 * chats — returned every child's name in the room. Shorter because a student had to tap their
 * name *and* type their card code, and the card code identifies the seat on its own. One less
 * step, one less thing published.
 *
 * Nothing here asks for an email address, a birthday or a password, and nothing on any later
 * screen does either. That is the whole of what this door takes: five characters off the board,
 * four off a card, and one answer about whose computer this is.
 *
 * It does take a name in one of the two modes, and the sentence a student reads has to survive
 * that. A class with a list hands out cards, and the name beside the work is the one their
 * teacher typed. A class without one asks the student for a first name here — BOW stores it,
 * files their work under it, and hands it back to their teacher, which is the point of asking.
 * What BOW does not do in either mode is know whether the name is real, or find out.
 *
 * The device question is asked once, in one sentence, and defaults to **shared**. A cart
 * Chromebook is the normal case in the rooms this runs in, and a session measured in weeks on
 * one is how the next student ends up inside the last one's attempt.
 *
 * An open class hands its own student a join code the first time they sign in — the same code
 * a roster class prints on a card — and it is shown exactly once, here, in the `"issued"` step
 * below. A roster class has a durable credential outside the browser: the printed card. An
 * open class does not, and a shared-device session lasts ten hours with no way to renew it, so
 * a student who was never shown that code and comes back tomorrow has no way in but retyping
 * their name — which mints a second seat, a second account, and leaves the first one's board
 * empty under it. `platform/identity/token.ts` also remembers the code for the account it
 * belongs to, so `findClass` below can recognise the *browser* on the next visit — but a
 * recognised browser is not a recognised child, and a cart is handed to a different one every
 * day, so it asks on the `"recognized"` step rather than filling the code in on its own. Only a
 * "yes" moves it where it is visible, and a different child on the same cart still meets a
 * blank name box after answering honestly, exactly as they did before this existed.
 */

type Step = "code" | "card" | "name" | "recognized" | "issued";

/** One id, because one step is on screen at a time and each step has one field. */
const PROBLEM_ID = "join-problem";
/** The standing fact about the class code, named so the field can point at it. */
const CODE_HINT_ID = "join-code-hint";

/**
 * What went wrong, under the box it went wrong in.
 *
 * `role="alert"` so it is spoken the moment it arrives, and 8px under the field so it is *seen*
 * — the two halves of the same requirement, which the old placement met one of.
 */
function Problem({ children }: { children: string }) {
  return <p className="field-problem" id={PROBLEM_ID} role="alert">{children}</p>;
}

export function StudentJoin() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("code");
  const [classCode, setClassCode] = useState("");
  const [door, setDoor] = useState<ClassDoor | null>(null);
  const [typedName, setTypedName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [device, setDevice] = useState<DeviceClass>("shared");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** Whether the "card" step's code was filled in because this browser recognised the class,
   * rather than typed or pasted by the student — see `findClass`. Changes the heading and
   * offers a way out for the child it is wrong about. */
  const [recognized, setRecognized] = useState(false);
  /**
   * A code this browser is holding for the class just entered, waiting on the "recognized"
   * step's honest yes/no before it is shown to anybody.
   *
   * `findClass` finding a match is a fact about the *browser* — it says nothing about who is
   * sitting at it right now, and a shared cart is handed to a different child every day. So a
   * match does not fill the code in on its own; it asks first, in the same register the device
   * question already asks "is this yours" — a plain question a child with no reason to lie
   * answers honestly. Only "Yes" moves it into `joinCode` where it becomes visible.
   */
  const [pendingRecognition, setPendingRecognition] = useState<{ joinCode: string } | null>(null);
  /** The code just minted for a brand-new open-class seat, on its way to the `"issued"` step.
   * Held here rather than read back off the response a second time, because the service will
   * not say it again — this is the one render that gets to. */
  const [issuedCode, setIssuedCode] = useState("");
  /**
   * The box the message is about, and where the message and the focus both go.
   *
   * *"That did not match. Check it and try again."* used to render at the foot of the page as a
   * sibling of the form: measured at 1366×768 with a correct class code and a wrong card code,
   * the field was at y=317 and the message at y=728 — **367px** below the box it is about, in
   * red, with `aria-describedby` and `aria-invalid` both `null` and focus left on *Go in*. A
   * screen reader announced it, because it is a live region. A child looking at their card and
   * at the box did not see it at all, and that is the single most likely failure in a room of
   * twenty-eight eleven-year-olds.
   *
   * So the message renders directly under the field, the field says it is invalid and names the
   * message that says why, and the field takes focus — which on a phone also brings the keyboard
   * back to the thing that has to be retyped. One ref for all three steps because each step is
   * one field: the step that is on screen owns it.
   */
  const field = useRef<HTMLInputElement>(null);
  useEffect(() => { if (problem) field.current?.focus(); }, [problem]);
  /** What the field advertises about itself while a message is standing against it. */
  const invalid = problem ? { "aria-invalid": true as const, "aria-describedby": PROBLEM_ID } : {};

  /**
   * How long the code is, said once — when the student has stopped, not while they are typing.
   *
   * The hint under the box is right and it stays. What was wrong was that it was a live region,
   * so it was *spoken on every keystroke*: typing `ABCD` into the first field in the product
   * produced four polite interruptions — *"That is 1 — a class code is 5."*, *"That is 2 …"*,
   * *"That is 3 …"*, *"That is 4 …"* — before a child had finished typing five characters. A
   * screen reader queues those, so the interruption outlasts the typing that caused it.
   *
   * So the visible line is now an ordinary description the field points at, read once when the
   * field is reached, and this region says the count only at the two moments a person has
   * actually asked: leaving the box, and pressing *Next* with a code that is not five long.
   * That second one was silent as well as still — the button is `aria-disabled` rather than
   * `disabled`, so it is reachable and pressable, and pressing it did nothing and said nothing.
   *
   * `count` keys the text, because a second refusal of the same code is the same sentence and
   * an unchanged region is not spoken.
   */
  const codeHint = classCode.length === 0
    ? `${CODE_LENGTH} letters and numbers.`
    : isWellFormedClassCode(classCode)
      ? " "
      : `That is ${classCode.length} — a class code is ${CODE_LENGTH}.`;
  const [counted, setCounted] = useState({ text: "", count: 0 });
  const sayHowLongTheCodeIs = () => {
    if (classCode.length === 0 || isWellFormedClassCode(classCode)) return;
    setCounted((last) => ({ text: codeHint, count: last.count + 1 }));
  };

  const findClass = async () => {
    if (busy) return;
    if (!isWellFormedClassCode(classCode)) { sayHowLongTheCodeIs(); return; }
    setBusy(true);
    setProblem(null);
    const normalised = normaliseClassCode(classCode);
    const result = await readClassDoor(normalised);
    setBusy(false);
    if (!result.ok) {
      setProblem(result.message);
      return;
    }
    setDoor(result.body);
    if (result.body.joinMode === "roster") { setRecognized(false); setPendingRecognition(null); setStep("card"); return; }
    // Open class: no list, so normally this is the name box. But if this exact browser is
    // already holding the code this exact account was issued — see `token.ts` — asking for the
    // name again would mint a second seat and orphan the first one's work under it. So this
    // checks first, rather than making them remember or retype it. `studentIdHeld()` is what
    // keeps the *check* safe on a shared cart: it is whichever account last signed in on this
    // browser, and it changes the moment a different child does — the same guarantee
    // `sharedDevice.test.tsx` holds for clearing a stranger's draft. It is not, on its own, a
    // guarantee about who is sitting at the keyboard *right now* — a cart is handed to a
    // different child every day without anybody signing in between — so a match asks on the
    // `"recognized"` step rather than filling the code in and offering `Go in` immediately.
    const remembered = joinCodeHeld(normalised);
    if (remembered) {
      const stillHere = remembered.studentId === studentIdHeld();
      setPendingRecognition(stillHere ? remembered : null);
      setRecognized(false);
      setStep(stillHere ? "recognized" : "name");
      return;
    }
    setRecognized(false);
    setPendingRecognition(null);
    setStep("name");
  };

  const finish = async (over: { joinCode?: string; displayName?: string }) => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    const normalised = normaliseClassCode(classCode);
    const result = await claimSeat({
      classCode: normalised,
      device,
      ...(over.joinCode ? { joinCode: over.joinCode } : {}),
      ...(over.displayName !== undefined ? { displayName: over.displayName } : {}),
    });
    setBusy(false);
    if (!result.ok) {
      setProblem(result.message);
      return;
    }
    // A different person has sat down. Everything the last one left on this machine goes.
    //
    // This was the failure the whole account system was built to stop, surviving in the one
    // place accounts do not reach. A student signing in with their own card on a shared
    // classroom computer was shown the previous student's turned-in plan and their private
    // written explanation — because the attempt lives in `localStorage` and nothing about
    // signing in had ever touched it. They then played a whole run inside somebody else's
    // session state and were refused at submission, so both children lost the lesson.
    //
    // The comparison is the account id rather than the token, because a token is opaque and a
    // fresh one is issued on every sign-in. Same person signing in again on their own machine
    // keeps their work; anybody else's presence clears the board.
    if (studentIdHeld() !== result.body.studentId) clearEveryAttempt();
    rememberStudent(result.body.token);
    rememberStudentId(result.body.studentId);
    if (result.body.joinCode) {
      // Handed back once, on the join that mints it (`server/identity.ts`) — an open class has
      // no card, so this is the only credential this account will ever have, and it was never
      // shown to the student before this line existed. Kept here as well as shown, so the same
      // browser can offer it straight back (`findClass`, above) instead of making them retype
      // it from paper the next time their session dies.
      rememberJoinCode(normalised, result.body.joinCode, result.body.studentId);
      setIssuedCode(result.body.joinCode);
      setStep("issued");
      return;
    }
    void navigate("/home", { replace: true });
  };

  return (
    <main className="join-shell">
      {/* The door's own bar, and the room it keeps for the reading control. A class code, a
          card code and a name are the three things on this screen a child can get wrong, and
          the help that reads them out loud used to sit in the bottom corner on top of whatever
          the step was asking for. */}
      <header className="join-shell__bar">
        <AppMark />
        {door && <span>{door.label}</span>}
        {/* The door is the first screen a student meets, and it was the one screen with no way to
            hear it. A child who needs the words read to them needs that before they are inside
            the run, not after — this is where they are asked for a class code, a card code, and
            in an open class their own name, and getting any of it wrong is what stops them
            starting. `step` keys the re-read, so moving from the code to the card re-reads the
            new step rather than the one they have left. In the bar, because the bottom corner it
            used to sit in is where each step puts its own button. */}
        <ReadingTools screenKey={`join-${step}`} />
      </header>

      {step === "code" && (
        <Step key="code" heading="What is your class code?">
          <p>Your teacher has it on the board.</p>
          <label className="field" htmlFor="class-code">
            <span className="field-label">Class code</span>
            <input
              id="class-code"
              className="join-code-input"
              value={classCode}
              maxLength={CODE_LENGTH + 2}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              ref={field}
              {...invalid}
              /* Both descriptions, in reading order: how long a code is, then what went wrong
                 with this one. After the spread, so it carries the problem rather than losing
                 it — the spread sets this attribute too. */
              aria-describedby={problem ? `${CODE_HINT_ID} ${PROBLEM_ID}` : CODE_HINT_ID}
              onChange={(event) => { setClassCode(event.target.value.toUpperCase()); setProblem(null); }}
              onBlur={sayHowLongTheCodeIs}
              onKeyDown={(event) => { if (event.key === "Enter") void findClass(); }}
            />
          </label>
          {problem && <Problem>{problem}</Problem>}
          {/* Said as a fact about the code rather than left for the student to discover by
              pressing a button that does nothing. A disabled control with no reason attached is
              a dead end to a twelve-year-old, and this screen is where they are least able to
              guess what is wrong. */}
          <p className="join-step__hint" id={CODE_HINT_ID}>{codeHint}</p>
          {/* Present from the first paint holding nothing: a live region inserted with its text
              already inside it is not announced. */}
          <p className="visually-hidden" aria-live="polite">
            <span key={counted.count}>{counted.text}</span>
          </p>
          <Button variant="primary" aria-disabled={!isWellFormedClassCode(classCode) || busy} onClick={() => void findClass()}>
            {busy ? "Looking…" : "Next"}
          </Button>
          <p className="join-step__note">{STUDENT_COPY.join.noCode}</p>
          <p className="join-step__note">BOW never asks for your email, your birthday, or anything about your real money.</p>
        </Step>
      )}

      {step === "recognized" && (
        <Step key="recognized" heading="Have you signed in here before?">
          {/* The one honest question standing between a browser that recognises the class and
              a code it will not otherwise show anybody. A cart Chromebook is handed to a
              different child every day with nobody signing out of it in between, so what this
              browser remembers is a fact about the *machine*, not about who is at the keyboard
              — the same reason `DeviceChoice` below asks "whose computer is this" instead of
              assuming. A child this is wrong about has no reason to say yes to it. */}
          <p>{door?.label}</p>
          <p>This computer was signed in to this class before. Was that you?</p>
          {problem && <Problem>{problem}</Problem>}
          <Button
            variant="primary"
            onClick={() => { setJoinCode(pendingRecognition?.joinCode ?? ""); setRecognized(true); setProblem(null); setStep("card"); }}
          >
            Yes — that was me
          </Button>
          <Button
            variant="quiet"
            onClick={() => { setPendingRecognition(null); setRecognized(false); setProblem(null); setStep("name"); }}
          >
            No — I am new here
          </Button>
        </Step>
      )}

      {step === "card" && (
        <Step
          key="card"
          heading={recognized ? "Is this still you?" : door?.joinMode === "open" ? "Type the code you were given." : "Type the code on your card."}
        >
          <p>{door?.label}</p>
          {/* This is the one difference between a code the student typed and a code the browser
              filled in after "recognized" said yes. Nothing about it is a login on its own:
              `Go in` still round-trips the service, which still checks it against the account
              it was issued to — this is only what tells the child looking at a filled-in box
              why it is already full. */}
          {recognized && (
            <p className="join-step__note">You said this was you, so the code you were given is already here.</p>
          )}
          <label className="field" htmlFor="join-code">
            <span className="field-label">Your code</span>
            <input
              id="join-code"
              className="join-code-input"
              value={joinCode}
              maxLength={8}
              autoCapitalize="characters"
              autoComplete="off"
              spellCheck={false}
              ref={field}
              {...invalid}
              onChange={(event) => { setJoinCode(event.target.value.toUpperCase()); setProblem(null); setRecognized(false); }}
              onKeyDown={(event) => { if (event.key === "Enter" && joinCode.length >= 4) void finish({ joinCode }); }}
            />
          </label>
          {problem && <Problem>{problem}</Problem>}
          <DeviceChoice device={device} onChange={setDevice} />
          <Button variant="primary" aria-disabled={joinCode.length < 4 || busy} onClick={() => void finish({ joinCode })}>
            {busy ? "Going in…" : "Go in"}
          </Button>
          {recognized ? (
            // Not "Different class" — the class code the student typed is still right, only the
            // account this browser guessed might not be. Sending them to "code" would make them
            // retype a code that was never wrong.
            <Button
              variant="quiet"
              onClick={() => { setRecognized(false); setPendingRecognition(null); setJoinCode(""); setProblem(null); setStep("name"); }}
            >
              Not you? Start fresh
            </Button>
          ) : (
            <Button variant="quiet" onClick={() => { setStep("code"); setJoinCode(""); setProblem(null); }}>Different class</Button>
          )}
          <p className="join-step__note">
            {door?.joinMode === "open"
              ? "Lost the code? Sign in on the device you used the first time — BOW may remember it there. Otherwise, ask your teacher."
              : "Lost your card? Ask your teacher — they can print you a new one."}
          </p>
        </Step>
      )}

      {step === "name" && (
        <Step key="name" heading="What should your teacher see?">
          {/* Their teacher's list, in their teacher's words, is the better route — this is the
              one for a teacher who had four minutes and no list. It still makes a real account
              and a real session, so no work in this product is ever unattributed. */}
          <p>Your first name is enough.</p>
          <label className="field" htmlFor="display-name">
            <span className="field-label">Name</span>
            <input
              id="display-name"
              value={typedName}
              maxLength={MAX_DISPLAY_NAME}
              ref={field}
              {...invalid}
              onChange={(event) => { setTypedName(event.target.value); setProblem(null); }}
              onKeyDown={(event) => { if (event.key === "Enter" && typedName.trim()) void finish({ displayName: typedName.trim() }); }}
            />
          </label>
          {problem && <Problem>{problem}</Problem>}
          <DeviceChoice device={device} onChange={setDevice} />
          <Button variant="primary" aria-disabled={typedName.trim().length === 0 || busy} onClick={() => void finish({ displayName: typedName.trim() })}>
            {busy ? "Going in…" : "Go in"}
          </Button>
          {/* Typing the name again would make a second student with the same name and none of
              the first one's work. The code they were given the first time is the way back. */}
          <Button variant="quiet" onClick={() => { setRecognized(false); setJoinCode(""); setStep("card"); setProblem(null); }}>
            I have been here before
          </Button>
        </Step>
      )}

      {step === "issued" && (
        <Step key="issued" heading="Write this code down.">
          {/* The bug this screen exists to close: the service handed this code back exactly
              once, `Join.tsx` threw it away, and a student whose shared-device session expired
              overnight had no way back in but retyping their name — a second seat, a second
              account, an empty board under it, while the very next screen this student would
              meet warned them "I have been here before" and pointed at a code nobody had shown
              them. See `RULING.md` §5 and `identity.ts`'s join route. */}
          <p>BOW will not show you this again. It is how you get back to <strong>this</strong> board — not a new one — if you are signed out.</p>
          <div className="class-created__code">
            <p className="field-label">Your code</p>
            <strong>{issuedCode}</strong>
            <p>Not case sensitive.</p>
          </div>
          <p className="join-step__note">
            This browser will offer it back to you next time. Writing it down also gets you in from a different one.
          </p>
          <Button variant="primary" onClick={() => void navigate("/home", { replace: true })}>I&rsquo;ve written it down</Button>
        </Step>
      )}
    </main>
  );
}

/**
 * One step of the door, with the heading taking focus as it arrives.
 *
 * Without this, pressing Enter on the class code left focus on `<body>`: a keyboard user had to
 * tab from the top of the document again at every step, and a screen-reader user was told
 * nothing had happened at all.
 */
function Step({ heading, children }: { heading: string; children: React.ReactNode }) {
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => { title.current?.focus(); }, []);
  return (
    <section className="join-step">
      <h1 tabIndex={-1} ref={title}>{heading}</h1>
      {children}
    </section>
  );
}

/**
 * One question, asked once.
 *
 * Worded as a fact about the machine rather than as a security setting, because the person
 * answering it is twelve and the honest version of the question is literally "is this yours".
 */
function DeviceChoice({ device, onChange }: { device: DeviceClass; onChange: (next: DeviceClass) => void }) {
  return (
    <fieldset className="device-choice">
      <legend>Whose computer is this?</legend>
      <label>
        <input type="radio" name="device" checked={device === "shared"} onChange={() => onChange("shared")} />
        <span>A school one lots of people use — sign me out at the end of the day</span>
      </label>
      <label>
        <input type="radio" name="device" checked={device === "own"} onChange={() => onChange("own")} />
        <span>Mine — keep me signed in</span>
      </label>
    </fieldset>
  );
}
