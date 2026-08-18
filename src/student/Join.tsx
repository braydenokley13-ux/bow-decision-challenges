import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppMark } from "../components/primitives/AppMark";
import { Button } from "../components/primitives/Button";
import { CODE_LENGTH, isWellFormedClassCode, normaliseClassCode } from "../platform/classes/codes";
import { MAX_DISPLAY_NAME, type ClassDoor, type DeviceClass } from "../platform/identity/types";
import { STUDENT_COPY } from "../content/studentCopy";
import { claimSeat, readClassDoor, rememberStudent, rememberStudentId, studentIdHeld } from "./session";
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
 * Nothing here asks for a name, an email address, a birthday or a password. The name that comes
 * back is one a teacher typed about their own class; BOW does not know whether it is real and
 * has no way to find out.
 *
 * The device question is asked once, in one sentence, and defaults to **shared**. A cart
 * Chromebook is the normal case in the rooms this runs in, and a session measured in weeks on
 * one is how the next student ends up inside the last one's attempt.
 */

type Step = "code" | "card" | "name";

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

  const findClass = async () => {
    if (!isWellFormedClassCode(classCode) || busy) return;
    setBusy(true);
    setProblem(null);
    const result = await readClassDoor(normaliseClassCode(classCode));
    setBusy(false);
    if (!result.ok) {
      setProblem(result.message);
      return;
    }
    setDoor(result.body);
    // A class with a list gets the card. A class without one gets the name box, and the card is
    // one press away for the student who has been here before.
    setStep(result.body.joinMode === "roster" ? "card" : "name");
  };

  const finish = async (over: { joinCode?: string; displayName?: string }) => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    const result = await claimSeat({
      classCode: normaliseClassCode(classCode),
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
    navigate("/home", { replace: true });
  };

  return (
    <main className="join-shell">
      <header className="join-shell__bar">
        <AppMark />
        {door && <span>{door.label}</span>}
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
              onChange={(event) => setClassCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => { if (event.key === "Enter") void findClass(); }}
            />
          </label>
          {/* Said as a fact about the code rather than left for the student to discover by
              pressing a button that does nothing. A disabled control with no reason attached is
              a dead end to a twelve-year-old, and this screen is where they are least able to
              guess what is wrong. */}
          <p className="join-step__hint" aria-live="polite">
            {classCode.length === 0
              ? `${CODE_LENGTH} letters and numbers.`
              : isWellFormedClassCode(classCode)
                ? " "
                : `That is ${classCode.length} — a class code is ${CODE_LENGTH}.`}
          </p>
          <Button variant="primary" aria-disabled={!isWellFormedClassCode(classCode) || busy} onClick={() => void findClass()}>
            {busy ? "Looking…" : "Next"}
          </Button>
          <p className="join-step__note">{STUDENT_COPY.join.noCode}</p>
          <p className="join-step__note">BOW never asks for your email, your birthday, or anything about your real money.</p>
        </Step>
      )}

      {step === "card" && (
        <Step key="card" heading="Type the code on your card.">
          <p>{door?.label}</p>
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
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              onKeyDown={(event) => { if (event.key === "Enter" && joinCode.length >= 4) void finish({ joinCode }); }}
            />
          </label>
          <DeviceChoice device={device} onChange={setDevice} />
          <Button variant="primary" aria-disabled={joinCode.length < 4 || busy} onClick={() => void finish({ joinCode })}>
            {busy ? "Going in…" : "Go in"}
          </Button>
          <Button variant="quiet" onClick={() => { setStep("code"); setJoinCode(""); setProblem(null); }}>Different class</Button>
          <p className="join-step__note">Lost your card? Ask your teacher — they can print you a new one.</p>
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
              onChange={(event) => setTypedName(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && typedName.trim()) void finish({ displayName: typedName.trim() }); }}
            />
          </label>
          <DeviceChoice device={device} onChange={setDevice} />
          <Button variant="primary" aria-disabled={typedName.trim().length === 0 || busy} onClick={() => void finish({ displayName: typedName.trim() })}>
            {busy ? "Going in…" : "Go in"}
          </Button>
          {/* Typing the name again would make a second student with the same name and none of
              the first one's work. The code they were given the first time is the way back. */}
          <Button variant="quiet" onClick={() => { setStep("card"); setProblem(null); }}>I have been here before</Button>
        </Step>
      )}

      <p className="join-error" role="alert">{problem}</p>
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
