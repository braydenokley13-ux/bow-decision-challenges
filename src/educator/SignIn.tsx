import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "../components/primitives/Button";
import { EducatorShell } from "./EducatorShell";
import { CLASS_RETENTION_DAYS } from "../platform/classes/types";
import { rememberedClasses } from "./classMemory";
import { changePassword, claimRememberedClasses, createAccount, forgetTeacher, myTeaching, recoverTeacher, rememberTeacher, signInTeacher, signOutEverywhere, teacherToken, whoAmI } from "./teacherSession";

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

/**
 * The account, once there is one.
 *
 * Two controls a teacher did not have, both of them routes that shipped with nothing calling
 * them. **Changing a password** was impossible: the only route that would set one is
 * `/auth/teacher/recovery`, which needs the code shown once at sign-up, so a teacher who thought
 * somebody had seen their password and had not kept that code had no move at all. **Signing out**
 * was `removeItem` on one browser's storage — the token stayed valid for its full thirty days,
 * and a security review showed one captured token also hands back the long-lived key of every
 * class the account owns.
 *
 * They sit on one screen because they are the same decision at two strengths: *somebody may have
 * my password* and *somebody may have my session*. The page says which is which.
 */
function TeacherAccount({ onSignedOut }: { onSignedOut: (how: "everywhere" | "here") => void }) {
  const heading = useRef<HTMLHeadingElement>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [said, setSaid] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ending, setEnding] = useState(false);

  useEffect(() => { heading.current?.focus(); }, []);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const me = await whoAmI();
      if (!cancelled && me.ok && typeof me.body.email === "string") setEmail(me.body.email);
    })();
    return () => { cancelled = true; };
  }, []);

  const change = async () => {
    if (busy || current.length === 0 || next.length === 0) return;
    setBusy(true);
    setProblem(null);
    setSaid(null);
    const result = await changePassword(current, next);
    setBusy(false);
    if (!result.ok) { setProblem(result.message); return; }
    // The service hands back a fresh token at the new generation and `changePassword` stores it,
    // so the tab this was typed in keeps working while every other one stops.
    setCurrent("");
    setNext("");
    setSaid(result.body.message);
  };

  const endEverywhere = async () => {
    if (ending) return;
    setEnding(true);
    const result = await signOutEverywhere();
    forgetTeacher();
    onSignedOut(result.ok ? "everywhere" : "here");
  };

  return (
    <EducatorShell measure="read">
      <header className="page-header">
        <p className="eyebrow">For teachers</p>
        <h1 tabIndex={-1} ref={heading}>Your account.</h1>
        <p>
          {email
            ? <>Signed in as <b>{email}</b>. Your classes are on this account, so they are here on any computer you sign in on.</>
            : "Signed in. Your classes are on this account, so they are here on any computer you sign in on."}
        </p>
      </header>

      <section className="dashboard-section sign-in">
        <div className="section-heading">
          <p className="eyebrow">If somebody may have your password</p>
          <h2>Change your password</h2>
        </div>
        <p>
          You need the one you use now. Your recovery code is not involved and does not change —
          the one you wrote down at sign-up keeps working.
        </p>
        <label className="field" htmlFor="account-current">
          <span className="field-label">The password you use now</span>
          <input id="account-current" type="password" autoComplete="current-password" value={current} onChange={(event) => setCurrent(event.target.value)} />
        </label>
        <label className="field" htmlFor="account-next">
          <span className="field-label">A new password — ten characters or more</span>
          <input
            id="account-next"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") void change(); }}
          />
        </label>
        <Button variant="primary" aria-disabled={busy || current.length === 0 || next.length === 0} onClick={() => void change()}>
          {busy ? "One moment…" : "Change it"}
        </Button>
        {/* What it did, said by the service that did it. Changing a password ends every other
            session — which is the whole point when the reason for changing it is that somebody
            else has it — and a teacher who is not told that has to guess. */}
        <p className="class-state" role="status">{said ?? ""}</p>
      </section>

      <section className="dashboard-section sign-in">
        <div className="section-heading">
          <p className="eyebrow">If somebody may be signed in as you</p>
          <h2>Sign out everywhere</h2>
        </div>
        <p>
          This ends every session on this account, on every device, including this one. Nothing
          you or your students have done is affected, and signing in again brings your classes
          back. It is what to press if you left yourself signed in on a machine you cannot get to.
        </p>
        <Button variant="secondary" aria-disabled={ending} onClick={() => void endEverywhere()}>
          {ending ? "Signing out…" : "Sign out on every device"}
        </Button>
      </section>

      <p className="join-error" role="alert">{problem}</p>
    </EducatorShell>
  );
}

export function TeacherSignIn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // Whether a token exists is read once per mount rather than watched: signing out reloads the
  // page, and signing in navigates away, so there is no state in which this changes underneath.
  const [signedIn, setSignedIn] = useState(() => Boolean(teacherToken()));
  const ended = params.get("ended");
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
    void navigate("/educator/classes", { replace: true });
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
              <Button variant="primary" onClick={() => { void navigate("/educator/classes", { replace: true }); }}>I have written it down</Button>
            </div>
          </div>
        </section>
      </EducatorShell>
    );
  }

  if (signedIn) {
    return (
      <TeacherAccount
        onSignedOut={(how) => { setSignedIn(false); void navigate(`/educator/sign-in?ended=${how}`, { replace: true }); }}
      />
    );
  }

  return (
    <EducatorShell>
      <header className="page-header">
        <p className="eyebrow">For teachers</p>
        <h1 tabIndex={-1} ref={heading}>{MODES[mode].heading}</h1>
        {/* What the control that brought them here actually did. "Sign out" ends every session
            on the account; when the service could not be reached it ends this browser's copy and
            nothing else, and those are different facts to act on. */}
        {ended === "everywhere" && (
          <p className="class-state" role="status">
            Signed out. Every device signed in to this account has been signed out.
          </p>
        )}
        {ended === "here" && (
          <p className="class-state" role="status">
            Signed out on this computer. BOW could not be reached, so any other device signed in
            to this account is still signed in — sign in again from one of them and sign out there.
          </p>
        )}
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

        {/* Said where a teacher is deciding whether to type an address, not in a policy.

            It used to say BOW *"never sees a student's email address, name or birthday"*, which
            was false about the middle one on the screen where a teacher decides to trust it. BOW
            receives student names, stores them, indexes them by seat and hands them back:
            `GET /classes/:code/roster` answers a teacher with every `displayName` on the list,
            and the class with no list asks the student to type one. A district's data protection
            officer reads this sentence and then reads the API, and a sentence that does not
            survive that reading takes every other sentence in the product with it.

            So it says what is held rather than what is not. The reassurance the false version was
            reaching for is real and is still here — no child types an address, a password or a
            date of birth into this product, and a class is deleted rather than kept — and none of
            it needs the part that was untrue. */}
        <p className="sign-in__note">
          Your account is an email address and a password. There is no name field, and BOW asks
          you for nothing else.
        </p>
        <p className="sign-in__note">
          It does hold student names — the ones you paste on your class list, and the first name a
          student types for themselves in a class that has no list. They are stored with the
          class, encrypted; nothing opens them but your account or that class&rsquo;s private link,
          and a student who signs in sees only their own. A class and everything in it is deleted
          {" "}{CLASS_RETENTION_DAYS} days after you make it. No student is ever asked for an email
          address, a password or a birthday.
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
