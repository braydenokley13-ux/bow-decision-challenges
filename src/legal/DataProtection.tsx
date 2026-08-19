import { Link } from "react-router-dom";
import { AppMark } from "../components/primitives/AppMark";
import {
  CHECKS,
  CONTACT,
  DOORS,
  GAPS,
  INVENTORY,
  NOT_ESTABLISHED,
  NOT_ESTABLISHED_LEDE,
  NOT_HELD,
  PROTECTION,
  RETENTION,
  THIRD_PARTIES,
  THIRD_PARTIES_WOULD_CHANGE,
} from "./notice";
import "./legal.css";

/**
 * The page a vendor review opens, at the addresses a vendor review types.
 *
 * `/privacy`, `/terms`, `/security`, `/dpa` and `/legal` all rendered the front door, because
 * the router sent every unknown address there. A district adoption reviewer went looking for
 * a privacy notice, a data inventory, a subprocessor list, a security overview and a contact,
 * found the marketing headline five times, and wrote: *"There is no document a district can
 * sign, and no surface that would produce one. Not a missing feature — a missing
 * deliverable."* In New York City that is not a negotiation, it is a missing form.
 *
 * This is the deliverable. Everything on it lives in `notice.ts` as data, because a privacy
 * notice nobody checks is the artefact districts have been burned by — so
 * `dataInventory.test.ts` runs every row of the inventory against the handler and a real
 * sealed store, and `noticeRenders.test.tsx` checks that this page still says all of it and
 * that no regulated word has escaped the one section allowed to name any.
 *
 * The tone is a district reviewer's rather than a child's, and the page carries no
 * reassurance it cannot support. Where there is no answer — a contact, an
 * incident-notification commitment — it says there is no answer, because an honest gap beats
 * a fabricated commitment and a fabricated commitment is what gets quoted back at a vendor
 * eighteen months later.
 */
export function DataProtection() {
  return (
    <div className="legal">
      <header className="legal__bar">
        <AppMark />
        <Link to="/educator/guide">For educators</Link>
      </header>
      <main className="legal__page">
        <div className="legal__head">
          <p className="eyebrow">Data protection · privacy · security</p>
          <h1>What BOW holds, and who can open it.</h1>
          <p className="legal__deck">
            Written for the person who decides whether a middle school may run this. Every claim
            below is checked against the code that ships by two tests in this repository, named
            at the bottom. A claim that could not be checked is not on this page.
          </p>
          {/* The frame, first, because the most expensive misunderstanding a document like this
              can create is a reader thinking they have been handed an undertaking. */}
          <p className="legal__note">
            This is a description of what the software does. It is not a contract, not a data
            processing agreement and not a legal determination. No outside party has assessed
            this product, and nothing here says one has — the laws, the frameworks and the
            districts a reviewer will ask about are named under <b>What is not established</b>,
            which is the one part of this product that names any of them.
          </p>
        </div>

        <section className="legal__section" aria-labelledby="inventory">
          <h2 id="inventory">What BOW holds about a child</h2>
          <p className="legal__lede">
            BOW does hold student names, and it holds what students write. Both are said plainly
            here because both are true and because the shape of what is held — a first name
            against a seat in one teacher's class — is the thing worth knowing, not a denial.
          </p>
          <div className="legal__scroll">
            <table className="legal__table">
              <thead>
                <tr><th scope="col">What</th><th scope="col">How it gets here</th><th scope="col">Who can open it</th><th scope="col">How long</th></tr>
              </thead>
              <tbody>
                {INVENTORY.map((row) => (
                  <tr key={row.id} data-row={row.id}>
                    <th scope="row">{row.field}</th>
                    <td>{row.arrives}</td>
                    <td>{row.reader}</td>
                    <td>{row.life}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="legal__section" aria-labelledby="not-held">
          <h2 id="not-held">What it does not hold</h2>
          <ul className="legal__list">
            {NOT_HELD.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </section>

        <section className="legal__section" aria-labelledby="doors">
          <h2 id="doors">Who can open it</h2>
          <dl className="legal__doors">
            {DOORS.map((door) => (
              <div key={door.id} data-door={door.id}>
                <dt>{door.caller}</dt>
                <dd><b>Holding:</b> {door.proof}</dd>
                <dd>{door.opens}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="legal__section" aria-labelledby="protection">
          <h2 id="protection">Where it sits, and what protects it</h2>
          <ul className="legal__list">
            {PROTECTION.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </section>

        <section className="legal__section" aria-labelledby="retention">
          <h2 id="retention">How long it is kept, and what deletion does</h2>
          <ul className="legal__list">
            {RETENTION.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </section>

        <section className="legal__section" aria-labelledby="third-parties">
          <h2 id="third-parties">Who else receives it</h2>
          <ul className="legal__list">
            {THIRD_PARTIES.map((line) => <li key={line}>{line}</li>)}
          </ul>
          <h3>What would have to change for that to stop being true</h3>
          <ul className="legal__list legal__list--tight">
            {THIRD_PARTIES_WOULD_CHANGE.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </section>

        {/* The one section in this product that may name a law, a framework or a district — and
            it may only name them to say nothing has been established. `noticeRenders.test.tsx`
            cuts this element out of the rendered page and fails if any of those words survives
            anywhere else, which is the mechanism that stops a privacy notice becoming the place
            a compliance claim starts. */}
        <section className="legal__section legal__section--gap" id="not-established" aria-labelledby="not-established-heading">
          <h2 id="not-established-heading">What is not established</h2>
          <p className="legal__lede">{NOT_ESTABLISHED_LEDE}</p>
          <dl className="legal__doors">
            {NOT_ESTABLISHED.map((entry) => (
              <div key={entry.id} data-not-established={entry.id}>
                <dt>{entry.name}</dt>
                <dd>{entry.what}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="legal__section legal__section--gap" aria-labelledby="gaps">
          <h2 id="gaps">What a district asks for that this product does not have</h2>
          <ul className="legal__list">
            {GAPS.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </section>

        <section className="legal__section legal__section--gap" aria-labelledby="contact">
          <h2 id="contact">Who to contact, and what happens if something goes wrong</h2>
          <ul className="legal__list">
            {CONTACT.map((line) => <li key={line}>{line}</li>)}
          </ul>
        </section>

        <section className="legal__section" aria-labelledby="checks">
          <h2 id="checks">How to check every line of this yourself</h2>
          <p className="legal__lede">
            None of the above is worth more than what a reviewer can reproduce. Each of these
            takes one request or one file.
          </p>
          <dl className="legal__doors">
            {CHECKS.map((check) => (
              <div key={check.id} data-check={check.id}>
                <dt>{check.question}</dt>
                <dd>{check.how}</dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
