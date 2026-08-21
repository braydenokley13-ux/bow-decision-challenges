import { requireResetScope, requireTestLab, requireTestLabCredentials } from "../src/platform/testLab/guard";

/** Real-HTTP lab run using normal teacher, class, assignment, roster, join and checkpoint routes. */
const configuredOrigin = process.env.BOW_TEST_LAB_ORIGIN ?? "http://127.0.0.1:4180";
requireTestLab({
  enabled: process.env.BOW_TEST_LAB,
  origin: configuredOrigin,
  allowExplicitProductionOverride: process.env.BOW_TEST_LAB_ALLOW_PRODUCTION === "1",
});

const rawScope = process.argv.find((arg) => arg.startsWith("--scope="))?.slice("--scope=".length);
if (!rawScope) throw new Error("Test Lab needs an explicit --scope=demo:CLASSCODE.");
const [kind, value] = rawScope.split(":", 2);
if (kind !== "demo" || !value) {
  throw new Error("Only demo:CLASSCODE is currently supported: normal student-account deletion is not an API operation.");
}
const scope = requireResetScope({ kind: "demo", classCode: value.toUpperCase() });
const API = `${configuredOrigin.replace(/\/$/, "")}/api`;
const { email, password } = requireTestLabCredentials({
  origin: configuredOrigin,
  allowExplicitProductionOverride: process.env.BOW_TEST_LAB_ALLOW_PRODUCTION === "1",
  email: process.env.BOW_TEST_LAB_TEACHER_EMAIL,
  password: process.env.BOW_TEST_LAB_TEACHER_PASSWORD,
  fallbackEmail: `test-lab-${scope.classCode.toLowerCase()}@example.invalid`,
  fallbackPassword: "test-lab-password-2026",
});

interface Result<T = unknown> { status: number; body: T }
async function request<T>(path: string, init: RequestInit = {}): Promise<Result<T>> {
  const response = await fetch(`${API}${path}`, { ...init, headers: { "content-type": "application/json", ...(init.headers ?? {}) } });
  const text = await response.text();
  let body: unknown = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path} -> ${response.status}: ${JSON.stringify(body)}`);
  return { status: response.status, body: body as T };
}

type TeacherAuth = { token: string };
type Teaching = { classes: Array<{ code: string; teacherKey: string }> };
type Card = { seatCode: string; joinCode: string };
const authHeaders = (token: string) => ({ authorization: `Bearer ${token}` });
const keyHeaders = (key: string) => ({ "x-bow-teacher-key": key });

async function teacherSession(): Promise<string> {
  try {
    return (await request<TeacherAuth>("/auth/teacher/session", { method: "POST", body: JSON.stringify({ email, password }) })).body.token;
  } catch (error) {
    if (!(error instanceof Error) || !error.message.includes("401")) throw error;
    return (await request<TeacherAuth>("/auth/teacher", { method: "POST", body: JSON.stringify({ email, password }) })).body.token;
  }
}

const teacherToken = await teacherSession();
const teaching = await request<Teaching>("/me/teaching", { headers: authHeaders(teacherToken) });
const existing = teaching.body.classes.find((entry) => entry.code === scope.classCode);
if (existing) await request(`/classes/${scope.classCode}`, { method: "DELETE", headers: keyHeaders(existing.teacherKey) });

const created = await request<{ code: string; teacherKey: string }>("/classes", {
  method: "POST", headers: authHeaders(teacherToken),
  body: JSON.stringify({ code: scope.classCode, label: "Test Lab scoped class", challengeId: "plan-under-pressure" }),
});
const classCode = created.body.code;
const ownerHeaders = { ...authHeaders(teacherToken), ...keyHeaders(created.body.teacherKey) };
const assignmentBody = (world: string) => ({
  objectiveRef: { frameworkId: "nysed-pf-2026", code: "1.3" }, allowedWorldIds: [world], studentChoosesWorld: false,
  closingQuestion: { text: "What would you change?", required: false },
});
await request(`/classes/${classCode}/assignments`, { method: "POST", headers: ownerHeaders, body: JSON.stringify(assignmentBody("basketball")) });
await request(`/classes/${classCode}/assignments`, { method: "POST", headers: ownerHeaders, body: JSON.stringify(assignmentBody("food-truck")) });
const roster = await request<{ cards: Card[] }>(`/classes/${classCode}/roster`, { method: "POST", headers: ownerHeaders, body: JSON.stringify({ names: ["Test Lab Student"] }) });
const card = roster.body.cards[0];
if (!card) throw new Error("The normal roster route returned no card.");
const joined = await request<{ token: string; studentId: string; seatCode: string }>(`/classes/${classCode}/join`, { method: "POST", body: JSON.stringify({ joinCode: card.joinCode, device: "shared" }) });
const assignments = await request<{ assignments: Array<{ id: string }> }>(`/classes/${classCode}/assignments`);
await request(`/me/attempt`, {
  method: "PUT", headers: authHeaders(joined.body.token),
  body: JSON.stringify({ classCode, worldId: "basketball", stage: "choose-world", sessionId: "testlab-session-1", assignmentId: assignments.body.assignments[0]?.id, payload: { testLab: true } }),
});

const observed = await request<{ class: unknown; assignments: unknown[]; roster: unknown[]; progress: unknown[]; submissions: unknown[] }>(`/classes/${classCode}/submissions`, { headers: ownerHeaders });
const checks = {
  class: observed.body.class !== null,
  assignments: observed.body.assignments.length === 2,
  roster: observed.body.roster.length === 1,
  progress: observed.body.progress.length === 1,
  submissions: Array.isArray(observed.body.submissions),
};
if (Object.values(checks).some((value) => !value)) throw new Error(`Test Lab state verification failed: ${JSON.stringify(checks)}`);
console.log(JSON.stringify({ ok: true, origin: configuredOrigin, resetScope: `${scope.kind}:${scope.classCode}`, operations: ["teacher-session", "scoped-class-delete", "class-create", "second-assignment", "roster", "student-join", "student-checkpoint"], verified: checks }, null, 2));
