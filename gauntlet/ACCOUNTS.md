# The account system, end to end

**What this is.** Student accounts were named as core product rather than a login page, so this
is the whole lifecycle: what exists, what is held, who can reach it, what happens when things go
wrong, and what is deleted. Written against HEAD; anything not yet true is marked.

**The rule it is written under:** the product does not claim FERPA, COPPA, NY Education Law §2-d,
NYCPS or district compliance, and neither does this document. Where an obligation is named, it
says what the product does, not what it satisfies.

---

## What BOW knows about a child

`{ id, createdAt }`. That is the whole student account record.

No email address. No last name. No date of birth. No school. No device identifier. No
clickstream. The **display name** a teacher sees — "Ada L." — lives on the class roster, is typed
by the teacher, and BOW has no way to know whether it corresponds to a real person. The product
says so on the sign-in screen a teacher reads: *"BOW stores your email address and nothing else
about you. It never sees a student's email address, name or birthday — the names on your class
list are yours, typed by you."*

A student's **work** — their decision log and their written explanation — is filed against a
seat on a class, not against a person BOW can identify outside that class.

## The five things that exist

| | What it is | Who holds it | How long |
| --- | --- | --- | --- |
| **Teacher account** | email + scrypt password hash + scrypt recovery-code hash + session generation | the teacher | until deleted |
| **Class** | code, label, challenge, join mode, teacher key, owner | the teacher | 120 days, then deleted |
| **Roster entry** | seat number, teacher-typed display name, a keyed blind index of the card code, and the student id once claimed | the class | with the class |
| **Student account** | `{ id, createdAt }` and the seats it holds | the student's card | with its last class |
| **Session** | an HMAC-SHA256 token carrying a subject, a kind and a session generation | the browser | hours, and revocable |

## How a child gets in

Two screens. The class code from the board, then the code on the card their teacher printed.
Nothing else, ever: no email, no password, no name they type themselves.

The card decides whose seat it is and nothing else does. That sentence is a fix rather than a
design note — the join used to read the browser's ambient session, so two children signing in one
after the other on a shared Chromebook **became one account**, and a child's own device then
showed a named classmate's work and their teacher's feedback. Now the card resolves the seat
through a keyed blind index, so the service can find a card without holding anything that
identifies the child.

A class with no roster keeps an open door: a student types the class code and their own first
name. That is for a lesson set up in four minutes, and the class list screen says so and says why
you would paste a list before one you are marking.

## How a teacher gets in

An account, an email address, a password of ten characters or more, and a recovery code shown
**once**. Without an account, classes live in one browser and a reimaged laptop takes the term
with it — which is what happened, and what a teacher red team called their single largest reason
to refuse the product.

Signing in also **claims** whatever classes that browser is holding, so a teacher who made
classes before making an account does not lose them.

## What a session is worth, and what it cannot do

- The token is HMAC-SHA256 over a small claim set, signed with a secret **derived** from the
  operator's store key rather than stored anywhere. Not a JWT, and there is no algorithm field to
  confuse.
- It carries a **session generation**, so a teacher can end every session in their class in one
  press — the *end of the day* control on the class list — and every device is signed out at once.
- A student session can post work **only** for the seat it holds. A captured token cannot file a
  run under another child's seat: reproduced as a test, not asserted.
- Nothing in the token is a secret about the child. It is an opaque id and a generation.

## Where the browser keeps it, and why that is safe enough

`localStorage`, not a cookie, because this ships as a static bundle talking to an API that may not
be on the same registrable domain, and a cookie a district's browser policy drops silently is a
sign-in that fails for reasons nobody in the room can see. What makes it safe enough is the other
end: the generation counter, and a session measured in hours rather than weeks.

Beside the token sits **who this browser last held** — an opaque id, no PII. It answers one
question: is the person signing in now the same person whose unfinished run is on this machine?
A different answer clears the board before the new student sees a screen. That marker deliberately
**outlives the session**, because ending a session and handing the machine to somebody else are
different events, and treating them as one destroyed a child's work at the end of a school day.

## The shared cart, which is what this product actually runs on

- **A second student signs in** → the previous student's attempts are cleared before they see a
  screen. Tested three ways, including that the same child signing in again keeps their own work.
- **A second tab** → told, not overwritten: *"Two copies of the same run cannot both save… you can
  move the run into this tab instead."* The move works and locks the old tab.
- **A second device, same seat** → **NOT SOLVED.** They diverge permanently and neither screen
  mentions the other. Being fixed; until it is, this is stated as a gap rather than a feature.
- **End of the day** → one press signs every student in the class out, on every device, and
  nothing they did is lost. The second half of that sentence is true as of `b54148b` and was not
  before.

## When a child needs help

- **Lost card** → the teacher reprints one from the class list. A new card stops the old one
  working.
- **Left the class** → taking a student off the list keeps everything they turned in and stops
  them signing in.
- **A family asks** → **Erase** deletes the name and everything that student did, and nothing of
  anybody else's. It is a real delete: `eraseSeat` removes the row, the submissions, the
  checkpoints, the feedback and the orphaned account, on every store driver. The word is used
  because the thing is true.
- **Nobody remembers the teacher's password** → the recovery code, shown once at sign-up, which
  BOW cannot send and cannot look up. Using it spends it and rotates the session generation.

## What deletes itself

Classes and their evidence are kept for **120 days**, then deleted. That is executed rather than
asserted: an hourly sweep on a long-running server, an opportunistic sweep at most once an hour on
a serverless one, and `GET /api/health` reports when it last ran and how many classes it removed.
A security reviewer confirmed it deletes the class directory and its indexes rather than marking
them. It used to be a sentence with no code behind it.

## What an operator has to get right

- **`BOW_STORE_KEY`** — 32 random bytes. Every durable record is sealed with AES-256-GCM under it,
  and the session-signing secret is derived from it. Without it the service refuses to open a
  class, on every durable driver. A keyed store also **refuses an unsealed record**, so an attacker
  who can write one file cannot replace a teacher's record with a plaintext one of their choosing.
- **Losing or changing it** loses every class — loudly. Each durable store keeps one sealed record
  of its own and health answers `storeKey: mismatch` with a 503 and the sentence that says to put
  the original key back rather than restore a backup over data that is intact. There is **no
  re-encryption path**; that is a stated gap.
- **`BOW_TRUST_PROXY`** — how many proxies are actually in front of the process. The caller's
  address is taken that many places in from the right-hand end of `X-Forwarded-For`, because the
  left-hand end is whatever the caller typed.
- **TLS in front of it**, and the self-hosted server binds loopback until told otherwise.

## What is deliberately absent

No per-student time-on-task, no idle tracking, no keystroke history, no attention metrics, no
accommodation profile a teacher administers, no record of which supports a child used reaching a
teacher's screen as a label. The evidence log is a closed vocabulary of decisions, not a recording
of a child. **No student writing is sent to any model** — verified by a security reviewer as zero
outbound calls other than this deployment's own API.
