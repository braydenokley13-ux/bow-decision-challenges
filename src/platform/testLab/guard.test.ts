import { describe, expect, it } from "vitest";
import { requireResetScope, requireTestLab, requireTestLabCredentials, testLabAllowed } from "./guard";

describe("Test Lab safety gate", () => {
  it("requires the opt-in flag", () => {
    expect(testLabAllowed({ enabled: undefined, origin: "http://127.0.0.1:4173" })).toBe(false);
  });
  it("accepts only local origins by default", () => {
    expect(testLabAllowed({ enabled: "1", origin: "http://localhost:4173" })).toBe(true);
    expect(testLabAllowed({ enabled: "1", origin: "https://challenges.bowsportscapital.com" })).toBe(false);
  });
  it("requires an explicit override for production", () => {
    expect(testLabAllowed({ enabled: "1", origin: "https://challenges.bowsportscapital.com", allowExplicitProductionOverride: true })).toBe(true);
  });
  it("requires the gate before a lab runner can operate", () => {
    expect(() => requireTestLab({ enabled: "0", origin: "http://127.0.0.1:4173" })).toThrow(/Test Lab is disabled/);
  });
  it("keeps local fallback credentials for loopback runs", () => {
    expect(requireTestLabCredentials({
      origin: "http://127.0.0.1:4173",
      fallbackEmail: "test-lab-pfdem@example.invalid",
      fallbackPassword: "test-lab-password-2026",
    })).toEqual({ email: "test-lab-pfdem@example.invalid", password: "test-lab-password-2026" });
  });
  it("requires explicit credentials for remote runs", () => {
    expect(() => requireTestLabCredentials({
      origin: "https://challenges.bowsportscapital.com",
      fallbackEmail: "test-lab-pfdem@example.invalid",
      fallbackPassword: "test-lab-password-2026",
    })).toThrow(/require BOW_TEST_LAB_TEACHER_EMAIL/);
  });
  it("requires explicit credentials when production override is enabled", () => {
    expect(() => requireTestLabCredentials({
      origin: "http://127.0.0.1:4173",
      allowExplicitProductionOverride: true,
      fallbackEmail: "test-lab-pfdem@example.invalid",
      fallbackPassword: "test-lab-password-2026",
    })).toThrow(/require BOW_TEST_LAB_TEACHER_EMAIL/);
  });
  it("rejects predictable credentials for remote or production runs without exposing them", () => {
    expect(() => requireTestLabCredentials({
      origin: "https://challenges.bowsportscapital.com",
      email: "operator@example.invalid",
      password: "test-lab-password-2026",
      fallbackEmail: "unused@example.invalid",
      fallbackPassword: "unused",
    })).toThrow(/predictable or default/);
    expect(() => requireTestLabCredentials({
      origin: "https://challenges.bowsportscapital.com",
      email: "test-lab@example.com",
      password: "correct-horse-battery-staple",
      fallbackEmail: "unused@example.invalid",
      fallbackPassword: "unused",
    })).not.toThrow();
  });
  it("rejects an unscoped reset", () => {
    expect(() => requireResetScope({ kind: "demo", classCode: "" })).toThrow();
    expect(requireResetScope({ kind: "demo", classCode: "PFDEM" })).toEqual({ kind: "demo", classCode: "PFDEM" });
    expect(requireResetScope({ kind: "student", studentId: "seat-1" })).toEqual({ kind: "student", studentId: "seat-1" });
  });
});
