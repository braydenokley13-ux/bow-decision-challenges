import type { ClassCreation } from "../platform/classes/types";

/**
 * The classes this browser knows the key for.
 *
 * There are educator accounts now, and a class a signed-in teacher creates is theirs on any
 * machine — `GET /me/teaching` lists them. This is what is left underneath that: a class made
 * without signing in exists as a code and a key and nothing else, and a teacher who loses the
 * key has nothing to recover it from. Remembering it here turns "bookmark this link or lose
 * the class" into an ordinary return visit, and `forgetClass` exists so a shared staffroom
 * machine can be cleared deliberately rather than by clearing everything.
 */
const KEY = "bow.educator.v1.classes";

/**
 * Keys this browser has been handed but has not yet opened a class with.
 *
 * A teacher's private link is the only thing that opens a class, and until now it lived in
 * the address bar — on the roster, which is every child's name, and on a student's evidence,
 * which is their writing. An engineering review drove that in a browser and logged
 * `page.url()` with the key in it while the names were on screen. `Referrer-Policy` is the
 * right mitigation for the leak path somebody thought about; it does nothing about the
 * projector the screen is on, the history on a shared staffroom machine, or a platform access
 * log.
 *
 * So the key is taken out of the URL on arrival and filed here, and the address bar is
 * rewritten. That has to happen *before* the URL is rewritten and it has to happen for a
 * class this browser has never seen, which is why it cannot simply be `rememberClass`: the
 * class list wants a label and a creation date, and a bookmark carries neither. A row in the
 * list with a blank name, made out of a key that may not even open anything, is a different
 * defect. This holds the key on its own until the class actually loads, at which point
 * `rememberClass` files the real record over the top.
 */
const KEYS = "bow.educator.v1.keys";

export type RememberedClass = Pick<ClassCreation, "code" | "label" | "teacherKey" | "createdAt">;

function read(storage: Pick<Storage, "getItem"> = window.localStorage): RememberedClass[] {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(KEY) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is RememberedClass =>
      typeof entry === "object" && entry !== null
      && typeof (entry as RememberedClass).code === "string"
      && typeof (entry as RememberedClass).teacherKey === "string");
  } catch {
    return [];
  }
}

function write(records: RememberedClass[], storage: Pick<Storage, "setItem"> = window.localStorage): void {
  storage.setItem(KEY, JSON.stringify(records));
}

type KeyBook = Record<string, string>;

function readKeys(storage: Pick<Storage, "getItem"> = window.localStorage): KeyBook {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(KEYS) ?? "{}");
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    const book: KeyBook = {};
    for (const [code, value] of Object.entries(parsed)) {
      if (typeof value === "string") book[code] = value;
    }
    return book;
  } catch {
    return {};
  }
}

export function rememberedClasses(storage?: Pick<Storage, "getItem">): RememberedClass[] {
  return read(storage).sort((a, b) => b.createdAt - a.createdAt);
}

export function rememberClass(record: RememberedClass, storage: Storage = window.localStorage): void {
  const kept = read(storage).filter((entry) => entry.code !== record.code);
  write([{ code: record.code, label: record.label, teacherKey: record.teacherKey, createdAt: record.createdAt }, ...kept].slice(0, 40), storage);
}

/**
 * File a key handed over by a link, and say whether it is safe to stop carrying it in the URL.
 *
 * The return value is the whole point. A browser with `localStorage` blocked — a district
 * policy, a private window — cannot keep this, and stripping the key from the address bar
 * there would lock a teacher out of their own class with no way back. So it reads the key
 * back out and only claims success if it is really there.
 */
export function rememberKey(code: string, teacherKey: string, storage: Storage = window.localStorage): boolean {
  try {
    const book = readKeys(storage);
    if (book[code] === teacherKey) return true;
    // Bounded, oldest-first, for the same reason the class list is: a shared staffroom browser
    // should not accumulate every key it has ever been shown.
    const entries = Object.entries(book).slice(-39);
    storage.setItem(KEYS, JSON.stringify({ ...Object.fromEntries(entries), [code]: teacherKey }));
    return readKeys(storage)[code] === teacherKey;
  } catch {
    return false;
  }
}

/**
 * The key for one class, when a teacher arrives without it in the URL.
 *
 * The class list first, because that is the record a teacher can see and manage; the key book
 * second, for a class opened from a link that has not loaded yet or never loaded at all.
 */
export function keyForClass(code: string, storage?: Pick<Storage, "getItem">): string | null {
  return read(storage).find((entry) => entry.code === code)?.teacherKey ?? readKeys(storage)[code] ?? null;
}

export function forgetClass(code: string, storage: Storage = window.localStorage): void {
  write(read(storage).filter((entry) => entry.code !== code), storage);
  try {
    const book = readKeys(storage);
    delete book[code];
    storage.setItem(KEYS, JSON.stringify(book));
  } catch { /* nothing to forget if there is nowhere to forget it from */ }
}

/**
 * Everything this browser knows about every class, gone.
 *
 * "Forget these classes on this computer" used to walk the list and forget each one, which
 * leaves behind any key filed from a link whose class never loaded — a key for a class that
 * is not on the list is exactly the thing a teacher cannot see to forget. On a shared
 * staffroom machine, the control that says it clears this browser has to clear this browser.
 */
export function forgetEveryClass(storage: Storage = window.localStorage): void {
  try {
    storage.removeItem(KEY);
    storage.removeItem(KEYS);
  } catch { /* nothing to forget if there is nowhere to forget it from */ }
}
