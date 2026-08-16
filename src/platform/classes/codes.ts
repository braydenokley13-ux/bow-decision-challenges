/**
 * Class codes, and the seat codes students sit down at.
 *
 * A class code gets read aloud, written on a whiteboard, and typed by a room of twelve-year-
 * olds on Chromebook keyboards. The alphabet therefore excludes every pair that survives
 * that trip badly: O and 0, I and 1 and L, S and 5, B and 8, Z and 2. What is left cannot
 * be mistyped into a *different* valid code by one wrong glyph, which matters more than
 * having a large keyspace.
 */
export const CODE_ALPHABET = "ACDEFGHJKMNPQRTUVWXY34679";
export const CODE_LENGTH = 5;

/** Confusable glyphs, folded to the one the alphabet actually uses. */
const FOLD: Record<string, string> = {
  "0": "Q", O: "Q", I: "J", "1": "J", L: "J", "5": "F", S: "F", "8": "H", B: "H", "2": "V", Z: "V",
};

/**
 * What the student typed, turned into what they meant. A code read off a whiteboard as
 * "OH-FIVE" and typed as `05` should reach the class it was read from, not a 404 the
 * teacher has to debug in front of the room.
 */
export function normaliseClassCode(raw: string): string {
  return [...raw.toUpperCase().replace(/[^A-Z0-9]/g, "")]
    .map((character) => FOLD[character] ?? character)
    .join("");
}

export function isWellFormedClassCode(raw: string): boolean {
  const code = normaliseClassCode(raw);
  return code.length === CODE_LENGTH && [...code].every((character) => CODE_ALPHABET.includes(character));
}

/**
 * A fresh code. Randomness comes from the caller so the server can use its own source and
 * the tests can use a sequence — nothing here reaches for a global.
 */
export function generateClassCode(random: () => number = Math.random): string {
  return Array.from({ length: CODE_LENGTH }, () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]).join("");
}

/**
 * Codes are short enough that two classes created in the same minute can collide, so the
 * service generates against a liveness check and gives up loudly rather than silently
 * handing a second class somebody else's code.
 */
export async function allocateClassCode(
  isTaken: (code: string) => Promise<boolean>,
  random: () => number = Math.random,
  attempts = 12,
): Promise<string> {
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const code = generateClassCode(random);
    if (!(await isTaken(code))) return code;
  }
  throw new Error("Could not allocate an unused class code.");
}

/** Seats are typed by students, so they are plain numbers and stay plain numbers. */
export function normaliseSeatCode(raw: string): string {
  return raw.replace(/\D/g, "").replace(/^0+(?=\d)/, "").slice(0, 2);
}

export function isWellFormedSeatCode(raw: string): boolean {
  const seat = normaliseSeatCode(raw);
  return seat.length >= 1 && Number(seat) >= 1 && Number(seat) <= 99;
}

/** The educator's own key. Long enough that a class code cannot be guessed into one. */
export function generateTeacherKey(random: () => number = Math.random): string {
  return Array.from({ length: 24 }, () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)]).join("");
}
