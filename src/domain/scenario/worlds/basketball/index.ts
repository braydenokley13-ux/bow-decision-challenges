/**
 * Basketball's public surface: the story, and only the story.
 *
 * Every screen that renders Avery's season imports from here, and nothing it imports pulls
 * the competency layer in behind it. The observer next door is the assessment edge — the
 * one file in this directory that knows evidence requirements exist — and it is imported
 * directly by the code that scores an attempt, so the student bundle never carries it.
 */
export { BASKETBALL_SCENARIO } from "./scenario";
