import type { ClassCreation } from "../platform/classes/types";

/**
 * The classes this browser knows the key for.
 *
 * There are no educator accounts, which is the right trade for a first pilot — but it means
 * the teacher key exists in exactly one place, and if a teacher loses it there is nothing to
 * recover it from. Remembering it here turns "bookmark this link or lose the class" into an
 * ordinary return visit, and `forgetClass` exists so a shared staffroom machine can be
 * cleared deliberately rather than by clearing everything.
 */
const KEY = "bow.educator.v1.classes";

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

export function rememberedClasses(storage?: Pick<Storage, "getItem">): RememberedClass[] {
  return read(storage).sort((a, b) => b.createdAt - a.createdAt);
}

export function rememberClass(record: RememberedClass, storage: Storage = window.localStorage): void {
  const kept = read(storage).filter((entry) => entry.code !== record.code);
  write([{ code: record.code, label: record.label, teacherKey: record.teacherKey, createdAt: record.createdAt }, ...kept].slice(0, 40), storage);
}

/** The key for one class, when a teacher arrives without it in the URL. */
export function keyForClass(code: string, storage?: Pick<Storage, "getItem">): string | null {
  return read(storage).find((entry) => entry.code === code)?.teacherKey ?? null;
}

export function forgetClass(code: string, storage: Storage = window.localStorage): void {
  write(read(storage).filter((entry) => entry.code !== code), storage);
}
