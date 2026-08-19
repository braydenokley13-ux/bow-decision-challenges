import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "node:crypto";

/**
 * What a durable store writes, and what it refuses to write.
 *
 * A vendor review found the file store putting children's names, every class's teacher key,
 * and the HMAC secret every session token is signed with on disk as plain JSON. One disk
 * image, one stray backup, one restored volume: every class's names and evidence, plus the
 * ability to mint a valid token for anybody in the deployment. There was nothing between
 * "read a file" and "own the district".
 *
 * So a durable store seals every value it writes, and a deployment that has not been given a
 * key does not start. That is deliberately not a warning: encryption of student data "in its
 * custody" is an affirmative obligation under New York Education Law §2-d, and a product that
 * quietly runs without it hands a district a problem the district cannot see. The failure mode
 * of refusing to boot is a message in a log; the failure mode of the alternative is a breach
 * notification.
 *
 * AES-256-GCM, a fresh 96-bit IV per record, the tag stored beside it. Authenticated, so a
 * record edited on disk fails to open rather than opening as something else — which matters
 * here because these files are read back as authorisation decisions, not only as content.
 *
 * That last sentence was false for one release and a second vendor review found it. `open()`
 * passed any record that was not a sealed envelope straight through as plain JSON, so the
 * seal protected confidentiality and nothing else: an attacker who could *write* one file —
 * a read-write mount, a co-tenant, a restore host, an insider — replaced a sealed teacher
 * record with a plaintext one carrying a password hash of their choosing, signed in, and read
 * the whole evidence room decrypted. No key required. Tamper-evidence you can turn off by
 * writing plaintext is not tamper-evidence.
 *
 * So a keyed vault now refuses an unsealed record. The migration case it existed for is real
 * and still served, but by an operator turning it on for one boot (`acceptLegacyPlaintext`)
 * rather than by every deployment accepting forged records forever.
 *
 * The session secret is derived from the same key rather than stored, so it exists in memory
 * and in the operator's secret manager and nowhere else. A file nobody writes is a file
 * nobody can steal.
 */

const SEALED = 1;
const IV_BYTES = 12;

export interface Vault {
  /** The bytes to put on disk for one record. */
  seal(value: unknown): string;
  /** A record back, or null if it was not written by this key. */
  open<T>(raw: string): T | null;
  /** A purpose-separated secret derived from the same key. Never written anywhere. */
  derive(purpose: string): string;
  /**
   * Whether the migration door is open on this vault.
   *
   * Read by the health endpoint so an operator who opened it for a boot and forgot cannot
   * leave a deployment reading unsealed records for a term without the one screen they check
   * saying so.
   */
  readonly migrating: boolean;
}

interface SealedRecord { v: number; iv: string; tag: string; ct: string }

function isSealed(value: unknown): value is SealedRecord {
  const record = value as SealedRecord | null;
  return record !== null && typeof record === "object"
    && record.v === SEALED && typeof record.iv === "string" && typeof record.tag === "string" && typeof record.ct === "string";
}

/**
 * A key, as an operator supplies it: 32 bytes, base64 or hex.
 *
 * Deliberately not a passphrase run through a KDF. A passphrase field invites a passphrase,
 * and the honest instruction for a school district's operations team is one line of `openssl`
 * whose output is unguessable, not a memorable word with a stretching function behind it.
 */
export function readStoreKey(raw: string | undefined): Buffer | null {
  if (!raw) return null;
  for (const encoding of ["base64", "hex"] as const) {
    try {
      const bytes = Buffer.from(raw.trim(), encoding);
      if (bytes.length === 32) return bytes;
    } catch { /* try the next encoding */ }
  }
  return null;
}

/** What an operator is told when the key is missing or the wrong length. Used in one place. */
export const STORE_KEY_HELP =
  "Set BOW_STORE_KEY to 32 random bytes, base64 or hex — `openssl rand -base64 32`. "
  + "It encrypts every record this store writes and derives the session-signing secret, so keep it "
  + "in the same place as your other secrets, keep a copy, and do not put it in the data directory. "
  + "Losing it means losing every class; changing it means every existing class becomes unreadable.";

/**
 * `acceptLegacyPlaintext` is the one-boot migration door, and it is off unless an operator
 * opens it. While it is open the store will read records nobody's key wrote, which is exactly
 * the property that makes it useful for converting a pre-encryption directory and exactly the
 * property that makes it a forgery window. It belongs to a maintenance window, not to a
 * default.
 */
export function vault(key: Buffer, options: { acceptLegacyPlaintext?: boolean } = {}): Vault {
  return {
    migrating: options.acceptLegacyPlaintext === true,
    seal(value) {
      const iv = randomBytes(IV_BYTES);
      const cipher = createCipheriv("aes-256-gcm", key, iv);
      const ct = Buffer.concat([cipher.update(JSON.stringify(value), "utf8"), cipher.final()]);
      return JSON.stringify({
        v: SEALED,
        iv: iv.toString("base64"),
        tag: cipher.getAuthTag().toString("base64"),
        ct: ct.toString("base64"),
      } satisfies SealedRecord);
    },
    open<T>(raw: string): T | null {
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return null;
      }
      // Not sealed by anybody. Refused, because these records are read back as authorisation
      // decisions: a teacher record decides who opens an evidence room, and a roster entry
      // decides whose seat a child is sitting in. A deployment converting a pre-encryption
      // directory opens the door deliberately, for as long as that takes.
      if (!isSealed(parsed)) return options.acceptLegacyPlaintext ? (parsed as T) : null;
      try {
        const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(parsed.iv, "base64"));
        decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
        const plain = Buffer.concat([decipher.update(Buffer.from(parsed.ct, "base64")), decipher.final()]);
        return JSON.parse(plain.toString("utf8")) as T;
      } catch {
        // A wrong key or a tampered record. Answering `null` is the same as answering "no such
        // record", which is the right answer: a file that will not authenticate is not evidence.
        return null;
      }
    },
    derive(purpose) {
      return createHmac("sha256", key).update(`bow.derive.v1.${purpose}`).digest("base64url");
    },
  };
}

/** A vault that seals nothing, for the memory store, where there is no disk to protect. */
export function plainVault(secret: string): Vault {
  return {
    migrating: false,
    seal: (value) => JSON.stringify(value),
    open: <T,>(raw: string): T | null => { try { return JSON.parse(raw) as T; } catch { return null; } },
    derive: (purpose) => createHmac("sha256", secret).update(`bow.derive.v1.${purpose}`).digest("base64url"),
  };
}
