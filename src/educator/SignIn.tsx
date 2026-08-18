import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../components/primitives/Button";
import { EducatorShell } from "./EducatorShell";
import { rememberedClasses } from "./classMemory";
import { claimRememberedClasses, createAccount, myTeaching, recoverTeacher, rememberTeacher, signInTeacher } from "./teacherSession";

/**
 * The door a teacher did not have.
 *
 * A class was a code and a key in one browser's `localStorage`, plus a private link the product
 * itself says is shown once. A teacher-experience critic said what that means without
 * decoration: a reimaged laptop permanently destroys twenty-eight children's assessed work.
 * The endpoints behind this screen had all been answering correctly for hours; nothing in the
 * product called any of them.
 *
 * It is deliberately not "and now everything needs an account". A class still opens with its
 * key alone, every class that already exists keeps working, and a teacher who never comes here
 * loses nothing they had. What signing in buys is the one thing a browser cannot give them:
 * their classes back, on a different machine.
 *
 * Signing in also claims every class this browser remembers, which is what makes it worth
 * doing on the laptop they already work on rather than only on the new one. A class somebody
 * else owns is left alone — two teachers on one staffroom machine is the normal case.
 */

type Mode = "in" | "new" | "lost";

const MODES: Record<Mode, { heading: string; action: string }> = {
  in: { heading: "Sign in", action: "Sign in" },
  new: { heading: "Make an account", action: "Make the account" },
  lost: { heading: "Use your recovery code", action: "Set a new password" },
};

export function TeacherSignIn() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [recoveryCode, setRecoveryCode] = useState("");
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Shown once, on the screen that made it, and never stored anywhere. Same rule as a join
  // card: the service hashes it as it makes it and cannot produce it again.
  const [issued, setIssued] = useState<{ recoveryCode: string; claimed: number } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, [mode]);

  const remembered = rememberedClasses().length;

  const finish = async (token: string, recovery?: string) => {
    rememberTeacher(token);
    const owned = await myTeaching();
    const claimed = await claimRememberedClasses(owned.ok ? owned.body.classes.map((entry) => entry.code) : []);
    if (recovery) {
      setIssued({ recoveryCode: recovery, claimed });
      return;
    }
    navigate("/educator/classes", { replace: true });
  };

  const submit = async () => {
    if (busy) return;
    setBusy(true);
    setProblem(null);
    const result = mode === "in"
      ? await signInTeacher(email.trim(), password)
      : mode === "new"
        ? await createAccount(email.trim(), password)
        : await recoverTeacher(email.trim(), recoveryCode.trim(), password);
    if (!result.ok) {
      setProblem(result.message);
      setBusy(false);
      return;
    }
    // A new account and a spent recovery code both hand back a fresh one, and it is the only
    // time it exists anywhere a person can read it.
    const fresh = (result.body as Partial<{ recoveryCode: string }>).recoveryCode;
    await finish(result.body.token, fresh);
    setBusy(false);
  };

  if (issued) {
    return (
      <EducatorShell>
        <header className="page-header">
          <p className="eyebrow">Keep this</p>
          <h1 tabIndex={-1} ref={heading}>Your recovery code. It is not shown again.</h1>
          <p>
            It is the only way back into this account without your password. Write it down or put
            it wherever you keep passwords — BOW cannot send it to you and cannot look it up.
          </p>
        </header>
        <section className="cards-sheet">
          <div className="cards-sheet__head">
            <div>
              <p className="eyebrow">Recovery code</p>
              <h2 className="recovery-code">{issued.recoveryCode}</h2>
              {issued.claimed > 0 && (
                <p>
                  {issued.claimed === 1 ? "One class" : `${issued.claimed} classes`} saved in this browser
                  {issued.claimed === 1 ? " is" : " are"} now on your account. They will be here on any
                  computer you sign in on.
                </p>
              )}
            </div>
            <div className="cards-sheet__acts">
              <Button variant="primary" onClick={() => navigate("/educator/classes", { replace: true })}>I have written it down</Button>
            </div>
          </div>
        </section>
      </EducatorShell>
    );
  }

  return (
    <EducatorShell>
      <header className="page-header">
        <p className="eyebrow">For teachers</p>
        <h1 tabIndex={-1} ref={heading}>{MODES[mode].heading}</h1>
        <p>
          An account is how your classes come back on another computer. Without one they live in
          this browser only, and a wiped laptop takes them with it.
        </p>
      </header>

      <section className="dashboard-section sign-in">
        <label className="field" htmlFor="teacher-email">
          <span className="field-label">Your work email</span>
          <input
            id="teacher-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>

        {mode === "lost" && (
          <label className="field" htmlFor="recovery-code">
            <span className="field-label">Recovery code</span>
            <input id="recovery-code" value={recoveryCode} autoComplete="off" onChange={(event) => setRecoveryCode(event.target.value)} />
          </label>
        )}

        <label className="field" htmlFor="teacher-password">
          <span className="field-label">{mode === "in" ? "Password" : "A new password — ten characters or more"}</span>
          <input
            id="teacher-password"
            type="password"
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void submit(); }}
          />
        </label>

        <Button variant="primary" aria-disabled={busy || !email.trim() || password.length < 1} onClick={() => void submit()}>
          {busy ? "One moment…" : MODES[mode].action}
        </Button>

        {/* Said where a teacher is deciding whether to type an address, not in a policy. */}
        <p className="sign-in__note">
          BOW stores your email address and nothing else about you. It never sees a student&rsquo;s
          email address, name or birthday — the names on your class list are yours, typed by you,
          and BOW has no way to know whether any of them is real.
        </p>
        {mode !== "in" && remembered > 0 && (
          <p className="sign-in__note">
            The {remembered === 1 ? "class" : `${remembered} classes`} saved in this browser will be
            added to your account when you sign in.
          </p>
        )}

        <div className="sign-in__switch">
          {mode !== "in" && <Button variant="quiet" onClick={() => setMode("in")}>I already have an account</Button>}
          {mode !== "new" && <Button variant="quiet" onClick={() => setMode("new")}>Make an account</Button>}
          {mode !== "lost" && <Button variant="quiet" onClick={() => setMode("lost")}>I have my recovery code</Button>}
        </div>
      </section>

      <p className="join-error" role="alert">{problem}</p>
    </EducatorShell>
  );
}
