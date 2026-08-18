import { Link } from "react-router-dom";
import {
  FRAMEWORKS,
  gradeBandLabel,
  isAssessable,
  labelsFor,
  standardByRef,
  type FrameworkId,
  type StandardRef,
} from "../domain/standards";
import { EducatorShell } from "./EducatorShell";
import { TERMS } from "./labels";
import { durationLabel, PLAN_UNDER_PRESSURE } from "../platform/challenges/registry";

/**
 * The framework this guide names, and the objectives Plan Under Pressure's competencies
 * actually reach.
 *
 * `AlignmentBlock` used to read `src/domain/blueprint/standards.ts`, a pre-framework model
 * that hard-coded a strength ("Primary", "Partial") by objective id rather than deriving it
 * from what BOW can actually assess. That let the guide badge 1.2 "Primary" the same week
 * `/educator/objectives` correctly reported 1.2 as not yet assessable — two live surfaces,
 * one account of coverage each, disagreeing about the same objective. Reading
 * `src/domain/standards/` here instead means there is exactly one account in the product:
 * whatever `isAssessable` and the mapping table actually say.
 */
const GUIDE_FRAMEWORK_ID: FrameworkId = "nysed-pf-2026";
const GUIDE_OBJECTIVE_CODES = ["1.1", "1.2", "1.3", "4.1", "5.1"] as const;

function objectivePath(ref: StandardRef): string {
  return `/educator/objectives/${ref.frameworkId}/${ref.code}`;
}

/**
 * Standards alignment, read live from the audited layer rather than restated by hand.
 *
 * Every badge here is `isAssessable` and nothing else — the same function
 * `/educator/objectives` calls to decide "Ready to assign" from "Mapped, not yet
 * assessable." This page carries no opinion of its own about how strong an objective's
 * coverage is, because the day it did was the day the two surfaces could disagree again.
 */
function AlignmentBlock() {
  const labels = labelsFor(GUIDE_FRAMEWORK_ID);
  const framework = FRAMEWORKS[GUIDE_FRAMEWORK_ID];
  return (
    <section className="alignment-block">
      <div className="section-heading"><p className="eyebrow">Standards alignment</p><h2>Matched to {labels?.frameworkShort} objectives, not scored against them.</h2></div>
      <div className="alignment-grid">
        {GUIDE_OBJECTIVE_CODES.map((code) => {
          const ref: StandardRef = { frameworkId: GUIDE_FRAMEWORK_ID, code };
          const standard = standardByRef(ref);
          if (!standard) return null;
          const assessable = isAssessable(ref);
          return (
            <article key={code} data-code={code}>
              <span data-assessable={assessable}>{assessable ? "Ready to assign" : "BOW cannot see this one yet"}</span>
              <h3>{code} · {standard.shortLabel}</h3>
              <p>{standard.text}</p>
              <Link to={objectivePath(ref)}>What BOW measures for this ↗</Link>
            </article>
          );
        })}
      </div>
      <p className="disclaimer">
        {framework?.labels.attribution} {gradeBandLabel(GUIDE_FRAMEWORK_ID)} ·{" "}
        <a href={framework?.sourceUrl} target="_blank" rel="noreferrer">Official {labels?.frameworkShort} source ↗</a>
      </p>
    </section>
  );
}

/**
 * The eight questions a teacher who has never spoken to anyone at BOW needs answered
 * before they will run this, answered above the fold and in their own words. The last
 * three are questions about a real class, so they link into the evidence rather than
 * being described here.
 */
function BriefAnswers() {
  return (
    <section className="brief-answers">
      <div className="section-heading"><p className="eyebrow">Read this first</p><h2>The whole resource in one minute.</h2></div>
      <dl>
        <div><dt>What does it assess?</dt><dd>Whether students can <b>apply</b> budgeting under uncertainty — build a workable eight-week plan, keep it working when income and costs change, and justify it.</dd></div>
        <div><dt>When do I use it?</dt><dd><b>After</b> you have taught the {TERMS.skills}. It is an application task, not a lesson.</dd></div>
        <div><dt>How long?</dt><dd><b>{durationLabel(PLAN_UNDER_PRESSURE)}</b> for most students. One sitting, one device, no sound.</dd></div>
        <div><dt>What do students do?</dt><dd>They handle the money in one of two {TERMS.stories}, and they pick which. <b>Eight Weeks to the Showcase</b>: a player’s season, where they choose housing, build a plan, absorb a Week 5 loss and a new required cost, and repair it. <b>Run the Pop-Up</b>: four Saturdays at a night market, where they take a booth, decide how much food to cook against the crowd it draws, and cover a generator that dies with the biggest night still ahead. Both ask for a plan that fits the money, both break it, and both end with the student explaining in writing what they did.</dd></div>
        <div><dt>Do the two give me the same thing back?</dt><dd>Yes, and that is the point of having two. Both {TERMS.stories} collect evidence against the same named parts of the work and are judged on the same rubric, so a class where students chose differently still produces one answer about the class. What differs is the {TERMS.story}, the decisions and the numbers — never what is being looked for.</dd></div>
        <div><dt>What do I get back?</dt><dd>For each student, what the evidence shows against each {TERMS.skill} — one line for each thing the work had to show, every judgement traceable to the moment in their own run. Plus what the class decided, and one written explanation you read and score yourself. Counts for your gradebook come with it.</dd></div>
        {/* Every clause after the first used to be false: there are accounts now, teachers do
            give an email address, the roster is where the names live, and there is no seat
            number to give out — a student signs in with a class code and the code on a card.
            A teacher following the old sentence would have lost the lesson in the room. */}
        <div><dt>How do I launch it?</dt><dd>Create a class, paste your class list, and print the cards — one per student. Put the class code on the board; a student types that code and the code on their own card. They never type an email address, a password or a birthday. No list to hand? Students type the class code and their own first name instead.</dd></div>
      </dl>
      <div className="brief-answers__links">
        <Link to="/educator/classes">Run this with my class →</Link>
        <Link to="/educator/demo">See a sample class →</Link>
        <Link to="/educator/objectives">What it assesses →</Link>
      </div>
    </section>
  );
}

/**
 * The educator guide — a quick start, not a brochure.
 *
 * This was a 4,669px marketing page with a three-circle graphic that encoded a sum. What a
 * teacher needs before running this is six answers, what students should already know, and
 * five steps. Everything else it used to say is on the surfaces that do the work.
 */
export function EducatorGuide() {
  return (
    <EducatorShell>
      <header className="page-header">
        <p className="eyebrow">Educator guide · {PLAN_UNDER_PRESSURE.grades}</p>
        <h1>{PLAN_UNDER_PRESSURE.title}</h1>
        <p>
          An application task for adaptive budgeting under uncertainty. {durationLabel(PLAN_UNDER_PRESSURE)},
          one sitting, one device. {PLAN_UNDER_PRESSURE.placement}.
        </p>
        <p className="guide-actions">
          <Link className="button button--primary" to="/educator/classes">Create a class</Link>
          <Link className="button button--secondary" to={PLAN_UNDER_PRESSURE.route}>Try it as a student</Link>
          {/* The one way in to the sample class, framed as what it is: real submissions
              built the same way any real class's are, so this button leads to the same
              screens and the same vocabulary a real class uses. */}
          <Link className="button button--secondary" to="/educator/demo">See a sample class</Link>
        </p>
      </header>
      <BriefAnswers />
      <section className="dashboard-section">
        <div className="section-head">
          <h2>Before students begin</h2>
          <p>Teach these first. This is an application task, not a lesson.</p>
        </div>
        <ol className="prerequisite-list">
          <li><span>01</span>Distinguish dependable and conditional income.</li>
          <li><span>02</span>Combine recurring and one-time costs.</li>
          <li><span>03</span>Build a budget that does not exceed available money.</li>
          <li><span>04</span>Separate committed money from money that can change.</li>
          <li><span>05</span>Revise after income or expenses change.</li>
          <li><span>06</span>Explain a trade-off with relevant numbers.</li>
        </ol>
        <p className="companion-callout">
          Schools may use their own instruction. <Link to="/educator/teaching-companion">A two-day sample mini-unit →</Link>
        </p>
      </section>
      <section className="dashboard-section launch-guide">
        <div className="section-head">
          <h2>Running it</h2>
        </div>
        <ol>
          <li><Link to="/educator/classes">Create a class</Link>, paste your class list, print the cards and hand them out. Students type the class code from the board and the code on their card.</li>
          <li>Allow {durationLabel(PLAN_UNDER_PRESSURE)}. Do not coach a financial strategy.</li>
          <li>Read and score the written explanations. Nothing a student writes is machine-scored.</li>
          <li>Open the class: what the evidence shows, and what to teach next.</li>
          <li>Run the debrief with the room.</li>
        </ol>
        <p>
          A high grade reflects the financial skills a student actually showed — not a preference for saving more, spending less,
          taking a job, or choosing the cheapest option.
        </p>
      </section>
      <AlignmentBlock />
    </EducatorShell>
  );
}

export function TeachingCompanion() {
  return (
    <EducatorShell measure="bleed">
      <header className="page-header"><p className="eyebrow">Optional educator resource</p><h1>A two-day mini-unit: budgeting under uncertainty</h1><p>Schools may use their own instruction. This sample sequence shows the prerequisite skills students should learn before Plan Under Pressure. It does not pre-teach Avery's answers.</p></header>
      <div className="mini-unit-grid">
        <article><header><span>Day 01</span><h2>Build a plan from dependable money</h2><p>Example context: Jordan is saving for a robotics camp while earning money from neighborhood jobs.</p></header><ol><li><b>Dependable vs conditional income</b><p>Sort a guaranteed allowance from snow-shoveling money that depends on weather.</p></li><li><b>Recurring + one-time full cost</b><p>Calculate six weeks of bus fare plus a one-time registration fee.</p></li><li><b>A budget that works</b><p>Give every dollar one job across required costs, a goal, a reserve, and flexible cash.</p></li></ol><aside>Exit prompt: “Which dollars can Jordan count on before the weather is known?”</aside></article>
        <article><header><span>Day 02</span><h2>Revise when conditions change</h2><p>Example context: Sam is preparing for a school music showcase with a short paid equipment-helper role.</p></header><ol><li><b>Committed vs adjustable money</b><p>Mark the registration and transit already committed; keep future savings adjustable.</p></li><li><b>Contingency thinking</b><p>Construct a lower-income version without telling students which priority to reduce.</p></li><li><b>Unexpected change</b><p>Add a required repair cost, revise the plan, and explain one trade-off with two numbers.</p></li></ol><aside>Debrief prompt: “How can two different revised plans both be financially coherent?”</aside></article>
      </div>
      <section className="teaching-boundary"><h2>Keep the assessment clean</h2><p>Teach the {TERMS.skills} with different names, amounts, and situations. During the BOW challenge, allow calculators and access tools, but do not tell students which financial strategy to choose.</p><Link className="button button--primary" to="/educator/guide">Return to challenge brief</Link></section>
    </EducatorShell>
  );
}
