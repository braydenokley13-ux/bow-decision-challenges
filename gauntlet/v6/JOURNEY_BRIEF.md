# The complete journey — student identity, home, resume, debrief

**Brief for the V6 gauntlet.**

The product is not a simulation with a login on the front. It is:

    teacher account -> class -> roster -> assignment -> student credential ->
    student sign-in -> student home -> assigned simulation -> saved progress ->
    interruption -> cross-device resume -> completed evidence -> teacher review ->
    judgement or override -> feedback -> student receives it -> debrief ->
    privacy, retention, revocation and deletion

A spectacular simulation inside a fake school workflow is not a product, and a credible school
platform wrapped around a forgettable student experience is not one either.

## Immutable — student identity and privacy

- No email addresses. No conventional passwords. No birthdays. No questions about a family's real
  finances.
- The credential is a **class code plus a personal card code**.
- A failed credential must not reveal or enumerate the roster.
- A credential resolves to exactly one student.
- Sessions must be safe on shared devices. Sign-out and handoff must actually clear access, back
  button included.
- **Reissuing a card invalidates the old one without destroying the student's work.**
- Revoked and deleted students, and deleted or expired classes, must behave truthfully.
- **Cross-device identity and progress continuity must be real** — server-held state, not a
  localStorage promise.
- Real classes never receive demo fixture data. Fictional data only, everywhere, always.

## What the student home has to do

`src/student/Home.tsx` today answers three questions honestly — what can I do, what was I doing,
what did my teacher say — and it is connected to the real identity, progress, evidence and
feedback architecture. That is the part that is right and must not be lost.

What it does not yet do:

- Say **who the student is inside BOW** with any presence. The display name is a `<span>` in the
  top bar next to a *"Not you?"* button.
- Give **class and teacher context** beyond a one-line eyebrow.
- Render **more than one assignment** as distinct work with its own status. `entry.assignments`
  is read only to decide which worlds to offer; the card is drawn from the challenge registry,
  which currently holds a single challenge.
- Show **progress** — how far into a run, what is left, what was completed when.
- Make **resume** feel like resuming rather than like starting.

Rebuild it so a Grade 6-8 student, with no teacher narration, can tell at a glance: who they are,
whose class this is, what they have been assigned, what state each assignment is in, which one to
open now, and whether their teacher has written back.

Do not add streaks, badges, points, feeds or notifications. Every feature must make a decision
better, make a student's thinking more visible, or make a teacher's job easier.

## Behaviours that must be proven, not assumed

Correct code + card. Malformed code. Wrong code. Valid class, invalid card. Expired class.
Deleted class. Deleted student. Revoked student. Reissued card. Old card after reissue. Multiple
assignments. No assignments. Completed assignment. In-progress assignment. Interrupted
simulation. Resume on the same device. Resume on a genuinely separate browser context. Sign-out.
Shared-device handoff to a second student. Stale session. Back-button access after sign-out.
Interrupted request. No roster enumeration. No demo contamination.

The point is to prove the identity model, not to maximise a test counter. Choose the cheapest
proof that would actually catch the failure.

## The identity-provider boundary

Create — or name, if it already exists — a clean seam where a district SSO would attach later.
**Do not fake SSO.** No Google, Microsoft, Clever, ClassLink, OIDC or SAML integration may be
implemented, mocked, or implied anywhere in the product or the documentation.

## Debrief and feedback

The student experience does not end when the simulation ends. The transition into results,
evidence, reflection, teacher feedback and next steps must be coherent.

- No composite grade. No letter grade. `B+` is not a BOW result.
- Profitability alone does not determine quality. An economically bad outcome must not read as
  poor reasoning.
- Teacher feedback reaches the correct student and the correct attempt. If feedback is edited or
  withdrawn, the student-facing state updates truthfully.
- If an override changes a displayed judgement, every dependent teacher and student view stays
  consistent.

## Accessibility

Keyboard-only across the whole journey. Visible focus, logical order, accessible names,
accessible and recoverable errors, reflow at 320px, 400% zoom, reduced motion, forced colors,
contrast at AA, state never carried by colour alone. A major accessibility failure anywhere in
the golden journey is a release blocker.

## Truthfulness

No claim of FERPA compliance, COPPA compliance, NYSED approval, WCAG certification, legal
approval, or completed teacher testing. Known limitations belong in the District 26 runbook, not
hidden from it.
