import { isWellFormedClassCode, normaliseClassCode } from "../classes/codes";
import { studentAuthHeaders } from "../identity/token";
import { CLASS_ERROR_MESSAGES, isClassError, type Assignment, type ClassErrorCode, type ClassRecord, type EvidenceSubmission } from "../classes/types";
import type { EvidenceTransport, JoinResult, DeliveryResult } from "./transport";

/**
 * The two build-time switches this module reads. Declared rather than reached for, because
 * this file is compiled both for the browser (where `import.meta.env` exists) and for the
 * node project that typechecks the class service beside it (where it does not).
 */
interface BuildEnvironment {
  VITE_CLASS_API?: string;
  VITE_EVIDENCE_TRANSPORT?: string;
}

function buildEnvironment(): BuildEnvironment {
  return ((import.meta as unknown as { env?: BuildEnvironment }).env) ?? {};
}

/** Where the class API lives. Same origin in production; the dev server proxies /api. */
export const CLASS_API_BASE = buildEnvironment().VITE_CLASS_API ?? "/api";

async function call(path: string, init: RequestInit = {}): Promise<{ status: number; body: unknown } | null> {
  try {
    const response = await fetch(`${CLASS_API_BASE}${path}`, {
      ...init,
      // Signed in as themselves, on every call. A class with a roster refuses work that
      // cannot say who sent it, and the request carrying twenty-five minutes of a student's
      // run is the last place to discover that. Absent on a class with no roster and on a
      // build with no service, where it is simply not sent.
      headers: { "Content-Type": "application/json", ...studentAuthHeaders(), ...(init.headers ?? {}) },
    });
    const text = await response.text();
    return { status: response.status, body: text ? JSON.parse(text) : null };
  } catch {
    // A thrown fetch is the network, not the service. The caller retries these.
    return null;
  }
}

function errorFrom(result: { status: number; body: unknown } | null): { error: ClassErrorCode; message: string; retryable: boolean } {
  if (!result) return { error: "unavailable", message: CLASS_ERROR_MESSAGES.unavailable, retryable: true };
  if (isClassError(result.body)) {
    const code = result.body.error;
    // 5xx is the service having a bad moment; 4xx is a fact about this request that
    // another attempt cannot change.
    return { error: code, message: CLASS_ERROR_MESSAGES[code] ?? result.body.message, retryable: result.status >= 500 };
  }
  return { error: "unavailable", message: CLASS_ERROR_MESSAGES.unavailable, retryable: result.status >= 500 };
}

/**
 * The pilot transport. A class code resolves against a real class, and finished work is
 * posted to it — so what the educator opens afterwards is what the students did.
 */
export function classServiceTransport(): EvidenceTransport {
  return {
    id: "classService",
    requiresClass: true,
    promise: "Your work goes to your teacher’s class when you turn it in.",
    join: async (raw): Promise<JoinResult> => {
      const classCode = normaliseClassCode(raw);
      if (!isWellFormedClassCode(classCode)) {
        return { ok: false, error: "class_not_found", message: CLASS_ERROR_MESSAGES.class_not_found };
      }
      const result = await call(`/classes/${classCode}`);
      if (result?.status === 200) {
        const body = result.body as ClassRecord & { assignments?: readonly Assignment[] };
        return { ok: true, joined: { record: body, classCode, assignments: body.assignments ?? [] } };
      }
      return { ok: false, ...errorFrom(result) };
    },
    deliver: async (submission): Promise<DeliveryResult> => {
      const result = await call(`/classes/${submission.classCode}/submissions`, {
        method: "POST",
        body: JSON.stringify(submission),
      });
      if (result && result.status >= 200 && result.status < 300) return { ok: true, at: Date.now() };
      return { ok: false, ...errorFrom(result) };
    },
  };
}

/**
 * The fallback when there is no service to reach: the student's evidence becomes a file
 * they can hand over. It is not the pilot path and it does not pretend to be — it exists so
 * a room that loses its network does not lose a lesson's work.
 */
export function fileHandoffTransport(download: (name: string, contents: string) => void): EvidenceTransport {
  return {
    id: "fileHandoff",
    requiresClass: false,
    promise: "Your work saves to this computer as a file you can give your teacher.",
    join: (raw): Promise<JoinResult> => Promise.resolve({ ok: true, joined: { record: null, classCode: normaliseClassCode(raw), assignments: [] } }),
    deliver: (submission: EvidenceSubmission): Promise<DeliveryResult> => {
      download(`bow-${submission.classCode || "class"}-seat-${submission.seatCode}.json`, JSON.stringify(submission, null, 2));
      return Promise.resolve({ ok: true, at: Date.now() });
    },
  };
}

/**
 * Nothing leaves the machine. For design work and for a student trying the challenge
 * outside a class — it says so rather than implying a teacher is waiting at the other end.
 */
export function localOnlyTransport(): EvidenceTransport {
  return {
    id: "localOnly",
    requiresClass: false,
    promise: "Your work stays on this computer. Nothing is sent anywhere.",
    join: (raw): Promise<JoinResult> => Promise.resolve({ ok: true, joined: { record: null, classCode: normaliseClassCode(raw), assignments: [] } }),
    deliver: (): Promise<DeliveryResult> => Promise.resolve({ ok: true, at: Date.now() }),
  };
}

function browserDownload(name: string, contents: string): void {
  const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Which transport this build uses. The class service unless a build explicitly asks for
 * something else, because a pilot that silently fell back to keeping evidence on the
 * student's own laptop would look identical to one that worked.
 */
export function transportFromEnvironment(mode = buildEnvironment().VITE_EVIDENCE_TRANSPORT): EvidenceTransport {
  if (mode === "localOnly") return localOnlyTransport();
  if (mode === "fileHandoff") return fileHandoffTransport(browserDownload);
  return classServiceTransport();
}
