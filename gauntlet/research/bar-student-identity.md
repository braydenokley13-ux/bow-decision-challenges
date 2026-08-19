# The Bar: Student and Teacher Identity for BOW Decision Challenges

**Phase 1 — external, inspectable quality bar + recommended identity architecture**
Researched 2026-08-18 against live product documentation and primary legal sources. Every
product and legal claim below carries a URL. Where a source could not be verified from an
authoritative page, it is marked **[UNVERIFIED]**.

**Scope note on compliance language:** nothing here asserts that BOW is or would be COPPA-,
FERPA-, or Ed Law §2-d-compliant. Compliance is a property of a signed contract, a published
policy, an implemented security program and an audited system — not of an architecture
document. What follows describes what those regimes *require* and which design choices make
them reachable.

---

## Part 0 — What BOW has today, stated precisely

From `src/platform/classes/codes.ts`, `src/platform/classes/types.ts`, `server/handler.ts`,
`ARCHITECTURE.md`:

- Class = a 5-character code over a 25-glyph confusable-free alphabet (`ACDEFGHJKMNPQRTUVWXY34679`)
  with input folding (`0/O→Q`, `1/I/L→J`, `5/S→F`, `8/B→H`, `2/Z→V`). **This part is
  genuinely good and should be preserved verbatim.**
- Student = a seat number 1–99 that the student picks. No roster, no claim, no secret.
- Teacher = a 24-character `teacherKey`, returned once, held in one browser's localStorage,
  unrecoverable.
- In-progress attempt = `localStorage` only. No cross-device resume. Teacher cannot see
  anyone who has not submitted.
- Retention = `CLASS_RETENTION_DAYS = 120`, then `410 class_expired`.
- Idempotency on `(classCode, seatCode, sessionId)`.

Two defects found while reading, independent of the identity design:

1. **`generateTeacherKey` runs on `Math.random` in production.** `server/handler.ts:164`
   is `const random = options.random ?? Math.random;` and neither production entrypoint
   (`api/[[...route]].ts`, `server/index.ts`) passes `random`. The teacher key is the sole
   bearer credential guarding an entire class's student evidence, and V8's `Math.random`
   (xorshift128+) is seeded from a 128-bit state that is recoverable from observed outputs.
   An attacker who legitimately creates classes observes outputs from the same generator.
2. **Class codes are allocated from the same non-cryptographic source**, so class-code
   enumeration is cheaper than the 25^5 keyspace suggests.

Both are one-line fixes (`crypto.randomBytes`) and both belong in the same change as anything
below.

---

## Part 1 — How real products actually do K-8 sign-in

### 1.1 The market has exactly two modes, and strong products ship both

**Mode A — ephemeral session join.** A short numeric PIN plus a self-chosen nickname. No
account, no roster, no resume, no recovery, and the product is honest that there is nothing
to recover.

| Product | Day 1 | Second device / next week | Recovery |
|---|---|---|---|
| Kahoot | Game PIN + nickname; "Accounts are only required if the host enables the player identifier." | Session does not persist: "You must pick a new nickname, and your score resets." | None — nothing exists to recover |
| Blooket | 7-digit Game ID / QR / link + nickname; "Only the teacher needs an account." | No account → no stats, no Blooks, no solo play | None |
| Quizizz (now Wayground) | 6-digit code + display name at `quizizz.com/join` | Account required "to track progress or access assigned homework" between sessions | Account-based |
| Nearpod | Join code; codes default to **14 days**, extendable to 365 | "Saved student progress requires rostered student accounts. Anonymous students joining with a code should not be expected to resume exactly where they stopped." | None |
| Pear Deck | Session code at `joinpd.com`; **join codes expire in a week, the join link never expires**; teacher can require a Google/Microsoft account | Anonymous or SSO | None |

Sources: [Kahoot join](https://support.kahoot.com/hc/en-us/articles/360039890713-Kahoot-join-How-to-join-a-Kahoot-game),
[Blooket accounts](https://help.blooket.com/hc/en-us/articles/17350775717911-Do-students-need-a-Blooket-account-to-play),
[Wayground join](https://wayground.com/join),
[Nearpod live→student-paced](https://nearpod.zendesk.com/hc/en-us/articles/4404207058836-Use-Live-to-Student-Paced-mode),
[Pear Deck getting started FAQ](https://www.peardeck.com/blog/faqs-about-pear-deck-getting-started).

**Mode B — persistent rostered identity.** Resume, teacher sees *not-started*, multi-class,
year-over-year.

| Product | Day 1 | Second device / next week | Recovery |
|---|---|---|---|
| Google Classroom | 6–8 alphanumeric class code, **entered once**: "After you join, you don't need to enter the code again." Requires a Google account. | Account carries. Teacher can reset (old codes die), disable, or re-enable codes. Students can self-unenrol, which removes their grades from the class. | District Google account recovery |
| Seesaw — Class Code (1:1) | Text code or QR → **pick your name from a list** → confirm | Stays signed in on that device **up to one year** | Teacher re-issues |
| Seesaw — Class Code (shared device) | Same, but student picks their name **before responding and after submitting**; **drafts cannot be saved** | Explicitly designed for pass-the-device | n/a |
| Seesaw — Home Learning Code | Per-student QR or 16-letter text code, **valid one year**, up to 50 valid codes per student; student sees only their own work | Signs in from home; no class-code sharing | Teacher regenerates |
| Seesaw — Email/SSO | School email + password | Recommended only "if students can remember their email address and password" (Grade 4+) | District IdP |
| Khan Academy | 8-character class code at `khanacademy.org/join`; then DOB + Google / school email / **username, no email required**; teacher can create accounts under Manage Students | Account carries | Teacher-managed |
| Prodigy | Username + password, or SSO (Apple/Google/Clever/ClassLink); class code links a student to a class. **"Classrooms created with Clever will not use a class code"** — rostering changes must be made in Clever first | Account carries | Teacher reset |
| Quill | Class code to join. For manually-rostered classes Quill **generates usernames and passwords**, downloadable as a PDF; default password is "their last names with the first letter capitalized". Teacher resets from the roster ellipsis. For Google/Clever/ClassLink/Canvas classes, teachers **cannot** see logins "for security reasons." | Account carries | Teacher reset from roster |
| CommonLit | Class code at `commonlit.org/enroll` → first + last name, grade, password. **"Students do not need to enter an email address to sign up."** | One account, many classes: "Add A New Class by Code"; "enrolled in multiple classes at a time without having to create more than one account" | Weak — email `help@commonlit.org` |
| Newsela | Seven routes: class code/link, Google, Clever, Canvas, Schoology, Microsoft, ClassLink (ClassLink = "no action needed, you have already been added") | SSO or account | SSO |
| Canvas / Schoology | No self-signup. LTI launch from inside the course. | LMS session | District IdP |

Sources: [Google Classroom join](https://support.google.com/edu/classroom/answer/15605102),
[Google Classroom invite/manage codes](https://support.google.com/edu/classroom/answer/6020282),
[Seesaw sign-in modes](https://help.seesaw.me/hc/en-us/articles/203495019-Student-sign-in-modes),
[Seesaw Home Learning Codes](https://help.seesaw.me/hc/en-us/articles/360045960531-Home-Learning-Codes),
[Khan Academy getting started](https://support.khanacademy.org/hc/en-us/articles/202487470-How-do-I-get-started-using-Khan-Academy-as-a-teacher),
[Khan class-code handout](https://cdn.kastatic.org/downloads/KhanAcademyClassCodes.pdf),
[Prodigy student login](https://prodigygame.zendesk.com/hc/en-us/articles/201586853-How-do-my-students-log-in-to-Prodigy),
[Quill student login info](https://support.quill.org/en/articles/1258626-how-do-i-access-student-login-information),
[Quill class codes](https://support.quill.org/en/articles/1303175-what-is-a-class-code-and-where-can-i-find-it),
[CommonLit account info](https://support.commonlit.org/article/466-what-information-does-a-student-need-to-create-an-account),
[CommonLit multi-class](https://support.commonlit.org/article/479-how-can-a-student-with-an-existing-account-add-another-class-code-to-join-my-class),
[Newsela ways to join](https://help.newsela.com/en/articles/13656073-students-ways-to-join-a-teacher-s-class).

**Gimkit is the clearest statement of the boundary between the two modes and is the single
most instructive product for BOW.** A code-only live game saves nothing. A student who joins
a *Class* by link and has an account gets assignments that "save automatically… assignment
progress saved every minute, allowing students who close an assignment or leave and come back
to resume from where they were," and the teacher's results view shows "all students, those
who have completed the Assignment, who is working on it still, and **who has not started it**."
([Gimkit Classes explained](https://help.gimkit.com/en/article/classes-explained-1er5lcw/),
[Assignment progress](https://help.gimkit.com/en/article/assignment-progress-4lt6kn/))

**Where BOW sits today: the worst of both.** It has Mode A's join (code + self-picked seat,
no roster, no secret) with Mode B's expectations (120-day server-side evidence store, teacher
inspects individual work, competency claims reported against NYSED objectives). It is less
honest than Mode A, because Mode A products tell you nothing persists, and BOW's teacher-facing
reporting implies otherwise. And it is missing exactly the two capabilities Gimkit names as
the payoff of Mode B: cross-device resume, and *who has not started*.

### 1.2 The credential patterns that actually work for children with no email

**Clever Badges — QR held to a webcam.** "The student simply holds a badge printed with a QR
code up to a webcam and is logged in automatically, no typing necessary." Clever's own
age-band guidance:

- **Ages 5–8:** scannable badges / QR codes.
- **Ages 8–11:** "passwords based on short words randomly generated from a school-safe
  dictionary" — memorable passphrases.
- **Ages 12–18:** "password requirements can start to become more complex, incorporating
  numbers, symbols, and multiple words to create passphrases."

MFA for young learners is deliberately phone-free: "administrators can use traditional access
tokens or they can choose between phone-free options such as **login pictures or six-digit
PINs**." Badges are "voided each year to reduce cybersecurity risks," and admins are told to
"void and print Badges annually during natural transitions like summer." Badges are **tied to
the student**, so "changes in school, teacher, or section will not affect the Badge." Security
posture is explicit: "Badges provide direct access to a student's Clever account and should be
protected just like a password."

Sources: [Clever Badges product page](https://www.clever.com/products/badges),
[Clever age-appropriate login guide](https://www.clever.com/blog/2025/12/school-password-secure-login-guide),
[Boston Public Schools Clever Badges](https://bostonpublicschools.helpdocs.io/article/agfx32c3y9-how-do-i-access-and-use-clever-badges),
[Central Point SD6 Clever Badges](https://support.district6.org/en/knowledgebase/article/clever-student-badges).

**ClassLink QuickCards** — the same primitive: "an encrypted code which takes the place of a
username and password," waved at any device camera.
([ClassLink login options](https://www.classlink.com/products/login-options),
[Philomath SD QuickCard guide](https://helpdesk.philomath.k12.or.us/help/en-us/27-classlink/56-how-do-students-log-in-with-their-classlink-quickcards-qr-codes))

**Seesaw Home Learning Codes** — per-student, teacher-issued, revocable, one-year, no PII, and
crucially **scoped narrower than the class code**: "the only difference is that students will
only be able to see work that they are tagged in and will be unable to see each other's work."
Seesaw is explicit that the *class* code is a classroom-only artifact: "To protect student
privacy, the Class Code should not be sent home."

**This is the answer to the brief's question 4.** For a 12-year-old who has forgotten
everything, on a shared device, with no email: **the teacher is the recovery mechanism.** Every
strong product converges on the same three-step loop — teacher opens roster, revokes the old
credential, issues a new one, and the student is back in under a minute. Clever: "Void Badge"
then "Download Badge." Quill: ellipsis → Reset password. Seesaw: regenerate the Home Learning
Code. ClassLink: reprint the QuickCard. **Nobody uses email, security questions, or SMS for a
middle-school student.** The one product in this survey that has no teacher-side recovery for a
student without email — CommonLit, which sends you to `help@commonlit.org` — is the weakest in
the set on this dimension.

### 1.3 Edge cases the strong products handle

- **Duplicate accounts.** Clever's instruction to app developers is unambiguous: "It's
  considered a best practice to **always key off the Clever User ID** when linking Clever users
  to accounts in your system," because "Clever does not verify user email addresses, and some
  users may not have an email on record. This is especially true for younger students," and
  `sis_id` is "scoped to a single district" and can collide across districts.
  ([Clever Users docs](https://dev.clever.com/docs/users)) On SIS migration, "Clever recommends
  keeping the primary identifier the same… maintaining the same `sis_id` will protect you from
  duplicate or lost records."
  ([Changing SIS](https://support.clever.com/hc/s/articles/360049183691))
- **A student in two classes.** CommonLit: one account, add class codes from "My Account and
  Classes." Newsela: Settings → Classes → class code. Neither creates a second identity.
- **Joining the wrong class.** Google Classroom lets students self-unenrol; the docs warn that
  self-unenrolment "removes their grades from the class."
- **Teacher removing a student / transfer.** Clever badges survive school/teacher/section
  changes because they bind to the *student*, not the enrolment. Rostered products treat the
  district system as authoritative — Prodigy's "classrooms created with Clever will not use a
  class code."
- **End-of-year rollover.** Google Classroom's model is *archive, don't delete*: archiving
  makes a class read-only while keeping it retrievable, and reusing last year's class is
  explicitly discouraged. Clever's model is *rotate the credential at the seam*: void and
  reprint badges each summer, and grade-scoped badges naturally invalidate as cohorts move up.
  ([Alice Keeler on archiving](https://alicekeeler.com/2021/06/25/archive-your-google-classroom-classes/),
  [Clever badge invalidation](https://support.clever.com/hc/s/articles/000001682))
- **Shared / kiosk device with the previous student still signed in.** This is where the
  market is *weakest* and where BOW can beat it. Seesaw's Class Code mode keeps a student
  signed in "up to one year" on the device and its answer for carts is a separate mode where
  the student re-picks their name before every response and **cannot save drafts**. ClassLink's
  documented failure is worse: after a QuickCard login on a Chromebook, "they cannot later log
  into that same device using their email and password without IT department assistance."
  Nobody in this survey ships a strong "you are not the last person who sat here" affordance.

---

## Part 2 — The rostering/SSO landscape a district will demand

| Standard | What it is | What a tool must have internally |
|---|---|---|
| **Clever Secure Sync + Instant Login** | OAuth 2.0 authorization-code flow; app receives a Clever User ID (`id`, guaranteed), `sis_id`, `name`, `school`, `schools`, `sections`; `email` and `grade` are **not guaranteed**. Clever Library passes "first name, last initial" for students. | A stable external-id link table keyed on the Clever `id`, never on email. ([Clever SSO/OAuth](https://dev.clever.com/docs/oauth-implementation), [Users](https://dev.clever.com/docs/users)) |
| **ClassLink Roster Server** | OneRoster-based roster delivery, plus SAML, OAuth and LTI, "with no fees to vendors"; districts choose "which data they choose to share" and can mask PII with DataGuard. | Same link table, provider = `classlink`; tolerate absent fields. ([Roster Server](https://www.classlink.com/products/roster-server)) |
| **OneRoster 1.2 (1EdTech)** | Rostering, Gradebook and Resources services in both CSV (22 files) and REST (81 endpoints). Models orgs, users, classes, courses, **academic sessions / terms**, enrollments, demographics, results. | Entities that map 1:1 onto org / course / class / enrollment / academicSession, and a `sourcedId` column on each. ([OneRoster](https://www.1edtech.org/standards/oneroster), [CSV binding 1.2.1](https://www.imsglobal.org/spec/oneroster/v1p2/bind/csv)) |
| **LTI 1.3 / LTI Advantage** | Launch delivers a JWT: `sub` (platform-scoped user id), `roles`, context. Name/email claims are **platform-controlled and optional**. Advantage adds NRPS (roster), Deep Linking, AGS (gradebook line items). Docs warn not to key persistence on `resource_link.id` because it changes on course copy. | Auth that can accept an opaque `sub` with *no* name at all; assignments that can carry a nullable AGS line-item ref. ([LTI Advantage impl guide](https://www.imsglobal.org/spec/lti/v1p3/impl/), [1EdTech LTI](https://www.1edtech.org/standards/lti)) |
| **Google Classroom API** | Scopes `classroom.rosters` / `.readonly`, plus separate `classroom.profile.emails` and `classroom.profile.photos`. Student resource = `courseId`, `userId`, `profile`. Public apps need OAuth verification. | Ability to run with rosters-readonly and *without* the email/photo scopes. ([Classroom auth scopes](https://developers.google.com/workspace/classroom/guides/auth)) |
| **Microsoft School Data Sync** | Ingests any OneRoster-API-conformant source; provisions users/groups into Entra ID; continuous polling. | Nothing tool-side beyond OneRoster/Entra SSO. ([SDS OneRoster ingestion](https://learn.microsoft.com/en-us/schooldatasync/data-ingestion-with-oneroster-api)) |

### The seven structural properties that make all of the above a config change

1. **`student.id` is BOW's own opaque id and is never an external id.** All external ids live
   in one `identity_link` table `(subject_type, subject_id, provider, provider_tenant_id,
   provider_user_id)` with a unique index on the last three. This is the single most important
   decision; it is exactly what Clever tells integrators to do and what LTI's `sub` requires.
2. **Authentication is a row, not a column.** `credential(subject_id, kind)` where kind ∈
   `seat_card | teacher_password | google | microsoft | clever | classlink | lti`. Adding SSO
   inserts rows; it never migrates the `student` table.
3. **`class.roster_source`** ∈ `bow | clever | classlink | oneroster | google | lti`. When it
   is not `bow`, BOW hides add/remove-student and the class code entirely — Prodigy's
   behaviour, and the behaviour a district expects.
4. **Every name field is already optional and already shaped `given_name` + `family_initial`.**
   That is precisely what Clever Library hands over, so enabling SSO fills a field that already
   exists in the reviewed contract rather than introducing PII the contract never covered.
5. **`enrollment` carries `role` and `status`,** because OneRoster and LTI NRPS both model it
   that way and both push status changes rather than deletes.
6. **`academic_session_id` exists on class and assignment from day one, nullable.** OneRoster's
   rollover model is session-based. Without this column there is no seam to roll a year over.
7. **Assignments carry a nullable `line_item_ref`.** LTI AGS grade passback becomes an addition,
   not a re-model.

---

## Part 3 — The legal/policy frame, from primary sources

### 3.1 COPPA and the 2025 amendments

The amended COPPA Rule was published 22 April 2025. **"Effective date: The amended Rule is
effective June 23, 2025. Compliance date: Except with respect to § 312.11(d)(1), (d)(4), and
(g), regulated entities have until April 22, 2026 to comply."**
(90 FR 16906, [govinfo PDF](https://www.govinfo.gov/content/pkg/FR-2025-04-22/pdf/2025-05904.pdf))
That compliance date has already passed as of August 2026.

**The school-authorization exception was NOT codified.** In its own words:

> "In the 2024 NPRM, the Commission proposed a number of Rule modifications relating to
> educational technology ('ed tech'), including new definitions of *School* and
> *School-authorized education purpose*, as well as provisions governing collection of
> information from children in schools, and codifying a school authorization exception to
> obtaining verifiable parental consent… **To avoid making amendments to the COPPA Rule that
> may conflict with potential amendments to DOE's FERPA regulations, the Commission is not
> finalizing the proposed amendments to the Rule related to ed tech and the role of schools at
> this time.** The Commission will continue to enforce COPPA in the ed tech context consistent
> with its existing guidance."

A footnote confirms the knock-on: "the Commission is neither finalizing the proposed changes to
§ 312.4(b) nor deleting the phrase 'to the parent' in the heading for § 312.4(c)."
See also [Public Interest Privacy Center](https://publicinterestprivacy.org/new-coppa-update/).

**Consequence for BOW: the school-consent pathway rests on FTC guidance, not rule text.** The
operative guidance is the FTC's own:

> "Schools can consent on behalf of parents to the collection of student personal information —
> but only if such information is used for a school-authorized educational purpose and for no
> other commercial purpose."
> ([FTC business blog, April 2020](https://www.ftc.gov/business-guidance/blog/2020/04/coppa-guidance-ed-tech-companies-schools-during-coronavirus))

The same guidance tells schools to ask whether providers "let the school review and have
deleted the personal information collected from their students" — and says that if a company
will not permit deletion, the school cannot legally consent on the parents' behalf. **A
teacher-facing "delete this class and all of its evidence, now" control is therefore not a
nicety; it is a precondition of the consent pathway BOW would rely on.**

**What did change and does bind BOW:**

- **§ 312.2 "personal information"** now expressly includes **biometric identifiers** and
  government-issued identifiers, alongside persistent identifiers "that can be used to
  recognize a user over time and across different websites or online services."
  ([16 CFR 312.2](https://www.law.cornell.edu/cfr/text/16/312.2))
- **§ 312.8** now requires, at minimum, a **written information security program** with a
  designated coordinator, annual risk assessment, safeguards, regular testing and monitoring,
  and annual evaluation — plus written assurances from any third party that touches children's
  data. ([16 CFR 312.8](https://www.law.cornell.edu/cfr/text/16/312.8))
- **§ 312.10** now requires a **written data retention policy** stating "the purposes for which
  children's personal information is collected, the business need for retaining such
  information, and a timeframe for deletion," **published in the online notice**. Retention is
  limited to what is "reasonably necessary to fulfill the specific purpose(s) for which the
  information was collected." ([16 CFR 312.10](https://www.law.cornell.edu/cfr/text/16/312.10))

### 3.2 FERPA and the school official exception

Under **34 CFR § 99.31(a)(1)(i)(B)** a vendor can be treated as a "school official" only if it
(1) performs an institutional service or function the school would otherwise use employees for,
(2) is **under the direct control of the school with respect to the use and maintenance of
education records**, and (3) is subject to § 99.33(a)'s limits on use and redisclosure. The
school must also use reasonable methods to limit access to records in which the official has a
legitimate educational interest (§ 99.31(a)(1)(ii)).
([34 CFR 99.31](https://www.law.cornell.edu/cfr/text/34/99.31))

Two design consequences BOW should treat as binding:

- "Direct control" means the *school* decides retention, deletion and export. A fixed,
  vendor-chosen 120-day TTL that a teacher cannot extend, shorten, or override is in tension
  with it.
- "Legitimate educational interest" is scoped. A teacher must not be able to read the evidence
  of a student who is not in their class — including a student who transferred out.

### 3.3 New York Education Law § 2-d and 8 NYCRR Part 121

Part 121 took effect 29 January 2020. The sections that bite a vendor:

- **§ 121.1 definitions.** "Third-party contractor" is any non-agency entity receiving student
  data under a contract. "Student data" = PII from student records, PII defined by reference to
  34 CFR 99.3 (FERPA). **"Commercial or marketing purpose"** is defined broadly: "the sale of
  student data; or its use or disclosure for purposes of receiving remuneration…; the use of
  student data for advertising purposes, **or to develop, improve or market products or
  services to students**." ([8 NYCRR 121.1](https://www.law.cornell.edu/regulations/new-york/8-NYCRR-121.1))
  **Read that last clause carefully: in New York, using student data to improve the product is
  a commercial purpose.** Any "we use aggregate student data to make BOW better" sentence in a
  privacy policy is a finding waiting to happen.
- **§ 121.5.** The mandated standard is "the NIST Framework for Improving Critical
  Infrastructure Cybersecurity **Version 1.1**."
  ([8 NYCRR 121.5](https://www.law.cornell.edu/regulations/new-york/8-NYCRR-121.5))
- **§ 121.6.** A contractor's **data security and privacy plan** must cover: how it will
  implement every contract requirement; its administrative, operational and technical
  safeguards; how it meets § 121.3(c); **staff training** on the applicable federal and state
  confidentiality laws; **subcontractor management**; incident response including breach
  identification and notification; and **whether, how and when data is returned, deleted or
  destroyed** at contract end.
  ([8 NYCRR 121.6](https://www.law.cornell.edu/regulations/new-york/8-NYCRR-121.6))
- **§ 121.9.** Contractors must align with NIST CSF; limit internal access to those who need it;
  "not use the personally identifiable information for any purpose not explicitly authorized in
  its contract"; maintain reasonable safeguards; **"use encryption to protect personally
  identifiable information in its custody while in motion or at rest"**; "not sell personally
  identifiable information nor use or disclose it for any marketing or commercial purpose"; and
  bind subcontractors to the same.
  ([8 NYCRR 121.9](https://www.law.cornell.edu/regulations/new-york/8-NYCRR-121.9))
- **§ 121.10.** A contractor must notify each educational agency of a breach **"no more than
  seven calendar days after the discovery."** The agency then has 10 days to notify the Chief
  Privacy Officer, and 60 days to notify affected parents/students. **"Where a breach or
  unauthorized release is attributed to a third-party contractor, the third-party contractor
  shall pay for or promptly reimburse the educational agency for the full cost of such
  Notification."** ([8 NYCRR 121.10](https://www.law.cornell.edu/regulations/new-york/8-NYCRR-121.10))
- **§ 121.3 Parents' Bill of Rights.** Every contract must carry the agency's Bill of Rights
  plus supplemental information covering: exclusive purposes; subcontractor safeguards; contract
  duration and expiry and what happens to data at the end; how a parent may challenge accuracy;
  **where the data will be stored** and how it is secured; and how it is encrypted in motion and
  at rest. ([8 NYCRR 121.3](https://www.law.cornell.edu/regulations/new-york/8-NYCRR-121.3))
- **§ 121.8** requires the *educational agency* (not the vendor) to designate a **Data
  Protection Officer**. The vendor's DPO-equivalent obligation is § 312.8's "designate one or
  more employees to coordinate the information security program" and § 121.6's named contacts.
- **§ 121.11** sets civil penalties; Education Law § 2-d itself provides penalties of the
  greater of $5,000 or up to $10 per affected person for notification failures, escalating
  penalties for repeat violations, and sanctions up to a **five-year ban and debarment**.
  ([NY Educ. Law § 2-d](https://www.nysenate.gov/legislation/laws/EDN/2-D),
  [Part 121 index](https://www.law.cornell.edu/regulations/new-york/title-8/chapter-II/subchapter-E/part-121))

### 3.4 What a NYC district vendor review actually asks for

NYC Public Schools publishes its process. It is four sequential components, and it is slow:

1. **OneTrust Vendor Assessment** — all vendors.
2. **Data Processing Agreement**, with five attachments: A Services Description; B **Processor
   Data Privacy and Security Plan**; C **Parent Bill of Rights questionnaire (11 questions,
   answers published on the NYCPS family website)**; D Third Party Information Security
   Requirements; E **Certificate of Records Disposal**.
3. **IT Security Review** — required for any software/web/mobile product.
4. **OTI Cloud Review** — required for cloud-hosted software.

Timeline: "approximately three months after vendors submit completed OneTrust questionnaires."
Requests are initiated **by the school or program office through ERMA — vendors cannot
self-initiate.** And critically: schools **may not** use products that access student PII
"while the products and services are in the process of completing the compliance process," and
there is **no exception for free tools or for a single teacher adopting a product**.
([NYC InfoHub — Data Privacy and Security Compliance Process](https://infohub.nyced.org/in-our-schools/policies/data-privacy-and-security-compliance-process),
[NYCPS vendor supplemental information](https://www.schools.nyc.gov/about-us/policies/data-privacy-and-security-policies/supplemental-information-for-parents-about-doe-agreements-with-outside-entities/vendors-a-h))

A real, publicly posted Ed Law 2-d rider (Ulster BOCES) gives the clause-level shape a NY
district will demand: protected data remains district property; subcontractor management must
be described; **encryption in motion and at rest**; **breach notice within seven calendar
days**; return or destroy all confidential information on termination; staff training on
confidentiality law; NIST CSF alignment per § 121.5; no use for any purpose not explicitly
authorized; no sale, marketing or commercial use.
([Ulster BOCES Ed Law 2-d Rider](https://www.ulsterboces.org/about-us/policies/student-privacy-ed-law-2-d/education-law-2-d-rider))

### 3.5 Student Privacy Pledge

The 2020 Pledge (FPF/SIIA) commits signatories to: student personal information used **only**
for educational purposes; data never sold; partners educated on the commitments; privacy and
security best practices built into product improvement. It is **"legally enforceable by the
Federal Trade Commission and state attorneys general."** Signing is cheap and is frequently a
line item on district questionnaires; note the EFF's published criticism that the Pledge's
definitions leave gaps.
([FPF Student Privacy Pledge](https://fpf.org/student-privacy-pledge/),
[Pledge 2020 release](https://studentprivacypledge.org/news/10358/),
[EFF critique](https://www.eff.org/deeplinks/2021/09/fpfs-2020-student-privacy-pledge-new-pledge-similar-problems))

---

## Part 4 — THE BAR

Twelve testable sentences about what good student/teacher identity looks like in this market.

1. **A student's first login and their fortieth login are the same three actions**, and none of
   them requires anything the student has to remember unaided.
2. **A student who has forgotten everything is back to working inside sixty seconds, and the
   only person they have to talk to is their teacher** — no email, no reset link, no security
   question, no support ticket.
3. **The class code is public and grants nothing but the right to be asked who you are;** a
   second, per-student secret is what grants access to a student's own work.
4. **A student who sits down at a different device sees the exact state they left**, up to a
   boundary the product deliberately refuses to cross — and the product says out loud where that
   boundary is.
5. **A shared device never silently continues the previous student's session.** Identity is
   visible on every screen and switching students is one tap from anywhere.
6. **The teacher can see who has not started**, not merely who has finished. A roster whose only
   observable state is "submitted" is not a roster.
7. **One human being is one identity across every class, every teacher and every year**, and the
   product actively prevents a student from creating a second one.
8. **The product holds no direct identifier it does not need to function**, and every identifier
   it does hold is one the school could delete on request that afternoon.
9. **A teacher's account survives their laptop.** No credential that grants access to a class of
   children's work exists in exactly one browser with no recovery path.
10. **Every credential is revocable and re-issuable by the adult in the room**, individually and
    in bulk, and revocation takes effect on the next request.
11. **The product's own identifiers are opaque and internal, so a district identity system can be
    bolted on without renumbering a single student** — external ids live in a link table, never
    in the student record.
12. **Retention is the school's decision inside a published policy, not a constant in the source
    code**, and end-of-year is a modelled event rather than an expiry.

---

## Part 5 — TESTABLE CRITERIA

Numbered pass/fail. Each is checkable by a person with a browser, or by a test.

### Student join and return
1. A student joins a class typing no more than 11 characters total, drawn only from the
   confusable-free alphabet, with no name, email, or date of birth requested. **PASS/FAIL**
2. The identical join sequence works on day 2 on a different device, with no extra step and no
   "check your email." **PASS/FAIL**
3. A student who closes the tab mid-attempt and reopens on a *different* device resumes with
   every prior decision intact. **PASS/FAIL** *(BOW today: FAIL)*
4. A student who resumes after a sealed commitment cannot alter that commitment; the sealed
   stages render read-only and the product says why. **PASS/FAIL**
5. Two students cannot occupy the same seat: claiming an already-claimed seat is refused with a
   message that tells the student to see their teacher. **PASS/FAIL** *(BOW today: FAIL — any
   student may pick any seat number)*
6. Five wrong seat-key attempts lock that seat for 15 minutes, and the lock is visible on the
   teacher's roster. **PASS/FAIL**

### Recovery
7. A teacher can re-issue a student's credential from the roster in ≤3 clicks, the old
   credential stops working on the next request, and no student data is lost. **PASS/FAIL**
8. No recovery path anywhere in the student flow requires an email address, a phone number, or a
   knowledge-based question. **PASS/FAIL**
9. A teacher who loses their laptop can sign in on a new one and see all of their classes.
   **PASS/FAIL** *(BOW today: FAIL — the teacher key is unrecoverable)*

### Shared devices
10. With student A's session live, opening the app shows "Signed in as <A's label> — not you?"
    before any challenge content renders. **PASS/FAIL**
11. Signing out clears every trace of A's attempt from `localStorage`, `sessionStorage` and
    IndexedDB; a subsequent student B sees no fragment of A's run. **PASS/FAIL**
12. A session on a device not marked "my own device" expires after ≤45 minutes idle and ≤10
    hours absolute, whichever comes first. **PASS/FAIL**
13. A student's in-progress attempt is reconstructable from the server alone; local storage is a
    cache and deleting it loses nothing. **PASS/FAIL** *(BOW today: FAIL)*

### Roster and teacher view
14. The class overview lists every enrolled seat with state ∈ {not started, in progress,
    submitted}, including seats that have never opened the app. **PASS/FAIL** *(BOW today: FAIL)*
15. A teacher can leave feedback that attaches to a specific attempt, and deleting the attempt
    deletes the feedback. **PASS/FAIL**
16. A teacher removing a student ends the enrolment, hides that student's evidence from that
    teacher, and does not delete the student's identity or their work in other classes.
    **PASS/FAIL**
17. Teacher A cannot read any evidence belonging to a class they do not teach, including by
    guessing an id, and a test asserts this. **PASS/FAIL** *(BOW today: PASS in spirit —
    `service.test.ts` proves the class code cannot open the evidence room)*

### Multi-class, multi-year
18. A signed-in student joins a second teacher's class by entering only the second class code,
    and both classes appear under one identity. **PASS/FAIL**
19. A student's identity, and their completed-challenge history, survive an academic-year
    rollover; the previous year's classes become read-only rather than vanishing. **PASS/FAIL**
    *(BOW today: FAIL — 120-day hard expiry)*
20. Creating a class for a new year does not require re-issuing identities to returning students.
    **PASS/FAIL**

### Integration-readiness
21. `student.id` appears in zero external-system columns; every external id is in
    `identity_link`, and a grep proves it. **PASS/FAIL**
22. A student can be authenticated by a `seat_card` credential and later by a `clever` credential
    resolving to the *same* `student.id`, with no data migration. **PASS/FAIL**
23. Every user-facing name field can be null, and the whole product renders correctly with every
    name null. **PASS/FAIL**
24. `class.roster_source != 'bow'` hides add/remove-student and the class code in the UI.
    **PASS/FAIL**

### Security and privacy
25. Every class code, seat key and session token is generated from a CSPRNG; `Math.random`
    appears in zero code paths that produce a credential, and a lint rule enforces it.
    **PASS/FAIL** *(BOW today: FAIL — `server/handler.ts:164`)*
26. Seat keys and session tokens are stored only as hashes; a database dump yields no usable
    credential. **PASS/FAIL**
27. TLS in transit and encryption at rest are both in force, as § 121.9 requires. **PASS/FAIL**
28. A teacher can permanently delete a class and all of its evidence from the UI, and a
    subsequent read returns 404. **PASS/FAIL**
29. A published, versioned written data retention policy exists and matches the code's actual
    behaviour, per 16 CFR 312.10. **PASS/FAIL**
30. A written information security program exists with a named coordinator, a dated annual risk
    assessment, and a testing record, per 16 CFR 312.8. **PASS/FAIL**
31. An audit log records credential issuance, revocation, failed claims, evidence reads, student
    removal and class deletion, with actor and timestamp. **PASS/FAIL**
32. No third-party analytics, advertising or session-replay SDK loads on any student route, and a
    CI check on the built bundle enforces it. **PASS/FAIL**
33. Student data is provably never used to "develop, improve or market products or services to
    students" — no product analytics keyed to a student, per 8 NYCRR 121.1. **PASS/FAIL**

---

## Part 6 — RECOMMENDED IDENTITY MODEL FOR BOW

**Name: the Seat Card.** A per-student, teacher-issued, revocable, printable credential holding
no personal information, scoped to one class, in a product whose student identity is
pseudonymous by default and portable across classes and years.

This is the Seesaw Home Learning Code / Clever Badge primitive, made typable for a grade 6–8
keyboard, coupled to a proper teacher account and a server-side attempt store.

### 6.1 Exactly what a teacher does to set up

1. **Creates a teacher account** — email + password, or Google/Microsoft SSO. Email is verified.
   Teachers are adults with recoverable email; students are not. *The `teacherKey` concept is
   retired.* Existing keys survive as a `legacy_teacher_key` credential with a published sunset;
   a teacher "adopts" a legacy class by entering its key once, binding it to their account.
2. **Creates a class**: a label they will recognise ("Period 3"), a seat count, and (optionally)
   an academic session. BOW allocates a 5-character class code from the existing alphabet, now
   from `crypto.randomBytes`.
3. **Prints the seat cards.** BOW returns a PDF, one card per seat:

   ```
   ┌──────────────────────────────┐
   │  BOW · Ms. Chen · Period 3   │
   │                              │
   │   Class code   H4KQN         │
   │   Your seat    12            │
   │   Your key     R7QM          │   [QR: /j/H4KQN/12]
   │                              │
   │  Keep this card. If you lose │
   │  it, ask for a new one.      │
   └──────────────────────────────┘
   ```

4. **Assigns a challenge** (the existing `Assignment` record, unchanged in shape).
5. **Watches the roster** — every seat shows not started / in progress / submitted, live.

Teacher setup is under two minutes and requires the teacher to type **nothing about any
student**.

### 6.2 Exactly what a student types — day 1 and day 2

**Day 1, in class.** Class code goes on the board; cards are handed out.

1. Go to the URL. → `Class code:` type **`H4KQN`** (5 chars, folded, so `0`→`Q` etc.).
2. A seat grid appears. Claimed seats are greyed. **Tap seat 12.**
3. `Your key:` type **`R7QM`** (4 chars).
4. In. First screen: *"You are Seat 12 in Ms. Chen · Period 3. Keep your card."* Nothing else is
   asked. No name, no email, no birthday, no avatar.

**Day 2, on a different device or a shared Chromebook.** Identical. Class code → tap seat → key.
There is nothing new to learn and nothing extra to forget, which is the entire point of the
design. On a camera device, the card's QR pre-fills class + seat, reducing day 2 to four
characters.

**If the previous student is still signed in:** the app renders, before any challenge content,
*"Signed in as Seat 8 — not you? [Switch student]"*. It never silently continues.

**Lost card:** raise hand → teacher's roster → "Reissue Seat 12" → new 4-character key on screen
or printed; the old key is dead on the next request. This is Clever's void-and-reprint, and it
is the only recovery path BOW needs.

**Why 4 characters is enough.** 25⁴ = 390,625 per seat. The realistic adversary is a classmate
with a keyboard, not a botnet: five attempts per seat per ten minutes, then a 15-minute lock
that appears on the teacher's roster, reduces a classmate's success probability to
approximately 10⁻⁴ over a full class period. The consequence of a successful impersonation is a
classmate seeing someone's financial-decision homework — not an email account. Calibrate the
credential to the threat, as Clever explicitly does by age band.

### 6.3 What BOW stores, and what it deliberately does not

**Stores about a student:** an opaque `student.id`; a hash of the current seat key; an optional
teacher-set `display_label`; timestamps; enrolments; attempts and the evidence event log the
student's own decisions produced.

**Deliberately does not store:** student email; parent email; a *required* full legal name; date
of birth or age; grade level attached to a person (grade belongs to the class); any demographic
attribute — gender, race, IEP, ELL, FRL; photograph or uploaded avatar; biometric identifier of
any kind (newly enumerated in 16 CFR 312.2); geolocation; IP address in durable storage;
device/browser fingerprint; third-party analytics or advertising identifiers; free-text teacher
notes *about a student* (feedback attaches to an attempt, not to a person).

### 6.4 How a student is identified to their teacher — and the argument for holding a name

**The default is a seat number, and the teacher's own paper card is the key.** BOW holds "Seat
12"; the mapping from Seat 12 to a child lives with the school. That is the strongest possible
minimisation story and it makes an Attachment C questionnaire short.

**But shipping only that would be a mistake, and here is the argument.**

- Teachers will not maintain a paper key across five sections × 30 students × a year. If BOW
  offers no field, names go into fields that are *worse* protected — the class label ("P3 —
  Marcus, Ana, Dev…"), or the reflection text, or a Google Sheet the district never reviewed.
  Refusing the field does not prevent the data; it relocates it somewhere unmanaged.
- The minimisation claim is legally thinner than it looks. FERPA's PII definition (34 CFR 99.3,
  incorporated by 8 NYCRR 121.1) covers indirect identifiers that permit identification "with
  reasonable certainty." "Seat 12 in class H4KQN," combined with the teacher's key, *is*
  personally identifiable. BOW does not hold the key — a real and worthwhile reduction in
  exposure — but "we hold no PII" would be an overclaim, and a district reviewer will say so.
- **And BOW cannot claim to hold no PII regardless, because students write free text.** The
  reflection stage asks a 12-year-old why they played it that way. That is an education record,
  and it can contain names.

**Recommendation: an optional, teacher-entered `display_label`, defaulting to the seat number,
explicitly shaped and labelled as "given name + last initial — e.g. `Marcus O.` — please enter
nothing else."** That is exactly the shape Clever Library hands to apps ("first name, last
initial"). It is never required, never shown to another student, never included in any export
by default, and deletable per-student without touching the work. BOW's honest sentence to a
district becomes: *"BOW collects no student email, no date of birth, no demographics and no
biometrics. A student is a seat number unless the teacher chooses to add a first name and last
initial, which the school controls and can delete at any time. Student-authored reflection text
is student work and is retained under the district's retention setting."*

### 6.5 Session and token model

- **Student session:** opaque 256-bit token from `crypto.randomBytes(32)`, stored server-side as
  a SHA-256 hash, delivered as `HttpOnly; Secure; SameSite=Lax; Path=/`. No JWT — every session
  must be revocable by a single row update.
- **Device class**, chosen at claim time with a plain question ("Is this your own device, or a
  shared one?"), defaulting to **shared**:
  - *Shared*: 45 minutes idle, 10 hours absolute.
  - *Own device*: 14 days idle, 90 days absolute.
- **Teacher session:** same shape; 12 hours idle, 30 days absolute; re-authentication required
  before class deletion or bulk export.
- **Revocation:** "End all sessions in this class" is one teacher action — the correct end-of-
  period control for a Chromebook cart.
- **Attempt state lives on the server**, appended per evidence event (BOW already has an
  append-only event log — this is a natural fit). `localStorage` becomes a write-through cache,
  cleared on sign-out and on any student mismatch.
- **Resume semantics:** the attempt carries `sealed_through_stage`. Resume restores the working
  tail only; sealed stages re-render read-only with a one-line explanation. This is what "resume
  exactly where it is safe to" means for a product built on commitment under uncertainty — a
  student must not be able to re-decide a commitment after seeing Week 5.
- **Idempotency** stays on `(classCode, seatCode, sessionId)` and gains `enrollmentId`.

### 6.6 Expiry, retention and rollover

- The 120-day constant goes. A class is **active until archived**, and archiving is a modelled
  event (Google Classroom's read-only archive is the right precedent) rather than an expiry.
- `class.retention_until` defaults to **31 July of the following school year** and is
  **configurable per district contract**, because § 121.6 requires the contractor's plan to say
  "whether, how and when data will be returned… deleted or destroyed," and FERPA's "direct
  control" test means the school decides.
- Attempts and evidence are deleted at `retention_until` unless exported or the retention is
  extended by the school.
- A student identity is deleted 30 days after its last enrolment ends.
- **"Delete this class and all its evidence, now"** is a teacher-visible button. The FTC's
  guidance makes the school's ability to have data deleted a precondition of school consent.
- The written retention policy is published in the privacy notice, as 16 CFR 312.10 requires.

### 6.7 Multi-class, wrong class, removal, transfer, duplicates

- **Second class:** a *signed-in* student enters only the class code (CommonLit's exact
  pattern). Identity is already proven; a second card is unnecessary. One `student.id`, two
  enrolments.
- **Wrong class:** the class label and teacher label are shown *before* the claim is committed.
  Self-unenrol is available for 10 minutes after joining, and thereafter by asking the teacher.
- **Teacher removes a student:** `enrollment.status = 'removed'`. Evidence stays attached to
  that enrolment, becomes archived-to-teacher, and is deletable by the teacher. The student's
  identity and their work in other classes are untouched.
- **Transfer:** same `student.id`, new enrolment in the new class. **The new teacher cannot see
  the old class's evidence** — legitimate educational interest is scoped per 34 CFR
  99.31(a)(1)(ii).
- **Duplicate prevention**, the most common real-world failure: (a) cards are pre-generated, so
  a student cannot self-create a second identity in a class; (b) the seat grid shows claimed
  seats as claimed; (c) claiming a second seat in a class you already hold offers a merge
  instead; (d) once SSO exists, matching is on the provider's stable id first — Clever's `id`,
  LTI's `sub` — **never on email**, per Clever's own instruction and its warning that young
  students frequently have no verified email.

### 6.8 Migration path to Clever / Google SSO / OneRoster / LTI

The model above is already the shape those integrations want. The migration is:

| Step | Change | Effort |
|---|---|---|
| 1 | Insert rows into `identity_link` from a Clever/OneRoster sync job | New job, no schema change |
| 2 | Add `credential.kind = 'clever'` and an OAuth callback | New route |
| 3 | Set `class.roster_source = 'clever'`; UI hides class code and add/remove student | Config-driven, one branch |
| 4 | Populate `student.display_label` from Clever's first-name + last-initial | Fills an existing field |
| 5 | Map OneRoster `academicSessions` onto `academic_session_id` | Existing nullable column |
| 6 | LTI 1.3: accept `sub` as `identity_link.provider_user_id`, launch straight into the assignment | New route; `student.display_label` stays null when the platform sends no name |
| 7 | LTI AGS grade passback: populate `assignment.line_item_ref` | Existing nullable column |

**Nothing in this list renumbers a student, migrates the `student` table, or changes the
evidence model.** That is the test the brief asked for, and it is met by exactly one decision:
`student.id` is BOW's own opaque id, and every external identifier lives in a link table.

### 6.9 Data model

**Entities**

| Entity | Fields | Notes |
|---|---|---|
| `teacher` | `id`, `email` (verified, unique), `display_name`, `password_hash?`, `created_at`, `last_seen_at`, `deleted_at?` | Adults only. Email required — recoverable, and it kills the unrecoverable-teacher-key problem. |
| `student` | `id` (opaque uuid), `display_label?` (given name + family initial; nullable; default null → renders as seat number), `created_at`, `last_seen_at`, `deleted_at?` | **No email, no DOB, no demographics, no photo, no biometric, no IP, no fingerprint.** |
| `identity_link` | `id`, `subject_type` (`teacher`\|`student`), `subject_id`, `provider` (`google`\|`microsoft`\|`clever`\|`classlink`\|`lti`\|`oneroster`), `provider_tenant_id`, `provider_user_id`, `linked_at` | **UNIQUE(provider, provider_tenant_id, provider_user_id).** The whole integration story lives here. |
| `credential` | `id`, `subject_type`, `subject_id`, `kind` (`seat_card`\|`teacher_password`\|`legacy_teacher_key`\|`oauth`), `secret_hash` (argon2id), `issued_at`, `issue_number`, `claimed_at?`, `revoked_at?`, `failed_attempts`, `locked_until?` | Auth is a row, not a column. |
| `class` | `id`, `code` (5 chars, CSPRNG, unique among active), `label`, `owner_teacher_id`, `academic_session_id?`, `roster_source` (`bow`\|`clever`\|`classlink`\|`oneroster`\|`google`\|`lti`), `external_ref?`, `join_open` (bool), `created_at`, `archived_at?`, `retention_until` | Code is public and grants only "resolve + be asked who you are". |
| `class_teacher` | `class_id`, `teacher_id`, `role` (`owner`\|`co_teacher`) | Co-teaching without sharing a password. |
| `enrollment` | `id`, `class_id`, `student_id?`, `seat_number`, `status` (`unclaimed`\|`active`\|`removed`), `joined_at?`, `removed_at?` | `student_id` null until the card is claimed — this is what makes "not started" visible. UNIQUE(class_id, seat_number). |
| `academic_session` | `id`, `label` ("2026–27"), `starts_on`, `ends_on`, `external_ref?` | Nullable everywhere now; OneRoster's rollover seam later. |
| `assignment` | *(existing)* + `academic_session_id?`, `line_item_ref?` | `objectiveRef` / `competencyIds` split preserved unchanged. |
| `attempt` | `id`, `enrollment_id`, `assignment_id`, `world_id`, `state` (`in_progress`\|`submitted`), `sealed_through_stage`, `event_log` (append-only), `created_at`, `updated_at`, `submitted_at?` | **Server-authoritative.** This is the change that buys cross-device resume and "not started". |
| `feedback` | `id`, `attempt_id`, `teacher_id`, `body`, `created_at` | Attaches to *work*, never to a person. Deleted with the attempt. |
| `session` | `id`, `subject_type`, `subject_id`, `token_hash`, `device_class` (`shared`\|`own`), `created_at`, `idle_expires_at`, `absolute_expires_at`, `revoked_at?` | Opaque + revocable. No JWT. |
| `audit_event` | `id`, `at`, `actor_type`, `actor_id`, `action`, `class_id?`, `target_type?`, `target_id?` | Actions: `card_issued`, `card_revoked`, `claim_ok`, `claim_failed`, `seat_locked`, `student_removed`, `evidence_read`, `class_archived`, `class_deleted`, `export`. |

**Fields that must not exist anywhere in this schema:** `student.email`, `student.parent_email`,
`student.date_of_birth`, `student.grade`, `student.gender`, `student.race`, `student.iep`,
`student.frl`, `student.photo_url`, `student.ip_address`, `student.device_fingerprint`,
`student.notes`. A schema-lint test asserting their absence is the cheapest privacy control BOW
can own, and it is the one line a district reviewer will believe.

---

## Part 7 — WHAT TO REFUSE TO BUILD

Each of these would look normal in an LMS and would make BOW worse.

1. **Student email addresses and email-based password reset.** Adds PII, adds a breach surface,
   adds a recovery path a 12-year-old on a shared Chromebook cannot use, and replaces a working
   recovery mechanism (the teacher) with a broken one. No product in this survey uses it for
   middle-school students.
2. **A points-and-weights gradebook.** BOW's entire claim is evidence → competency → objective,
   with `objectiveRef` and `competencyIds` deliberately held as separate claims. A percentage
   column lets a teacher report a number BOW cannot show its working for, and it is the fastest
   way to destroy the product's reason to exist.
3. **Parent accounts and a parent portal.** Triggers a second consent regime (COPPA's
   direct-to-parent notice and verifiable parental consent, which the school-consent pathway
   exists to avoid), a second identity system, and a second audience for evidence that FERPA
   scopes to the school.
4. **Teacher↔student messaging or DMs.** Creates a communications record subject to retention,
   discovery, moderation and mandatory-reporting expectations. Feedback on a piece of work is
   not the same thing and does not carry those obligations.
5. **Named leaderboards, streaks, XP and cross-class competition.** Kahoot's business model,
   and poison for BOW: a race is the opposite of committing under uncertainty. It also makes a
   persistent cross-class identifier much harder to justify as "reasonably necessary" under 16
   CFR 312.10.
6. **Any student-to-student visibility at all** — peer comments, shared feeds, seeing a
   classmate's plan. Seesaw's Home Learning Code exists precisely to *remove* this, and BOW has
   no pedagogical need for it.
7. **"Live monitoring" of student screens, keystroke timing, or idle telemetry.** The 2025
   COPPA amendments expanded "personal information" to include biometric identifiers and the FTC
   considered keystroke dynamics in that discussion. Behavioural telemetry is the single most
   expensive thing to defend in a NY vendor review and buys BOW nothing.
8. **Product analytics keyed to a student, or "we use student data to improve BOW."** 8 NYCRR
   121.1 defines commercial or marketing purpose to include "the use of student data … to
   develop, improve or market products or services to students." Any such sentence in a privacy
   policy is a self-inflicted finding. Product improvement must run on class-level or
   de-identified aggregates only, and the policy must say so.
9. **Student self-signup without a class.** Every identity in BOW should come into existence
   because an adult created a seat for it. This is what makes duplicate prevention possible and
   what keeps the school-consent story coherent.
10. **A teacher-uploaded CSV of full student names to auto-create accounts.** The fastest route
    to holding a complete roster of directory information BOW promised not to hold, in a field
    nobody reviewed. If a district wants roster import, it comes through Clever/OneRoster under
    a signed DPA, not through a file upload box.
11. **"Sign in with Google" as the *only* student route in year one.** It forces a district IdP
    relationship BOW does not yet have, excludes non-Google districts, and fails exactly where
    BOW needs to work — the shared cart where the previous student is still signed into Chrome.
12. **A generic assignment/announcement/calendar surface.** BOW is not competing with Google
    Classroom and every hour spent there is an hour not spent on the thing that is actually
    unique.

---

## Part 8 — RISKS AND UNKNOWNS

**Things a district could legitimately object to in the recommended model**

1. **A printed card is a shared secret on paper.** It gets lost, photographed, swapped and
   traded. Clever's own guidance is that badges "should be protected just like a password," and
   a reviewer may reasonably ask why BOW is distributing credentials on paper to children. The
   honest answers are: it is the industry-standard pattern for this age band; the credential is
   scoped to one class and one product; revocation is instant and teacher-controlled; and the
   asset behind it is homework, not an identity.
2. **BOW cannot attest that work is a given student's.** A student can use a classmate's card.
   Mitigation is rate-limiting, an audit log the teacher can read, and revocation — not
   prevention. The honest answer is that Kahoot, Seesaw and Nearpod cannot attest it either;
   attribution in a classroom is the teacher's job. If a district wants attested identity, the
   answer is Clever/ClassLink SSO, which the architecture is built to accept.
3. **Student-authored reflection text defeats any absolute minimisation claim.** It is free text
   written by a child and can contain their own name, other children's names, or anything else.
   BOW must state this plainly rather than claim it holds no PII, and must have an answer:
   it is student work, retained under the district's setting, individually deletable, never used
   for product improvement or model training.
4. **The `display_label` field is where minimisation erodes.** Teachers will type full names into
   it despite the guidance. Mitigations: a short max length, a hint that rejects strings
   containing more than two whitespace-separated tokens, and a per-class "clear all labels"
   control. This is a residual risk, not a solved problem.
5. **Ed Law 2-d exposure is real money for a small vendor.** Seven-day breach notice to every
   affected district, plus **full reimbursement of the agency's parent-notification cost**
   (8 NYCRR 121.10), plus civil penalties and up to a five-year ban (§ 121.11 / Educ. Law § 2-d).
   BOW needs a written incident response plan and, realistically, insurance before signing.
6. **The § 312.8 and § 312.10 obligations are documents, not code.** A written children's
   information security program with a named coordinator, an annual risk assessment, testing
   records and an annual review; and a published written data retention policy. The compliance
   date was 22 April 2026 — already past. No architecture decision substitutes for these.

**Process and timeline risks**

7. **NYC's vendor process is ~3 months, has four stages, and cannot be started by the vendor.**
   It is initiated by the school through ERMA; free tools get no exemption; single-teacher
   adoption gets no exemption; and schools may not use the product with student PII while the
   review is in flight. A "pilot at District 26 next month with real students" is likely not
   available through the official path. The realistic near-term options are: run with no student
   PII at all (which the seat-card model makes genuinely plausible), or start the ERMA process
   now via a District 26 sponsor and plan for spring.
8. **The COPPA school-consent ground may move.** It now rests entirely on FTC guidance, because
   the Commission expressly declined to codify §312.5(c)(10) in April 2025 "to avoid making
   amendments to the COPPA Rule that may conflict with potential amendments to DOE's FERPA
   regulations." If DOE issues FERPA amendments and the FTC then finalises its ed-tech
   provisions, the requirements could change materially within BOW's planning horizon.

**Unknowns — could not be verified from an authoritative source**

9. **[UNVERIFIED]** Whether NYC Community School District 26 can procure independently of the
   citywide NYCPS process, or must route through it. The only primary source found describes a
   citywide process; nothing District-26-specific was located.
10. **[UNVERIFIED]** Whether NYCPS requires or prefers Clever/ClassLink certification, or accepts
    a direct integration.
11. **[UNVERIFIED]** Whether Google Classroom class codes expire automatically. Google documents
    that a code is entered once and that a teacher can reset or disable it, but states no
    automatic expiry.
12. **[UNVERIFIED]** Whether Clever Badges have a hard technical expiry. Clever's product page
    says badges "are voided each year," but district documentation says "newly generated and
    printed Badges will no longer feature expiration dates" and that a printed badge with a date
    "will continue to work past that date" — i.e. annual rotation appears to be an operational
    practice, not an enforced technical expiry.
13. **[UNVERIFIED]** The full text of the FTC COPPA FAQ Section N ("COPPA and Schools"). The FTC
    page could not be retrieved past Section J by the tools available. The school-consent
    position quoted above is taken from the FTC's own business blog and from the Federal Register
    preamble, both primary FTC sources.
14. **[UNVERIFIED]** The complete numbered commitment list of the 2020 Student Privacy Pledge.
    FPF's current page describes "a dozen privacy commitments" and confirms FTC/state-AG
    enforceability but does not enumerate them.

**Defects in the current codebase surfaced by this research**

15. **`Math.random` generates teacher keys and class codes in production** (`server/handler.ts:164`;
    neither `api/[[...route]].ts` nor `server/index.ts` injects a CSPRNG). Fix with
    `crypto.randomBytes` and add a lint rule.
16. **The teacher key is unrecoverable and single-browser.** One cleared cache and a teacher
    loses every class. This is not a privacy risk; it is a product-abandonment risk, and it is
    the reason teacher accounts are non-negotiable.
17. **The 120-day expiry cannot survive a school year** and is a vendor-chosen constant where
    FERPA's "direct control" test and § 121.6 both expect a school-controlled term.

---

## Sources

**Products**
Clever Badges — https://www.clever.com/products/badges ·
Clever age-appropriate login guide — https://www.clever.com/blog/2025/12/school-password-secure-login-guide ·
Clever Users API — https://dev.clever.com/docs/users ·
Clever OAuth — https://dev.clever.com/docs/oauth-implementation ·
Clever changing SIS — https://support.clever.com/hc/s/articles/360049183691 ·
Clever badge invalidation — https://support.clever.com/hc/s/articles/000001682 ·
Boston Public Schools Clever Badges — https://bostonpublicschools.helpdocs.io/article/agfx32c3y9-how-do-i-access-and-use-clever-badges ·
Central Point SD6 Clever Badges — https://support.district6.org/en/knowledgebase/article/clever-student-badges ·
ClassLink login options — https://www.classlink.com/products/login-options ·
ClassLink Roster Server — https://www.classlink.com/products/roster-server ·
Philomath SD QuickCards — https://helpdesk.philomath.k12.or.us/help/en-us/27-classlink/56-how-do-students-log-in-with-their-classlink-quickcards-qr-codes ·
Seesaw sign-in modes — https://help.seesaw.me/hc/en-us/articles/203495019-Student-sign-in-modes ·
Seesaw Home Learning Codes — https://help.seesaw.me/hc/en-us/articles/360045960531-Home-Learning-Codes ·
Google Classroom join — https://support.google.com/edu/classroom/answer/15605102 ·
Google Classroom invite students / manage codes — https://support.google.com/edu/classroom/answer/6020282 ·
Google Classroom API auth scopes — https://developers.google.com/workspace/classroom/guides/auth ·
Google Classroom API Students resource — https://developers.google.com/workspace/classroom/reference/rest/v1/courses.students ·
Kahoot join — https://support.kahoot.com/hc/en-us/articles/360039890713-Kahoot-join-How-to-join-a-Kahoot-game ·
Blooket accounts — https://help.blooket.com/hc/en-us/articles/17350775717911-Do-students-need-a-Blooket-account-to-play ·
Wayground (Quizizz) join — https://wayground.com/join ·
Gimkit Classes explained — https://help.gimkit.com/en/article/classes-explained-1er5lcw/ ·
Gimkit assignment progress — https://help.gimkit.com/en/article/assignment-progress-4lt6kn/ ·
Nearpod Live→Student-Paced — https://nearpod.zendesk.com/hc/en-us/articles/4404207058836-Use-Live-to-Student-Paced-mode ·
Pear Deck getting started FAQ — https://www.peardeck.com/blog/faqs-about-pear-deck-getting-started ·
Khan Academy teacher start — https://support.khanacademy.org/hc/en-us/articles/202487470-How-do-I-get-started-using-Khan-Academy-as-a-teacher ·
Khan Academy class-code handout — https://cdn.kastatic.org/downloads/KhanAcademyClassCodes.pdf ·
Prodigy student login — https://prodigygame.zendesk.com/hc/en-us/articles/201586853-How-do-my-students-log-in-to-Prodigy ·
Quill student login information — https://support.quill.org/en/articles/1258626-how-do-i-access-student-login-information ·
Quill class codes — https://support.quill.org/en/articles/1303175-what-is-a-class-code-and-where-can-i-find-it ·
CommonLit account requirements — https://support.commonlit.org/article/466-what-information-does-a-student-need-to-create-an-account ·
CommonLit multi-class — https://support.commonlit.org/article/479-how-can-a-student-with-an-existing-account-add-another-class-code-to-join-my-class ·
Newsela ways to join — https://help.newsela.com/en/articles/13656073-students-ways-to-join-a-teacher-s-class ·
Google Classroom archiving practice — https://alicekeeler.com/2021/06/25/archive-your-google-classroom-classes/

**Standards**
OneRoster — https://www.1edtech.org/standards/oneroster ·
OneRoster CSV binding 1.2.1 — https://www.imsglobal.org/spec/oneroster/v1p2/bind/csv ·
LTI — https://www.1edtech.org/standards/lti ·
LTI Advantage implementation guide — https://www.imsglobal.org/spec/lti/v1p3/impl/ ·
LTI Advantage RFP requirements — https://www.1edtech.org/standards/lti/suggested-lti-advantage-requirements-rfps ·
Microsoft SDS OneRoster ingestion — https://learn.microsoft.com/en-us/schooldatasync/data-ingestion-with-oneroster-api

**Law and policy**
COPPA final rule, 90 FR 16904 (22 Apr 2025) — https://www.govinfo.gov/content/pkg/FR-2025-04-22/pdf/2025-05904.pdf ·
16 CFR 312.2 — https://www.law.cornell.edu/cfr/text/16/312.2 ·
16 CFR 312.8 — https://www.law.cornell.edu/cfr/text/16/312.8 ·
16 CFR 312.10 — https://www.law.cornell.edu/cfr/text/16/312.10 ·
FTC COPPA FAQ — https://www.ftc.gov/business-guidance/resources/complying-coppa-frequently-asked-questions ·
FTC ed-tech/schools guidance — https://www.ftc.gov/business-guidance/blog/2020/04/coppa-guidance-ed-tech-companies-schools-during-coronavirus ·
Public Interest Privacy Center on the COPPA update — https://publicinterestprivacy.org/new-coppa-update/ ·
34 CFR 99.31 — https://www.law.cornell.edu/cfr/text/34/99.31 ·
NY Educ. Law § 2-d — https://www.nysenate.gov/legislation/laws/EDN/2-D ·
8 NYCRR Part 121 index — https://www.law.cornell.edu/regulations/new-york/title-8/chapter-II/subchapter-E/part-121 ·
121.1 — https://www.law.cornell.edu/regulations/new-york/8-NYCRR-121.1 ·
121.3 — https://www.law.cornell.edu/regulations/new-york/8-NYCRR-121.3 ·
121.5 — https://www.law.cornell.edu/regulations/new-york/8-NYCRR-121.5 ·
121.6 — https://www.law.cornell.edu/regulations/new-york/8-NYCRR-121.6 ·
121.9 — https://www.law.cornell.edu/regulations/new-york/8-NYCRR-121.9 ·
121.10 — https://www.law.cornell.edu/regulations/new-york/8-NYCRR-121.10 ·
NYSED data privacy hub — https://www.nysed.gov/data-privacy-security ·
NYC Public Schools vendor compliance process — https://infohub.nyced.org/in-our-schools/policies/data-privacy-and-security-compliance-process ·
NYCPS vendor supplemental information — https://www.schools.nyc.gov/about-us/policies/data-privacy-and-security-policies/supplemental-information-for-parents-about-doe-agreements-with-outside-entities/vendors-a-h ·
Ulster BOCES Ed Law 2-d Rider — https://www.ulsterboces.org/about-us/policies/student-privacy-ed-law-2-d/education-law-2-d-rider ·
Student Privacy Pledge (FPF) — https://fpf.org/student-privacy-pledge/ ·
Pledge 2020 announcement — https://studentprivacypledge.org/news/10358/ ·
EFF critique of Pledge 2020 — https://www.eff.org/deeplinks/2021/09/fpfs-2020-student-privacy-pledge-new-pledge-similar-problems
