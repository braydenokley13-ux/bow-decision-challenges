// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { ObjectiveList } from "./ObjectivePages";
import { isAssessable, standardsIn, topicsIn } from "../domain/standards";

/**
 * The question a teacher asks before any of the twenty-three.
 *
 * *Is there anything here for the unit I am teaching next month?* A scheme of work is built
 * out of NYSED's topics, and this page listed objectives — so answering it meant opening every
 * row under a topic and counting. Four of the five topics have nothing in them today, and a
 * teacher could reach the end of the list without that being said once.
 *
 * The sentence is derived from the same predicate as the column beside each row, and this is
 * what holds the two together: the topics it names are read here out of the framework rather
 * than typed into the test, so a world that closes a topic removes it from the sentence and
 * from this expectation in the same commit.
 */

afterEach(cleanup);

const FRAMEWORK = "nysed-pf-2026" as const;

/** Topics with no objective BOW can assess — computed the way the page computes it. */
function emptyTopicNames(): string[] {
  const standards = standardsIn(FRAMEWORK);
  return topicsIn(FRAMEWORK)
    .filter((topic) => !standards.some((standard) =>
      standard.topicCode === topic.code && isAssessable({ frameworkId: FRAMEWORK, code: standard.code })))
    .map((topic) => topic.name);
}

describe("the objectives page and the teacher's own year", () => {
  it("names every topic BOW cannot assess anything in", () => {
    render(<MemoryRouter><ObjectiveList /></MemoryRouter>);
    const empty = emptyTopicNames();
    expect(empty.length, "if this is 0 the sentence is gone and so is the reason for it").toBeGreaterThan(0);
    const sentence = screen.getByText(/Nothing in/);
    for (const name of empty) expect(sentence).toHaveTextContent(name);
  });

  it("names no topic a teacher can set something from", () => {
    render(<MemoryRouter><ObjectiveList /></MemoryRouter>);
    const covered = topicsIn(FRAMEWORK)
      .map((topic) => topic.name)
      .filter((name) => !emptyTopicNames().includes(name));
    expect(covered.length, "every topic is empty, which is a different product to describe").toBeGreaterThan(0);
    const sentence = screen.getByText(/Nothing in/);
    for (const name of covered) {
      expect(sentence, `${name} has an assessable objective and is listed as having none`).not.toHaveTextContent(name);
    }
  });

  it("uses the framework's own topic names, in the framework's own order", () => {
    // NYSED presents its topics alphabetically, which puts Earning Income at 3 and Saving and
    // Investing at 5. Earlier mockups had those swapped, and a New York teacher spots it.
    render(<MemoryRouter><ObjectiveList /></MemoryRouter>);
    const sentence = screen.getByText(/Nothing in/).textContent ?? "";
    const positions = emptyTopicNames().map((name) => sentence.indexOf(name));
    expect(positions.every((at) => at >= 0), "a topic name in the sentence is not the framework's").toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });
});
