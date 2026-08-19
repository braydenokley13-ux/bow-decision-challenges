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
 * 1. **Both keys are given explicitly.** Nothing is inferred from the environment the service
 *    happens to be running with.
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
 *
 * Usage, with the service stopped:
 *
 *     node dist-server/rekey.js --from .bow-classes --to .bow-classes.new \
 *       --old-key "$OLD" --new-key "$NEW"
 *
 * `--from-plaintext` opens the source as unsealed JSON instead of with an old key, which is
 * the one-time conversion of a directory written before sealing existed.
 */

const CANARY_FILE = "_vault-check.json";

export interface RekeyOptions {
  from: string;
  to: string;
  /** Opens the source. `null` means the source is plain JSON written before sealing existed. */
  oldKey: Buffer | null;
  newKey: Buffer;
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

/** The command line, kept thin: everything above is testable without a process. */
export async function main(argv: readonly string[]): Promise<number> {
  const arg = (name: string): string | undefined => {
    const at = argv.indexOf(`--${name}`);
    return at >= 0 ? argv[at + 1] : undefined;
  };
  const from = arg("from");
  const to = arg("to");
  const newKey = readStoreKey(arg("new-key"));
  const plaintext = argv.includes("--from-plaintext");
  const oldKey = plaintext ? null : readStoreKey(arg("old-key"));

  if (!from || !to || !newKey || (!plaintext && !oldKey)) {
    process.stderr.write(
      "Re-seal a class store under a new key, with the service stopped.\n\n"
      + "  node dist-server/rekey.js --from <dir> --to <dir> --old-key <key> --new-key <key>\n"
      + "  node dist-server/rekey.js --from <dir> --to <dir> --from-plaintext --new-key <key>\n\n"
      + `${STORE_KEY_HELP}\n\n`
      + "The source directory is never modified. Point the service at --to and the new key when it finishes;\n"
      + "if anything looks wrong, point it back at the old directory and the old key.\n",
    );
    return 2;
  }
  if (relative(from, to) === "") {
    process.stderr.write("--from and --to must be different directories: this never converts in place.\n");
    return 2;
  }
  try {
    await rekeyStore({ from, to, oldKey, newKey, say: (line) => process.stdout.write(`${line}\n`) });
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

// Run when invoked directly, and importable without side effects so the conversion above can
// be tested without a process.
if (process.argv[1]?.endsWith("rekey.js")) {
  void main(process.argv.slice(2)).then((code) => { process.exitCode = code; });
}
