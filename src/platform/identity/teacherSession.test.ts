import { describe, expect, it } from "vitest";
import { handleApiRequest } from "../../../server/handler";
import { memoryStore, type ClassStore } from "../../../server/store";
import { PLAN_UNDER_PRESSURE } from "../challenges/registry";
import type { ClassCreation } from "../classes/types";

/**
 * A teacher ending their own session, and changing their own password.
 *
 * Neither was possible. "Sign out" was `storage()?.removeItem(TOKEN_KEY)` on one browser and
 * nothing else — the token it discarded stayed valid for the rest of its thirty days, and an
 * engineering review probed eight plausible revocation routes and got 404 or 401 on all eight.
 * The same review pointed out what one captured teacher token is worth: `GET /me/teaching`
 * answers it with the long-lived key of every class the account owns. So a token copied off a
 * shared staffroom machine was thirty days of unrevocable access to every class that teacher
 * teaches, and the only lever in the product was `/auth/teacher/recovery`, which needs a code
 * shown once at sign-up months earlier.
 *
 * Students have had this control for as long as `POST /classes/:code/signout` has existed, by
 * the same `sessionGeneration` counter on the same kind of account. These tests are the same
 * assertions the student ones make, for the person with more to lose.
 *
 * The falsification the review wrote is the first `expect` in each test: **a token captured
 * before the action, still answering 200 on `GET /me` after it.**
 */

const NOW = 1_770_000_000_000;

/**
 * The handler, called the way the transport calls it.
 *
 * The query is split off the path here rather than left on the end of it, because
 * `handleApiRequest` splits the path into segments and a `?` left in place becomes part of the
 * last one — which silently turns a probe of `…/roster/1?erase=1` into a probe of a route
 * spelled `1?erase=1`. It answers 403 either way, so the test goes green while testing
 * something else.
 */
function api(store: ClassStore, clientId: string, now = NOW) {
  return (method: string, url: string, body?: unknown, headers: Record<string, string | undefined> = {}) => {
    const [path = url, query = ""] = url.split("?");
    return handleApiRequest(
      { method, path, query, headers, ...(body !== undefined ? { body } : {}), clientId },
      { store, now: () => now },
    );
  };
}

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

async function signedInTeacher(store: ClassStore, clientId: string, email = "ms.reyes@school.example") {
  const call = api(store, clientId);
  const signedUp = await call("POST", "/auth/teacher", { email, password: "a long enough passphrase" });
  expect(signedUp.status, JSON.stringify(signedUp.body)).toBe(201);
  return signedUp.body as { teacher: { id: string }; token: string; recoveryCode: string };
}

describe("a teacher can end every session on their account", () => {
  it("turns a captured token off everywhere, without the recovery code", async () => {
    const store = memoryStore();
    const teacher = await signedInTeacher(store, "signout-1");
    const call = api(store, "signout-1");

    // A second sign-in is the laptop somebody else is holding. Both tokens work.
    const elsewhere = await call("POST", "/auth/teacher/session", { email: "ms.reyes@school.example", password: "a long enough passphrase" });
    const captured = (elsewhere.body as { token: string }).token;
    expect((await call("GET", "/me", undefined, bearer(captured))).status).toBe(200);
    expect((await call("GET", "/me", undefined, bearer(teacher.token))).status).toBe(200);

    // The control, pressed from the browser the teacher still has. No recovery code anywhere.
    const ended = await call("POST", "/auth/teacher/signout", {}, bearer(teacher.token));
    expect(ended.status, JSON.stringify(ended.body)).toBe(200);
    expect((ended.body as { signedOut: boolean }).signedOut).toBe(true);

    // The falsification, in both directions: the captured token, and the one that pressed it.
    expect((await call("GET", "/me", undefined, bearer(captured))).status).toBe(401);
    expect((await call("GET", "/me", undefined, bearer(teacher.token))).status).toBe(401);
  });

  it("closes the door the captured token was actually worth — every class key it could read", async () => {
    const store = memoryStore();
    const teacher = await signedInTeacher(store, "signout-2");
    const call = api(store, "signout-2");
    const created = (await call("POST", "/classes", { label: "Period 3", challengeId: PLAN_UNDER_PRESSURE.id }, bearer(teacher.token))).body as ClassCreation;

    const before = await call("GET", "/me/teaching", undefined, bearer(teacher.token));
    expect((before.body as { classes: { teacherKey: string }[] }).classes[0]?.teacherKey).toBe(created.teacherKey);

    await call("POST", "/auth/teacher/signout", {}, bearer(teacher.token));

    expect((await call("GET", "/me/teaching", undefined, bearer(teacher.token))).status).toBe(401);
    // And the class is untouched: the key still opens it, which is what makes signing out a
    // session control rather than a way to lose a term of work by pressing the wrong button.
    const room = await call("GET", `/classes/${created.code}/submissions`, undefined, { "x-bow-teacher-key": created.teacherKey });
    expect(room.status).toBe(200);
  });

  it("takes a password rather than a bare token", async () => {
    const store = memoryStore();
    await signedInTeacher(store, "signout-3");
    const call = api(store, "signout-3");
    expect((await call("POST", "/auth/teacher/signout", {})).status).toBe(401);
    expect((await call("POST", "/auth/teacher/signout", {}, bearer("not-a-token"))).status).toBe(401);
  });
});

describe("a teacher can change their own password", () => {
  it("ends every other session and leaves the one that changed it working", async () => {
    const store = memoryStore();
    const teacher = await signedInTeacher(store, "password-1");
    const call = api(store, "password-1");

    const elsewhere = await call("POST", "/auth/teacher/session", { email: "ms.reyes@school.example", password: "a long enough passphrase" });
    const captured = (elsewhere.body as { token: string }).token;
    expect((await call("GET", "/me", undefined, bearer(captured))).status).toBe(200);

    const changed = await call(
      "POST", "/auth/teacher/password",
      { currentPassword: "a long enough passphrase", newPassword: "a different long passphrase" },
      bearer(teacher.token),
    );
    expect(changed.status, JSON.stringify(changed.body)).toBe(200);

    // The falsification.
    expect((await call("GET", "/me", undefined, bearer(captured))).status).toBe(401);
    expect((await call("GET", "/me", undefined, bearer(teacher.token))).status).toBe(401);

    // The token that comes back is the one the teacher carries on with, so changing a password
    // does not sign you out of the tab you are typing in.
    const fresh = (changed.body as { token: string }).token;
    expect((await call("GET", "/me", undefined, bearer(fresh))).status).toBe(200);

    // And the new password is the one that works.
    expect((await call("POST", "/auth/teacher/session", { email: "ms.reyes@school.example", password: "a long enough passphrase" })).status).toBe(401);
    expect((await call("POST", "/auth/teacher/session", { email: "ms.reyes@school.example", password: "a different long passphrase" })).status).toBe(200);
  });

  it("needs the current password, and says so without a second window into the account", async () => {
    const store = memoryStore();
    const teacher = await signedInTeacher(store, "password-2");
    const call = api(store, "password-2");

    const wrong = await call(
      "POST", "/auth/teacher/password",
      { currentPassword: "not the passphrase", newPassword: "a different long passphrase" },
      bearer(teacher.token),
    );
    expect(wrong.status).toBe(401);
    // The session is not ended by a wrong guess, and the old password still works.
    expect((await call("GET", "/me", undefined, bearer(teacher.token))).status).toBe(200);
    expect((await call("POST", "/auth/teacher/session", { email: "ms.reyes@school.example", password: "a long enough passphrase" })).status).toBe(200);
  });

  it("holds a new password to the one rule sign-up has, and says what it is", async () => {
    const store = memoryStore();
    const teacher = await signedInTeacher(store, "password-3");
    const call = api(store, "password-3");
    const tooShort = await call(
      "POST", "/auth/teacher/password",
      { currentPassword: "a long enough passphrase", newPassword: "short" },
      bearer(teacher.token),
    );
    expect(tooShort.status).toBe(400);
    expect((tooShort.body as { message: string }).message).toMatch(/10 characters/);
    // Nothing changed, so the session and the password both still work.
    expect((await call("GET", "/me", undefined, bearer(teacher.token))).status).toBe(200);
  });

  it("leaves the recovery code alone, because nothing used it", async () => {
    const store = memoryStore();
    const teacher = await signedInTeacher(store, "password-4");
    const call = api(store, "password-4");
    const changed = await call(
      "POST", "/auth/teacher/password",
      { currentPassword: "a long enough passphrase", newPassword: "a different long passphrase" },
      bearer(teacher.token),
    );
    expect(changed.body).not.toHaveProperty("recoveryCode");
    // The code written down at sign-up still recovers the account. A password change that
    // silently invalidated it would take away the one lever a locked-out teacher has.
    const recovered = await call("POST", "/auth/teacher/recovery", {
      email: "ms.reyes@school.example",
      recoveryCode: teacher.recoveryCode,
      password: "a third long passphrase",
    });
    expect(recovered.status, JSON.stringify(recovered.body)).toBe(200);
  });

  it("refuses a caller with no session, and a student holding a real one", async () => {
    const store = memoryStore();
    const call = api(store, "password-5");
    expect((await call("POST", "/auth/teacher/password", { currentPassword: "x", newPassword: "a long passphrase" })).status).toBe(401);
  });
});
