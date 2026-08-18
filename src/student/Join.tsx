import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppMark } from "../components/primitives/AppMark";
import { Button } from "../components/primitives/Button";
import { CODE_LENGTH, isWellFormedClassCode, normaliseClassCode } from "../platform/classes/codes";
import { MAX_DISPLAY_NAME, type DeviceClass, type RosterChoice } from "../platform/identity/types";
import { claimSeat, readClassDoor, rememberStudent } from "./session";

/**
 * Fifteen seconds, three actions, and the same three every time.
 *
 * The code goes on the board, the cards go round the room, and a student types five
 * characters, taps their own name, and types four more. It is the same on the first day and
 * on the fortieth, on their own laptop and on whichever Chromebook they were handed — which
 * is the whole design goal, because the thing a twelve-year-old cannot do is remember a
 * different route than the one they did last time.
 *
 * Nothing here asks for a name, an email address, a birthday or a password. The names on the
 * second screen are ones a teacher typed about their own class; BOW does not know whether any
 * of them is real and has no way to find out.
 *
 * The device question is asked once, in one sentence, and defaults to **shared**. A cart
 * Chromebook is the normal case in the rooms this runs in, and a session measured in weeks on
 * one is how the next student ends up inside the last one's attempt.
 */

type Step = "code" | "who" | "key";

export function StudentJoin() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("code");
  const [classCode, setClassCode] = useState("");
  const [door, setDoor] = useState<{ roster: RosterChoice[]; joinMode: "roster" | "open"; label: string } | null>(null);
  const [seatCode, setSeatCode] = useState("");
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
    setStep("who");
  };

  const finish = async (over: { seatCode?: string; displayName?: string }) => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    const result = await claimSeat({
      classCode: normaliseClassCode(classCode),
      device,
      ...(over.seatCode !== undefined ? { seatCode: over.seatCode } : {}),
      ...(over.displayName !== undefined ? { displayName: over.displayName } : {}),
      ...(joinCode ? { joinCode } : {}),
    });
    setBusy(false);
    if (!result.ok) {
      setProblem(result.message);
      return;
    }
    rememberStudent(result.body.token);
    navigate("/home", { replace: true });
  };

  return (
    <main className="join-shell">
      <header className="join-shell__bar">
        <AppMark />
        {door && <span>{door.label}</span>}
      </header>

      {step === "code" && (
        <section className="join-step">
          <h1>What is your class code?</h1>
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
          <Button variant="primary" aria-disabled={!isWellFormedClassCode(classCode) || busy} onClick={() => void findClass()}>
            {busy ? "Looking…" : "Next"}
          </Button>
          <p className="join-step__note">No name, no email, nothing about your real money.</p>
        </section>
      )}

      {step === "who" && door?.joinMode === "roster" && (
        <section className="join-step">
          <h1>Which one is you?</h1>
          <p>{door.label}</p>
          <ul className="name-grid">
            {door.roster.map((entry) => (
              <li key={entry.seatCode}>
                <button
                  type="button"
                  className="name-grid__pick"
                  aria-pressed={seatCode === entry.seatCode}
                  onClick={() => { setSeatCode(entry.seatCode); setStep("key"); }}
                >
                  {entry.displayName}
                </button>
              </li>
            ))}
          </ul>
          {door.roster.length === 0 && <p>Your teacher has not added the class list yet. Ask them.</p>}
          <Button variant="quiet" onClick={() => setStep("code")}>Different class</Button>
        </section>
      )}

      {step === "who" && door?.joinMode === "open" && (
        <section className="join-step">
          <h1>What should your teacher see?</h1>
          {/* Their teacher's list, in their teacher's words, is the better route — this is the
              one for a teacher who had four minutes and no list. It still makes a real
              account and a real session, so no work in this product is ever unattributed. */}
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
        </section>
      )}

      {step === "key" && (
        <section className="join-step">
          <h1>Type the code on your card.</h1>
          <p>{door?.roster.find((entry) => entry.seatCode === seatCode)?.displayName}</p>
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
              onKeyDown={(event) => { if (event.key === "Enter") void finish({ seatCode }); }}
            />
          </label>
          <DeviceChoice device={device} onChange={setDevice} />
          <Button variant="primary" aria-disabled={joinCode.length < 4 || busy} onClick={() => void finish({ seatCode })}>
            {busy ? "Going in…" : "Go in"}
          </Button>
          <Button variant="quiet" onClick={() => setStep("who")}>Not me</Button>
          <p className="join-step__note">Lost your card? Ask your teacher — they can print a new one.</p>
        </section>
      )}

      <p className="join-error" role="alert">{problem}</p>
    </main>
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
