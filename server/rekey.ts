import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative } from "node:path";
import { readStoreKey, STORE_KEY_HELP, vault, type Vault } from "./vault";

/**
 * Re-seal a class store under a new key, offline.
 *
 * This exists because losing or changing `BOW_STORE_KEY` meant losing every class, and a
 * security reviewer named that the sharpest operational risk left in the product: not a
 * blocker, because the 120-day retention horizon bounds it and the loss is now loud rather
 * than silent, but not something that survives a large district asking *"what do you do if
 * that key is compromised?"* — because the honest answer was "we delete a term of children's
 * work".
 *
 * It is also the answer to the other thing they asked for. A runtime flag that let the store
 * read records nobody's key had sealed existed for one commit; open, it was not a read
 * affordance but a full authorization bypass — a plaintext teacher record with a chosen
 * password hash signed in and got a valid token. A conversion belongs to a maintenance window
 * with the service stopped, not to a running service willing to be asked.
 *
 * The six properties a district should be able to ask for in writing, each of which this
 * command has rather than promises:
 *
 * 1. **Both keys are given explicitly, and neither is ever on the command line.** Nothing is
 *    inferred from the environment the service happens to be running with: `BOW_STORE_KEY` is
 *    not read here, and the two keys are named for this run — in `BOW_OLD_STORE_KEY` and
 *    `BOW_NEW_STORE_KEY`, in a key file, or on standard input. They were taken on argv for one
 *    release and a vendor review read both of them out of `ps` while a conversion ran: the
 *    kernel hands `/proc/<pid>/cmdline` to every process on the host and keeps
 *    `/proc/<pid>/environ` to the owner, and *either* of these keys decrypts the whole store
 *    and derives the token-signing secret. That put the crown jewels in the process table for
 *    the length of a maintenance window, in a product whose service had already got this
 *    right.
 * 2. **Nothing is mutated in place.** The source directory is opened read-only and is exactly
 *    as it was when this finishes, whether it succeeds or fails.
 * 3. **Every record is verified, not a sample.** Each written file is read back under the new
 *    key and the digest of its decrypted content compared with the source's. One mismatch and
 *    the run refuses to complete.
 * 4. **The canary is planted last**, so a half-finished directory cannot look complete: the
 *    service refuses to start against a store whose canary does not open.
 * 5. **It is reversible.** Point the service back at the old directory and the old key.
 * 6. **It is resumable and idempotent.** A crash mid-run leaves a directory that is behind,
 *    never one that neither key opens; running it again finishes the job.
 * 7. **It refuses a destination it did not write.** Records in `--to` that the source cannot
 *    account for belong to some other store under some other key — a previous conversion, a
 *    mistyped path — and they survive a run unreadable while the canary in (4) reports the
 *    directory fine. Present-but-unreadable behind a green light is the failure the canary
 *    exists to prevent, so this is checked before the first write and `--force` is what an
 *    operator who means it types.
 *
 * Usage, with the service stopped:
 *
 *     BOW_OLD_STORE_KEY=… BOW_NEW_STORE_KEY=… \
 *       node dist-server/rekey.js --from .bow-classes --to .bow-classes.new
 *
 * or `--old-key-file` / `--new-key-file <path>`, where `-` reads standard input. There is no
 * `--old-key`/`--new-key`: see property 1, and `--help`, which prints all of this to somebody
 * who is doing it at seven in the morning. `--from-plaintext` opens the source as unsealed
 * JSON instead of with an old key, which is the one-time conversion of a directory written
 * before sealing existed.
 */

const CANARY_FILE = "_vault-check.json";

export interface RekeyOptions {
  from: string;
  to: string;
  /** Opens the source. `null` means the source is plain JSON written before sealing existed. */
  oldKey: Buffer | null;
  newKey: Buffer;
  /**
   * Convert into a `--to` that already holds records this run did not write, leaving them
   * exactly as they are. Refusing is the default because what survives is unreadable and
   * nothing downstream says so — see property 7.
   */
  force?: boolean;
  /** Where progress goes. Silent in tests unless one is passed. */
  say?: (line: string) => void;
}

export interface RekeyResult {
  converted: number;
  skipped: number;
  /** Paths, relative to the source, that could not be opened with the key given. */
  unreadable: readonly string[];
}

/** Every `.json` under a directory, relative to it, depth-first and in a stable order. */
async function everyRecord(root: string, at = ""): Promise<string[]> {
  let names: string[];
  try {
    names = (await readdir(join(root, at))).sort();
  } catch {
    return [];
  }
  const found: string[] = [];
  for (const name of names) {
    const here = at ? join(at, name) : name;
    const info = await stat(join(root, here));
    if (info.isDirectory()) found.push(...await everyRecord(root, here));
    else if (name.endsWith(".json")) found.push(here);
  }
  return found;
}

/**
 * A digest of what a record *means*, not of how it was written.
 *
 * Two seals of the same value differ byte for byte — a fresh IV every time, which is the
 * point — so verification has to compare decrypted content. `JSON.stringify` of a parsed
 * value is stable enough here because every record in this store is written by
 * `JSON.stringify` in the first place, so key order is the order it already had.
 */
function digestOf(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export async function rekeyStore(options: RekeyOptions): Promise<RekeyResult> {
  const say = options.say ?? (() => {});
  // The source is opened with whatever it was written with. `acceptLegacyPlaintext` is used
  // here and nowhere else in the product: an offline pass over a directory an operator has
  // named, once, is a different thing from a running service willing to trust unsealed bytes.
  const opener: Vault = options.oldKey
    ? vault(options.oldKey)
    : vault(options.newKey, { acceptLegacyPlaintext: true });
  const sealer = vault(options.newKey);

  const records = (await everyRecord(options.from)).filter((path) => path !== CANARY_FILE);
  say(`${records.length} records under ${options.from}`);

  // What is already in the destination that the source cannot account for, asked before
  // anything is written.
  //
  // A conversion writes the records the source holds and nothing else, so anything else here
  // came from a different store under a different key — a rekey that was pointed at the wrong
  // directory, a half-finished one somebody restarted with a different key. Those records
  // survive the run, the canary below is planted over the top of them, and the service then
  // starts, reports `storeKey: ok`, and answers 404 for classes that are sitting right there.
  // That is the silent failure behind a green light the canary exists to prevent, arriving by
  // the one door the canary does not watch.
  //
  // A destination this run is *resuming* is not a stranger: every path in it is a path in the
  // source, which is what keeps property 6 true. The canary is excluded because this run
  // rewrites it last in any case.
  const fromSource = new Set(records);
  const strangers = (await everyRecord(options.to)).filter((path) => path !== CANARY_FILE && !fromSource.has(path));
  if (strangers.length > 0 && !options.force) {
    throw new Error(
      `${strangers.length} record(s) already in ${options.to} are not in ${options.from}, starting with ${strangers[0]}. `
      + "A conversion writes only what the source holds, so those would stay sealed under whatever key wrote them while "
      + `${options.to} reported itself healthy. Nothing has been written. Point --to at an empty directory, or pass `
      + "--force to convert into this one and leave them exactly as they are.",
    );
  }
  if (strangers.length > 0) {
    say(
      `${strangers.length} record(s) in ${options.to} are not from ${options.from} and are being left exactly as they `
      + `are (--force), starting with ${strangers[0]}. The new key does not open them.`,
    );
  }

  let converted = 0;
  let skipped = 0;
  const unreadable: string[] = [];

  for (const path of records) {
    const raw = await readFile(join(options.from, path), "utf8");
    const value = opener.open<unknown>(raw);
    if (value === null) {
      // A record the given key does not open. Named rather than skipped, and fatal below:
      // finishing a conversion that silently dropped somebody's class is worse than failing.
      unreadable.push(path);
      continue;
    }
    const target = join(options.to, path);
    // Resumable: a record already written and already verifying is left alone, so a second
    // run after a crash finishes rather than restarts.
    try {
      const already = sealer.open<unknown>(await readFile(target, "utf8"));
      if (already !== null && digestOf(already) === digestOf(value)) {
        skipped += 1;
        continue;
      }
    } catch { /* not written yet */ }

    await mkdir(dirname(target), { recursive: true });
    // Written to a temporary name and renamed, so a crash between the two leaves the previous
    // state rather than half a record — the same rule the store itself follows.
    const staging = `${target}.rekey.tmp`;
    await writeFile(staging, sealer.seal(value), "utf8");
    await rename(staging, target);

    // Verified by reading back what was actually written, under the new key, and comparing
    // the meaning rather than the bytes. Every record, not a sample.
    const back = sealer.open<unknown>(await readFile(target, "utf8"));
    if (back === null || digestOf(back) !== digestOf(value)) {
      await rm(target, { force: true });
      throw new Error(`Re-sealed record did not read back the same: ${path}. Nothing in ${options.from} was changed.`);
    }
    converted += 1;
  }

  if (unreadable.length > 0) {
    throw new Error(
      `${unreadable.length} record(s) could not be opened with the key given, starting with ${unreadable[0]}. `
      + `Nothing in ${options.from} was changed and ${options.to} is incomplete — delete it and try the right key.`,
    );
  }

  // Last, deliberately. The service refuses to start against a store whose canary does not
  // open, so a run that dies before this point leaves a directory that announces itself as
  // unfinished rather than one that looks converted.
  await mkdir(options.to, { recursive: true });
  await writeFile(join(options.to, CANARY_FILE), sealer.seal("bow.vault.canary.v1"), "utf8");
  say(`${converted} converted, ${skipped} already done. ${options.from} is untouched.`);
  return { converted, skipped, unreadable };
}

/** The variable each key is named in. Not `BOW_STORE_KEY`: property 1, and the note in `USAGE`. */
const KEY_VARIABLE = { old: "BOW_OLD_STORE_KEY", new: "BOW_NEW_STORE_KEY" } as const;

/**
 * Everything the command needs from the process, so `main` can be run without one.
 *
 * Standard input is a function rather than a string because asking for it blocks: a key is
 * read from it only when the operator said `-`, and a run that was not given `-` must not
 * sit there waiting for a terminal that has nothing to say.
 */
export interface RekeyIo {
  env: Record<string, string | undefined>;
  readStdin: () => Promise<string>;
  out: (text: string) => void;
  err: (text: string) => void;
}

const USAGE =
  "Re-seal a class store under a new key, with the service stopped.\n\n"
  + "  BOW_OLD_STORE_KEY=… BOW_NEW_STORE_KEY=… node dist-server/rekey.js --from <dir> --to <dir>\n"
  + "  node dist-server/rekey.js --from <dir> --to <dir> --old-key-file <path> --new-key-file <path>\n"
  + "  node dist-server/rekey.js --from <dir> --to <dir> --from-plaintext --new-key-file -\n\n"
  + "Each key, whichever of these two suits the host:\n"
  + "  BOW_OLD_STORE_KEY, BOW_NEW_STORE_KEY   32 bytes each, base64 or hex\n"
  + "  --old-key-file, --new-key-file <path>  a file holding one key; \"-\" reads standard input\n\n"
  + "There is no --old-key or --new-key, deliberately. A key on the command line is readable by every\n"
  + "process on the host — `ps -eo args`, /proc/<pid>/cmdline — for as long as the conversion runs, and\n"
  + "either of these keys decrypts the whole store and derives the session-signing secret. An environment\n"
  + "variable is not: the kernel keeps /proc/<pid>/environ to the process owner, which is why the service\n"
  + "reads its own key that way. BOW_STORE_KEY is not read here at all — both keys are named for this run.\n\n"
  + "  --from-plaintext   the source is unsealed JSON, written before sealing existed (no old key)\n"
  + "  --force            convert into a --to that already holds records this conversion did not write\n"
  + "  --help             this\n\n"
  + "The source directory is never modified. Point the service at --to and the new key when it finishes;\n"
  + "if anything looks wrong, point it back at the old directory and the old key.\n\n"
  + `${STORE_KEY_HELP}\n`;

/**
 * One key, from wherever the operator put it — or the sentence to print instead of running.
 *
 * Both sources are ones the operating system keeps to the process owner. A file is the better
 * of the two for a runbook, because an environment variable set on the command line is still
 * in a shell history file afterwards and a key file can be `chmod 600` and deleted.
 */
async function keyFor(
  role: "old" | "new",
  arg: (name: string) => string | undefined,
  io: RekeyIo,
): Promise<Buffer | string> {
  const variable = KEY_VARIABLE[role];
  const path = arg(`${role}-key-file`);
  const fromEnvironment = io.env[variable];
  if (fromEnvironment && path) return `The ${role} key is in both ${variable} and --${role}-key-file. Give it once.`;
  if (!fromEnvironment && !path) {
    return `No ${role} key. Set ${variable}, or pass --${role}-key-file <path> (or - to read it from standard input).`;
  }
  let raw = fromEnvironment;
  if (path) {
    try {
      raw = path === "-" ? await io.readStdin() : await readFile(path, "utf8");
    } catch {
      return `Could not read the ${role} key from ${path === "-" ? "standard input" : path}.`;
    }
  }
  return readStoreKey(raw)
    ?? `The ${role} key is not 32 bytes of base64 or hex. \`openssl rand -base64 32\` prints one.`;
}

/** The command line, kept thin: everything above is testable without a process. */
export async function main(argv: readonly string[], io: RekeyIo = processIo()): Promise<number> {
  const arg = (name: string): string | undefined => {
    const at = argv.indexOf(`--${name}`);
    if (at >= 0) return argv[at + 1];
    // `--name=value` as well, because a key file path is the kind of thing an operator writes
    // that way and being told "no old key" when they gave one is the worst message here.
    return argv.find((entry) => entry.startsWith(`--${name}=`))?.slice(name.length + 3);
  };
  if (argv.includes("--help") || argv.includes("-h")) {
    io.out(USAGE);
    return 0;
  }

  // The two flags this command used to take. Refused by name rather than quietly dropped,
  // because the operator following an old runbook needs to be told what to type now — and told
  // that the key they just typed has already been through the process table and their shell
  // history, so it is not the secret they think it is.
  if ((["old", "new"] as const).some((role) => argv.some((entry) => entry === `--${role}-key` || entry.startsWith(`--${role}-key=`)))) {
    io.err(
      "--old-key and --new-key are gone. A key on the command line is readable by every process on the host\n"
      + "(`ps -eo args`, /proc/<pid>/cmdline) for as long as the conversion runs, and either of these keys\n"
      + "decrypts the whole store and derives the session-signing secret.\n\n"
      + "Treat any key on this command line as exposed: it is in the process table and in your shell history.\n"
      + "Then re-run it the way below.\n\n"
      + USAGE,
    );
    return 2;
  }

  const from = arg("from");
  const to = arg("to");
  if (!from || !to) {
    io.err(USAGE);
    return 2;
  }
  if (relative(from, to) === "") {
    io.err("--from and --to must be different directories: this never converts in place.\n");
    return 2;
  }
  if (arg("old-key-file") === "-" && arg("new-key-file") === "-") {
    io.err("Standard input carries one key, not two. Put the other in an environment variable or a file.\n");
    return 2;
  }

  const plaintext = argv.includes("--from-plaintext");
  const newKey = await keyFor("new", arg, io);
  const oldKey = plaintext ? null : await keyFor("old", arg, io);
  if (typeof newKey === "string" || typeof oldKey === "string") {
    const problems = [newKey, oldKey].filter((value): value is string => typeof value === "string");
    io.err(`${problems.join("\n")}\n\n${USAGE}`);
    return 2;
  }

  try {
    await rekeyStore({
      from, to, oldKey, newKey,
      force: argv.includes("--force"),
      say: (line) => io.out(`${line}\n`),
    });
    return 0;
  } catch (error) {
    io.err(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

/** The real process, in one place, so nothing above has to reach for a global. */
function processIo(): RekeyIo {
  return {
    env: process.env,
    readStdin: async () => {
      const chunks: Buffer[] = [];
      for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
      return Buffer.concat(chunks).toString("utf8");
    },
    out: (text) => { process.stdout.write(text); },
    err: (text) => { process.stderr.write(text); },
  };
}

// Run when invoked directly, and importable without side effects so the conversion above can
// be tested without a process.
if (process.argv[1]?.endsWith("rekey.js")) {
  void main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
