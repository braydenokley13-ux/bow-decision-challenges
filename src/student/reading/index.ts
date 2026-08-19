/**
 * What the run's two shells need, and nothing else.
 *
 * One import, one element. Everything the tools need to know about a screen they read off the
 * page: the `<main>` landmark is the stage, and `screenKey` is the stage's own id, which is
 * what the shells already have in hand.
 */
export { ReadingTools } from "./ReadingTools";
export { GLOSSARY, termsOnScreen, type GlossaryEntry } from "./glossary";
export { forgetPreference } from "./preference";
