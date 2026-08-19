import { createHmac, randomBytes, randomUUID, scrypt, timingSafeEqual } from "node:crypto";

/**
 * The three primitives an account system cannot be built without, and nothing else.
 *
 * There is no dependency here on purpose. A school product that adds an authentication
 * library adds that library's supply chain to a district's vendor review, and everything
 * below is in Node's standard library: scrypt for the two secrets a person types, HMAC for
 * the token a browser holds, and a constant-time compare so neither can be probed a byte at
 * a time.
 *
 * Nothing in this file knows what a student or a teacher is. It knows about secrets.
 */

/**
 * scrypt at the parameters OWASP still names for interactive logins.
 *
 * N=2^15 costs about 60ms and 32MB per verification on the hardware a small deployment
 * actually runs on, which is the point: it is slow enough that a stolen store is not a
 * password list, and fast enough that a class of thirty signing in inside the same minute
 * does not queue.
 */
const SCRYPT = { N: 32768, r: 8, p: 1, keylen: 32 } as const;

function scryptAsync(secret: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    // maxmem has to be raised explicitly: Node's default rejects N=2^15 rather than
    // running it, and the failure looks like a bad password rather than a bad parameter.
    scrypt(secret.normalize("NFKC"), salt, SCRYPT.keylen, { ...SCRYPT, maxmem: 64 * 1024 * 1024 }, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

/**
 * A stored secret, as one string that carries everything needed to check it.
 *
 * The parameters travel with the hash rather than living in a constant, so raising the cost
 * next year does not invalidate every account created this year — an old hash still says
 * how to verify itself.
 */
export async function hashSecret(secret: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scryptAsync(secret, salt);
  return `scrypt$${SCRYPT.N}$${SCRYPT.r}$${SCRYPT.p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

/**
 * Whether this secret produced that hash.
 *
 * Returns false for a malformed record rather than throwing. A corrupted row is a sign-in
 * that fails, not a service that 500s — and a thrown error here would tell an attacker that
 * the account exists.
 */
export async function verifySecret(secret: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, n, r, p, saltPart = "", keyPart = ""] = parts;
  const salt = Buffer.from(saltPart, "base64url");
  const expected = Buffer.from(keyPart, "base64url");
  if (salt.length === 0 || expected.length === 0) return false;
  const key = await new Promise<Buffer | null>((resolve) => {
    scrypt(
      secret.normalize("NFKC"),
      salt,
      expected.length,
      { N: Number(n), r: Number(r), p: Number(p), maxmem: 256 * 1024 * 1024 },
      (error, derived) => resolve(error ? null : derived),
    );
  });
  return key !== null && constantTimeEquals(key, expected);
}

/**
 * The work a sign-in does when there is no account to check against.
 *
 * A vendor review timed the teacher sign-in and found a wrong password on a real account took
 * **385ms** and a password for an address with no account took **5ms** — both answering 401
 * with the same words. Eighty-three times is not a subtle side channel; it is a directory of
 * every teacher in the district, readable by anybody who can post a form. The one message and
 * one shape this endpoint was careful to give were undone by how long it took to give them.
 *
 * So the no-account branch does the same scrypt the real branch would have done. The decoy
 * hash is computed once, lazily, from a constant nobody can sign in with — its value is
 * irrelevant, because the answer is always false and only the elapsed time matters.
 */
let decoy: Promise<string> | null = null;
export async function burnSecretCheck(secret: string): Promise<false> {
  decoy ??= hashSecret("bow.no-such-account.decoy");
  await verifySecret(secret, await decoy);
  return false;
}

/** Length-safe: `timingSafeEqual` throws on a length mismatch, which is itself a signal. */
export function constantTimeEquals(a: Buffer | string, b: Buffer | string): boolean {
  const left = Buffer.isBuffer(a) ? a : Buffer.from(a, "utf8");
  const right = Buffer.isBuffer(b) ? b : Buffer.from(b, "utf8");
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export interface TokenClaims {
  /** Who this is. A student id or a teacher id — never an email, never a name. */
  sub: string;
  kind: "student" | "teacher";
  /** Seconds since the epoch. Checked here, not by whatever reads the claims. */
  exp: number;
  /**
   * The account's session generation at the moment this was signed.
   *
   * This is what makes a stateless token revocable without a table of live sessions to
   * write on every request. Raising the number on the account invalidates every token ever
   * signed for it, which is exactly the operation a teacher needs when a Chromebook cart
   * goes back on the trolley with thirty sessions still open on it.
   */
  gen: number;
}

/**
 * A session token: the claims, and an HMAC of exactly the bytes that were sent.
 *
 * Deliberately not a JWT. A JWT carries an algorithm field that the verifier is invited to
 * trust, which is the source of the entire `alg: none` family of failures; this format has
 * one algorithm, it is not negotiable, and the verifier never reads anything out of the
 * token before checking the signature over the encoded form.
 *
 * The token carries no name, no email and no class. Everything a surface needs beyond
 * "which account is this" is looked up, so a token that leaks is a session to revoke rather
 * than a disclosure.
 */
export function signToken(claims: TokenClaims, secret: string): string {
  const payload = Buffer.from(JSON.stringify(claims), "utf8").toString("base64url");
  return `${payload}.${createHmac("sha256", secret).update(payload).digest("base64url")}`;
}

export function readToken(token: string, secret: string, now: number): TokenClaims | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  if (!constantTimeEquals(createHmac("sha256", secret).update(payload).digest("base64url"), signature)) return null;
  try {
    const claims: unknown = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!claims || typeof claims !== "object") return null;
    const candidate = claims as TokenClaims;
    if (typeof candidate.sub !== "string" || !candidate.sub) return null;
    if (candidate.kind !== "student" && candidate.kind !== "teacher") return null;
    if (typeof candidate.exp !== "number" || candidate.exp * 1000 <= now) return null;
    if (typeof candidate.gen !== "number") return null;
    return { sub: candidate.sub, kind: candidate.kind, exp: candidate.exp, gen: candidate.gen };
  } catch {
    return null;
  }
}

/** An opaque account id. Not derived from anything about the person. */
export function newId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, "")}`;
}

/**
 * A uniform float from the system CSPRNG, shaped like `Math.random` so it can be handed to
 * code that expects one.
 *
 * It exists because the class code and the teacher key — the two things standing between a
 * stranger and a class of children's work — were being drawn from `Math.random`. V8's
 * generator is xorshift128+, its internal state is recoverable from a short run of outputs,
 * and anybody may create as many classes as they like and read the outputs. A 25^24 key
 * space is not a key space if the sequence producing it can be replayed.
 */
export function cryptoRandom(): number {
  // 6 bytes is 48 bits of entropy per draw: more than the 2^32 a float can carry, and taken
  // in one syscall-free read from the pool rather than one per bit.
  return randomBytes(6).readUIntBE(0, 6) / 2 ** 48;
}

/** A teacher's recovery code. Long, printed once, never shown again. */
export function newRecoveryCode(): string {
  return randomBytes(15).toString("base64url").replace(/[-_]/g, "").slice(0, 20).toUpperCase();
}

/**
 * A blind index for a card code, so finding the seat a card opens is one lookup rather than a
 * scan.
 *
 * Resolving the seat from the card alone is what lets the class door stop publishing the class
 * list — but the credential hash is scrypt at N=2^15, deliberately expensive, and trying it
 * against every row is sixty of those per sign-in. A class of thirty arriving at once turns
 * that into thousands of key derivations on one thread, and the last student in the room waits
 * minutes. So the code also carries a keyed hash, computed once, that says *which row to check*.
 *
 * It is keyed with the store's session secret rather than being a plain digest, so a stolen
 * database alone does not let somebody build a rainbow table over the five-character code
 * space. It is not the credential check and never stands in for one: what it finds is still
 * verified against the scrypt hash before anybody is let in.
 */
export function lookupIndex(secret: string, value: string): string {
  return createHmac("sha256", secret).update(`card:${value.trim().toUpperCase()}`).digest("hex").slice(0, 32);
}
