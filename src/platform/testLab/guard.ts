/** Safety rails for the internal test lab. These are deliberately pure so the lab runner and
 * its tests enforce the same policy without adding a test-only server endpoint. */

export type TestLabResetScope = { kind: "demo"; classCode: string } | { kind: "student"; studentId: string };

export type TestLabCredentials = { email: string; password: string };

function isLoopbackOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "[::1]";
  } catch {
    return false;
  }
}

export function testLabAllowed(input: {
  enabled: string | undefined;
  origin: string;
  allowExplicitProductionOverride?: boolean;
}): boolean {
  if (input.enabled !== "1") return false;
  if (input.allowExplicitProductionOverride) return true;
  return isLoopbackOrigin(input.origin);
}

export function requireTestLab(input: Parameters<typeof testLabAllowed>[0]): void {
  if (!testLabAllowed(input)) {
    throw new Error("Test Lab is disabled. Set BOW_TEST_LAB=1 and use a local lab origin (or an explicit production override).");
  }
}

/**
 * Resolve the teacher credentials for a lab run. Local runs retain their harmless
 * .invalid/password fallbacks, but remote or explicitly overridden runs must use
 * operator-provided credentials and may not use those predictable values.
 */
export function requireTestLabCredentials(input: {
  origin: string;
  allowExplicitProductionOverride?: boolean;
  email?: string;
  password?: string;
  fallbackEmail: string;
  fallbackPassword: string;
}): TestLabCredentials {
  const requiresExplicitCredentials = input.allowExplicitProductionOverride === true || !isLoopbackOrigin(input.origin);
  const email = input.email ?? input.fallbackEmail;
  const password = input.password ?? input.fallbackPassword;

  if (!requiresExplicitCredentials) return { email, password };
  if (!input.email || !input.password) {
    throw new Error("Test Lab remote/production runs require BOW_TEST_LAB_TEACHER_EMAIL and BOW_TEST_LAB_TEACHER_PASSWORD.");
  }

  const predictable = (value: string) => /(?:@example\.invalid$|test-lab-password-2026$)/i.test(value);
  if (predictable(input.email) || predictable(input.password)) {
    throw new Error("Test Lab remote/production runs reject predictable or default teacher credentials.");
  }
  return { email, password };
}

/** Reset only a named lab namespace; broad or empty reset targets are rejected. */
export function requireResetScope(scope: TestLabResetScope): TestLabResetScope {
  if (scope.kind === "demo" && /^[A-Z0-9]{4,12}$/.test(scope.classCode)) return scope;
  if (scope.kind === "student" && /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/.test(scope.studentId)) return scope;
  throw new Error("Test Lab reset needs an explicit demo class code or student id.");
}
