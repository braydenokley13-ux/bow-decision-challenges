/**
 * The words this run uses that a twelve-year-old stops at.
 *
 * Every entry here was taken off a screen, not out of a vocabulary list. Two complete
 * playthroughs — Eight Weeks to the Showcase and Run the Pop-Up, both worlds end to end —
 * were read line by line, and what is below is what a Grade 5 reader, or a reader working in
 * their second language, has to already know before the decision the screen is asking about
 * is the only thing left in their way.
 *
 * **The register.** The run's own hint ladder says *"Too low. That is fewer than 8 weeks of
 * it."* — one short sentence naming the fact, then at most one more naming what it costs.
 * These definitions are written the same way. Nothing here congratulates anybody, softens
 * anything, or explains that a word is difficult.
 *
 * **No amounts.** Not one definition carries a figure, even where a figure would be shorter.
 * `src/domain/scenario/pricing.test.ts` exists because a screen that spells a price the
 * scenario owns is a screen that lies the day the scenario is re-priced, and a glossary is a
 * screen. *A tray is a fixed number of plates* is worse prose than the number and it is still
 * true after the market is re-priced.
 *
 * **What is deliberately not here.**
 *
 * The brief that asked for this named nine load-bearing terms: conditional money, required
 * costs, committed money, balance, cushion, standing order, remainder, deposit, contingency.
 * Four of them — *conditional*, *committed*, *remainder*, *contingency* — are not words this
 * product says to a student anywhere, and *standing order* and *balance* are not either. That
 * is the product's plain register working: it says *money with a rule on it*, *money already
 * spoken for*, *what is left*, *backup money*, *one order covers both nights*, and *every
 * dollar has a job*. Defining a word the run never uses would put a second vocabulary in front
 * of a child who is already carrying one. `glossary.test.ts` holds that line: every form below
 * has to appear in copy a student actually reads, or the suite fails.
 */

export interface GlossaryEntry {
  /** The word as the run writes it, and how the panel lists it. */
  term: string;
  /**
   * Every shape the screens actually use, the term included. Matched whole-word and
   * case-insensitively, so `count on` finds *counted on* only if *counted on* is listed.
   * A form that no screen says is a form `glossary.test.ts` fails on.
   */
  forms: readonly string[];
  /** What it means. Two sentences at most, and no figures. */
  meaning: string;
  /** Which story says it. `both` where the two worlds share the word. */
  where: "both" | "basketball" | "food-truck";
}

/**
 * Ordered as a person would look for them: what money is, then what it is promised to, then
 * the two worlds' own machinery, then the words that describe how a night or a season came
 * out. The panel re-orders by where each word sits on the screen the student is on, so this
 * order is what a reader meets only in the full list.
 */
export const GLOSSARY: readonly GlossaryEntry[] = [
  // --- Money, and whether you actually have it -----------------------------
  {
    term: "count on",
    forms: ["count on", "counts on", "counted on", "counting on", "count on it"],
    meaning: "To plan on money before it has arrived. If it never arrives, the plan is short by that much.",
    where: "both",
  },
  {
    term: "a rule on it",
    forms: ["a rule on it", "a bonus rule is met", "money with a rule on it", "tied to"],
    meaning: "Money that arrives only if something else happens first. Until it happens you do not have it.",
    where: "both",
  },
  {
    term: "bonus",
    forms: ["bonus", "bonuses"],
    meaning: "Extra money paid only if a rule is met. Miss the rule and none of it is paid, not part of it.",
    where: "basketball",
  },
  {
    term: "savings",
    forms: ["savings", "already saved"],
    meaning: "Money kept from before this season. It is already there and nothing has to happen for it to arrive.",
    where: "basketball",
  },
  {
    term: "base pay",
    forms: ["base pay"],
    meaning: "The pay that arrives every week for work already agreed. It does not depend on how the season goes.",
    where: "basketball",
  },
  {
    term: "after taxes",
    forms: ["after taxes", "taxes"],
    meaning: "Money the government takes out of pay before it reaches you. Pay after taxes is what actually arrives.",
    where: "basketball",
  },
  {
    term: "owe",
    forms: ["owe", "owes", "owed"],
    meaning: "To have to pay money to somebody else. What you owe comes out whether you planned for it or not.",
    where: "both",
  },
  {
    term: "left to plan with",
    forms: ["left to plan with", "left for avery to decide"],
    meaning: "The money you can still choose about, once everything already promised has come out of it.",
    where: "both",
  },
  {
    term: "in hand",
    forms: ["in hand"],
    meaning: "Money you have right now, rather than money you are expecting.",
    where: "both",
  },
  {
    term: "takings",
    forms: ["takings"],
    meaning: "Everything customers handed over. What it cost to earn has not come out of it yet.",
    where: "food-truck",
  },
  {
    // The one word in this world a student cannot get past without losing the assessment.
    // Saturday 4 is deliberately not a number: the organiser gives a low and a high, and the
    // whole judgement of that night is what you cook when nobody can tell you the answer.
    // A student who reads "range" as "about that many" plans for one number and is measured
    // on planning for two.
    term: "range",
    forms: ["range", "a range", "the range", "top of the range"],
    meaning: "Two numbers with the real one somewhere between them. Nobody knows which yet, so a plan has to work at the low end and the high end.",
    where: "food-truck",
  },

  // --- Money that is already promised --------------------------------------
  {
    term: "spoken for",
    forms: ["spoken for"],
    meaning: "Already promised to something. Money that is spoken for is not yours to move.",
    where: "basketball",
  },
  {
    term: "rent",
    forms: ["rent"],
    meaning: "Money paid over and over for the use of a place or a thing somebody else owns.",
    where: "both",
  },
  {
    term: "fee",
    forms: ["fee"],
    meaning: "Money charged for doing a job or providing a service.",
    where: "basketball",
  },
  {
    term: "shift",
    forms: ["shift"],
    meaning: "A block of hours somebody is paid to work.",
    where: "both",
  },
  {
    term: "the same pot",
    forms: ["the same pot"],
    meaning: "One amount of money that several different things all have to come out of.",
    where: "basketball",
  },
  {
    term: "stretch to",
    forms: ["stretch to"],
    meaning: "To be enough for. Money that does not stretch to three things pays for two of them.",
    where: "food-truck",
  },
  {
    term: "the basics",
    forms: ["the basics", "weekly basics"],
    meaning: "Food, phone and laundry. They leave the account every week whatever else is happening.",
    where: "basketball",
  },
  {
    term: "required",
    forms: ["required"],
    meaning: "Something you have to pay for whether you planned for it or not.",
    where: "basketball",
  },
  {
    term: "already spent",
    forms: ["already spent", "locked in", "lock it in", "now locked in"],
    meaning: "Paid, and not coming back. It cannot be moved to anything else however much you need it.",
    where: "both",
  },
  {
    term: "cover",
    forms: ["cover", "covers", "covered"],
    meaning: "To pay for something in full.",
    where: "both",
  },
  {
    term: "share",
    forms: ["share", "your share", "travel share"],
    meaning: "The part of a cost that is yours when several people pay for one thing together.",
    where: "both",
  },
  {
    term: "chip in",
    forms: ["chips in"],
    meaning: "Each person pays part of the same cost.",
    where: "food-truck",
  },

  // --- The plan itself -----------------------------------------------------
  {
    term: "a job",
    forms: ["a job", "no job", "every dollar a job"],
    meaning: "A dollar has a job when you have said what it is for. The plan does not close while any dollar has none.",
    where: "both",
  },
  {
    term: "freed",
    forms: ["freed"],
    meaning: "Taken back off a line so it can pay for something else instead.",
    where: "food-truck",
  },
  {
    term: "still to find",
    forms: ["still to find"],
    meaning: "The plan is short by this much. It has to come out of something already in the plan.",
    where: "both",
  },
  {
    term: "backup money",
    forms: ["backup money"],
    meaning: "Money kept aside in case something goes wrong. Until something does, it is doing nothing else.",
    where: "basketball",
  },
  {
    term: "sports-media course",
    forms: ["sports-media course", "sports-media"],
    meaning: "A course in how sport is filmed, written about and talked about. It is the thing this plan is saving for.",
    where: "basketball",
  },
  {
    term: "rides and rest",
    forms: ["rides and rest"],
    meaning: "Money for getting places, and for a body that needs to recover. Every part of it buys hours back in Avery's week.",
    where: "basketball",
  },
  {
    term: "cushion",
    forms: ["cushion"],
    meaning: "Cash kept in the box instead of spent. It is what pays for something breaking.",
    where: "food-truck",
  },
  {
    term: "stock",
    forms: ["stock", "the stock line", "stock line"],
    meaning: "The money that buys food to sell. What it does not pay for, the truck cannot cook.",
    where: "food-truck",
  },
  {
    term: "your cut",
    forms: ["your cut"],
    meaning: "The money you keep for yourself at the end of the run. Nobody sets it for you.",
    where: "food-truck",
  },
  {
    term: "banked",
    forms: ["banked"],
    meaning: "Put away and kept. Money banked at the end is money the run did not eat.",
    where: "food-truck",
  },
  {
    term: "spare",
    forms: ["spare", "spare room"],
    meaning: "Not being used by anybody. A spare room is a room nobody sleeps in.",
    where: "both",
  },

  // --- Prices, deals and deadlines -----------------------------------------
  {
    term: "terms",
    forms: ["terms", "the terms"],
    meaning: "What you have to pay, and when. Two places can cost the same over a season and ask for it differently.",
    where: "basketball",
  },
  {
    term: "sublet",
    forms: ["sublet"],
    meaning: "A place rented from somebody who is renting it themselves.",
    where: "basketball",
  },
  {
    term: "reserve",
    forms: ["reserve", "reserve it", "reserved", "reserving"],
    meaning: "To pay now so a place is held for you. The money stops being yours to move.",
    where: "basketball",
  },
  {
    term: "the seat",
    forms: ["the seat"],
    meaning: "A place on the course, held for one person.",
    where: "basketball",
  },
  {
    term: "full price",
    forms: ["full price", "full-cost"],
    meaning: "The whole price, with nothing taken off for deciding early.",
    where: "basketball",
  },
  {
    term: "deposit",
    forms: ["deposit"],
    meaning: "Money paid early and held by the other side. It comes off what you still owe.",
    where: "food-truck",
  },
  {
    term: "permit",
    forms: ["permit", "city permit"],
    meaning: "What the city charges for the right to trade. Every stall pays it and none of it comes back.",
    where: "food-truck",
  },
  {
    term: "dearest",
    forms: ["dearest"],
    meaning: "The most expensive.",
    where: "food-truck",
  },

  // --- The market ----------------------------------------------------------
  {
    term: "booth",
    forms: ["booth"],
    meaning: "The space you rent at the market. It costs more where more people walk past it.",
    where: "food-truck",
  },
  {
    term: "stall",
    forms: ["stall", "stalls"],
    meaning: "A trader's stand at a market. Every stall on the row pays the same permit.",
    where: "food-truck",
  },
  {
    term: "organiser",
    forms: ["organiser"],
    meaning: "The person who runs the market, prices the booths and pays out at the end.",
    where: "food-truck",
  },
  {
    term: "crowd",
    forms: ["crowd"],
    meaning: "How many people come past your booth and might buy. It is different every Saturday.",
    where: "food-truck",
  },
  {
    term: "tray",
    forms: ["tray", "trays"],
    meaning: "How the supplier sells food. A tray is a fixed number of plates, and trays do not come in halves.",
    where: "food-truck",
  },
  {
    term: "the order",
    forms: ["the order"],
    meaning: "The food you ask the supplier for before the doors open. What you order is what you have that night.",
    where: "food-truck",
  },
  {
    term: "sold out",
    forms: ["sold out", "sell out", "clears everything"],
    meaning: "Every plate you cooked was sold. Nothing was left to throw away.",
    where: "food-truck",
  },
  {
    term: "in the bin",
    forms: ["in the bin", "went in the bin"],
    meaning: "Food you cooked and nobody bought. You paid for it either way.",
    where: "food-truck",
  },
  {
    term: "rebate",
    forms: ["rebate"],
    meaning: "Money handed back off a price once you have done the thing it was promised for.",
    where: "food-truck",
  },
  {
    term: "generator",
    forms: ["generator"],
    meaning: "The machine that makes electricity where there is no socket. No generator, no cooking.",
    where: "food-truck",
  },
  {
    term: "the swap",
    forms: ["the swap"],
    meaning: "Trading the dead generator for a working one, and the bill for doing it.",
    where: "food-truck",
  },
  {
    term: "seal",
    forms: ["seal"],
    meaning: "The rubber strip that makes a lid close tight. A box with no seal does not stay cold.",
    where: "food-truck",
  },
  {
    term: "perished",
    forms: ["perished"],
    meaning: "Gone hard and cracked with age. Rubber that has perished no longer seals.",
    where: "food-truck",
  },
  {
    term: "settle up",
    forms: ["settles up"],
    meaning: "To pay what is owed at the end and work out who is left with what.",
    where: "food-truck",
  },

  // --- The season ----------------------------------------------------------
  {
    term: "showcase",
    forms: ["showcase"],
    meaning: "The event at the end of the season that scouts come to watch. The whole season is aimed at it.",
    where: "basketball",
  },
  {
    term: "qualify",
    forms: ["qualifies"],
    meaning: "To do well enough to be let in. The team qualifies for the showcase or it does not.",
    where: "basketball",
  },
  {
    term: "making the cut",
    forms: ["making the cut"],
    meaning: "Being picked for something. Nothing about it is decided by Avery.",
    where: "basketball",
  },
  {
    term: "attendance",
    forms: ["attendance", "perfect attendance"],
    meaning: "Being at every session. The attendance bonus is paid only if none is missed.",
    where: "basketball",
  },
  {
    term: "clinic",
    forms: ["clinic", "clinics"],
    meaning: "A short coaching session for younger players. Coaching them pays, and it takes the Saturday.",
    where: "basketball",
  },
  {
    term: "brace",
    forms: ["brace"],
    meaning: "A support strapped on to hold an injured joint still while it heals.",
    where: "basketball",
  },
  {
    term: "rehab",
    forms: ["rehab"],
    meaning: "Treatment after an injury, at set times every week until the injury heals.",
    where: "basketball",
  },
  {
    term: "physio",
    forms: ["physio"],
    meaning: "Treatment for a body that is hurt or worn out. It costs money and it takes hours out of the week.",
    where: "basketball",
  },
  {
    term: "off-site",
    forms: ["off-site"],
    meaning: "Somewhere other than the usual place, so getting there costs time as well as money.",
    where: "basketball",
  },
  {
    term: "paid off",
    forms: ["paid off"],
    meaning: "Was worth doing. What the decision cost came back.",
    where: "both",
  },
  {
    term: "fell short",
    forms: ["fell short"],
    meaning: "Did not reach far enough to do what it was meant to do.",
    where: "both",
  },
  {
    term: "absorbed",
    forms: ["absorbed"],
    meaning: "Taken by something else. Backup money that absorbed a loss is money that went on covering it.",
    where: "basketball",
  },
  {
    term: "uncovered",
    forms: ["uncovered"],
    meaning: "Left with no money to pay for it.",
    where: "basketball",
  },
];

/** Apostrophes come in two shapes on these screens. Matching should not care which. */
function flatten(text: string): string {
  return text.toLowerCase().replace(/[’ʼ]/g, "'").replace(/\s+/g, " ");
}

/**
 * Whether a form appears in a run of text as a whole word.
 *
 * Whole-word on both ends, so *cover* does not match *covered* unless *covered* is listed,
 * and *stock* does not fire on *stockings*. Hyphens count as part of a word, which is what
 * makes *off-site* findable and stops *site* matching inside it.
 */
export function formAppearsIn(form: string, text: string): boolean {
  const flat = flatten(text);
  const needle = flatten(form);
  let from = 0;
  for (;;) {
    const at = flat.indexOf(needle, from);
    if (at < 0) return false;
    const before = flat[at - 1];
    const after = flat[at + needle.length];
    const edge = (character: string | undefined) => character === undefined || !/[a-z0-9'-]/.test(character);
    if (edge(before) && edge(after)) return true;
    from = at + 1;
  }
}

/** The first place in `text` a form of this entry appears, or -1. */
export function firstMentionOf(entry: GlossaryEntry, text: string): number {
  const flat = flatten(text);
  let earliest = -1;
  for (const form of entry.forms) {
    if (!formAppearsIn(form, text)) continue;
    const at = flat.indexOf(flatten(form));
    if (at >= 0 && (earliest === -1 || at < earliest)) earliest = at;
  }
  return earliest;
}

/**
 * The entries one story is allowed to show.
 *
 * Two words in this run mean different things in the two worlds, and a panel that did not know
 * which story it was in would answer the wrong one. *The order* is a food order at the market
 * and it is the cheapest-first ranking in the season — a student ranking three places who
 * opened the panel was told an order is what you ask the supplier for. *Cut* is the same trap
 * in reverse: *your cut* is your share of the takings, and *making the cut* is being picked.
 *
 * The world is read off the page rather than passed in: both shells already put `data-world`
 * on the element the stage sits inside, which is what makes the wiring a single element with
 * no props about worlds in it.
 */
export function glossaryFor(world: string | null | undefined, glossary: readonly GlossaryEntry[] = GLOSSARY): readonly GlossaryEntry[] {
  if (world !== "basketball" && world !== "food-truck") return glossary;
  return glossary.filter((entry) => entry.where === "both" || entry.where === world);
}

/**
 * The entries this screen actually uses, in the order the screen says them.
 *
 * Ordering by first mention is the whole point of the panel: a student who opens it while
 * stuck on *what does Avery already owe* meets *spoken for* first, not an alphabet starting
 * at *absorbed*. Everything else is still reachable, one disclosure away.
 */
export function termsOnScreen(text: string, glossary: readonly GlossaryEntry[] = GLOSSARY): readonly GlossaryEntry[] {
  return glossary
    .map((entry) => ({ entry, at: firstMentionOf(entry, text) }))
    .filter((hit) => hit.at >= 0)
    .sort((a, b) => a.at - b.at)
    .map((hit) => hit.entry);
}
