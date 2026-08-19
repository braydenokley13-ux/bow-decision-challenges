import { readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { describe, expect, it } from "vitest";
import { withoutComments } from "../../test/source";
import * as vaultModule from "../../../server/vault";
import type { Vault } from "../../../server/vault";

/**
 * Every vault this codebase exports actually seals.
 *
 * **The defect this exists to stop, found by a security judge as dead code.** `server/vault.ts`
 * exported two factories. One was AES-256-GCM with a fresh IV per record and an authentication
 * tag; the other, `plainVault`, was:
 *
 * ```ts
 * seal: (value) => JSON.stringify(value),
 * ```
 *
 * It was written for the memory store, the memory store never called it, and it survived a
 * release kept alive by `void plainVault;` in `store.ts` — a line whose only job is to stop the
 * linter noticing an unused import. Nothing was ever written in the clear by it. That is not
 * the point: it sat in the one file an engineer opens to find out how children's records are
 * protected, exported, named like the real thing, one autocomplete away from a durable store.
 *
 * Deleting it is a five-line change and would be worth nothing on its own, because the next
 * person who wants a vault for a test writes the same function again. So the rule is checked
 * rather than remembered: **anything this module exports that produces a `Vault` must produce
 * one whose `seal()` output does not contain what was sealed.**
 *
 * The test is over the module's real exports rather than over a list, so a factory added
 * tomorrow is covered on the day it is added — which is the property a list of known-good names
 * does not have, and the reason the dead one lasted as long as it did.
 */

/** A value with a distinctive plaintext in it, so containment is unambiguous. */
const SECRET = "Aiden R — I saved because the bonus was never certain";
const RECORD = { displayName: SECRET, seatCode: "1" };

type Factory = (key: Buffer | string) => Vault;

function vaultFactories(): [string, Factory][] {
  return Object.entries(vaultModule as Record<string, unknown>)
    .filter(([, value]) => typeof value === "function")
    .flatMap(([name, factory]): [string, Factory][] => {
      // A factory is anything that returns an object carrying all three of a vault's methods.
      // Tried with a key of each shape the module's own signatures use, because guessing wrong
      // would silently skip a factory and that is the failure this test exists to prevent.
      for (const key of [randomBytes(32), randomBytes(32).toString("hex")] as const) {
        try {
          const made = (factory as (input: unknown) => unknown)(key);
          if (made && typeof made === "object"
            && typeof (made as Vault).seal === "function"
            && typeof (made as Vault).open === "function"
            && typeof (made as Vault).derive === "function") {
            return [[name, factory as Factory]];
          }
        } catch {
          // Not a vault factory, or not one this key shape fits. Either way, try the next.
        }
      }
      return [];
    });
}

describe("nothing in the vault module hands back records in the clear", () => {
  const factories = vaultFactories();

  it("finds the factory it is written about, so it cannot pass by reading nothing", () => {
    expect(factories.map(([name]) => name)).toContain("vault");
    expect(factories.length).toBeGreaterThan(0);
  });

  it.each(factories.map(([name]) => name))("%s seals what it is given", (name) => {
    const factory = factories.find(([entry]) => entry === name)?.[1];
    expect(factory, name).toBeTypeOf("function");
    const sealed = factory!(randomBytes(32)).seal(RECORD);
    expect(sealed, `${name}.seal() put the plaintext on disk`).not.toContain(SECRET);
    expect(sealed, `${name}.seal() put a field name on disk`).not.toContain("displayName");
  });

  it.each(factories.map(([name]) => name))("%s reads back exactly what it sealed", (name) => {
    // A vault that fails the test above by encrypting to noise it cannot open would be worse
    // than the one it replaced, so the round trip is asserted beside the containment.
    const factory = factories.find(([entry]) => entry === name)?.[1];
    const made = factory!(randomBytes(32));
    expect(made.open(made.seal(RECORD))).toEqual(RECORD);
  });

  it("would catch a vault that stringifies, which is the one that was here", () => {
    // The deleted `plainVault`, restored as a local so the rule can be shown failing.
    const stringifies: Vault = {
      seal: (value) => JSON.stringify(value),
      open: <T,>(raw: string): T | null => JSON.parse(raw) as T,
      derive: () => "irrelevant",
    };
    expect(stringifies.seal(RECORD)).toContain(SECRET);
  });

  it("has no second factory hiding behind a `void` in the store", () => {
    // The line that kept the dead one alive: `void plainVault;` exists only to stop the linter
    // reporting an unused import, so it is exactly how an unused security primitive survives.
    const store = withoutComments(readFileSync("server/store.ts", "utf8"));
    expect(store, "a `void <name>;` in the store is an import kept alive for no reason")
      .not.toMatch(/\bvoid\s+[A-Za-z_$][\w$]*\s*;/);
  });
});
