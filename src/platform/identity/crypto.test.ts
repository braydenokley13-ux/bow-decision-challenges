import { describe, expect, it } from "vitest";
import { RECOVERY_CODE_ALPHABET, hashSecret, isWellFormedRecoveryCode, newRecoveryCode, verifySecret } from "../../../server/crypto";

describe("recovery material", () => {
  it("generates only values accepted by the recovery-key validator", () => {
    for (let attempt = 0; attempt < 256; attempt += 1) {
      const code = newRecoveryCode();
      expect(code).toHaveLength(20);
      expect(isWellFormedRecoveryCode(code)).toBe(true);
    }
  });

  it("accepts every character in the declared alphabet", () => {
    for (const character of RECOVERY_CODE_ALPHABET) {
      expect(isWellFormedRecoveryCode(character.repeat(8)), `character ${character}`).toBe(true);
    }
  });

  it("rejects a wrong key even when it has the right alphabet and length", async () => {
    const code = newRecoveryCode();
    const hash = await hashSecret(code);
    const wrong = `${code.slice(0, -1)}${code.endsWith("A") ? "B" : "A"}`;
    expect(isWellFormedRecoveryCode(wrong)).toBe(true);
    expect(await verifySecret(wrong, hash)).toBe(false);
    expect(await verifySecret(code, hash)).toBe(true);
  }, 30_000);
});
