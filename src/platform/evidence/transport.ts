import type { ClassErrorCode, ClassRecord, EvidenceSubmission } from "../classes/types";

/**
 * How a student's evidence gets to their teacher.
 *
 * The boundary exists because the answer is different in different rooms. A pilot class
 * runs against the class service. A device with no network still has to finish the
 * challenge and hand the work over somehow. A designer working on the Week 8 screen needs
 * neither. Those are three transports, not three products, and everything above this
 * interface is written once.
 *
 * What a transport may never do is pretend. A transport that cannot deliver says so and
 * offers what it can; none of them may report a delivery that did not happen, because the
 * whole educator surface downstream treats a delivered submission as a fact about a
 * student.
 */
export type TransportId = "classService" | "fileHandoff" | "localOnly";

export interface JoinedClass {
  /** The class as the service knows it, when a service was involved. */
  record: ClassRecord | null;
  /** What the student should be shown as their class. */
  classCode: string;
}

export type JoinResult =
  | { ok: true; joined: JoinedClass }
  | { ok: false; error: ClassErrorCode; message: string };

export type DeliveryResult =
  | { ok: true; at: number }
  | { ok: false; error: ClassErrorCode; message: string; retryable: boolean };

export interface EvidenceTransport {
  readonly id: TransportId;
  /** Whether the student must present a class code that actually resolves before starting. */
  readonly requiresClass: boolean;
  /** What this transport promises the student about where their work goes. */
  readonly promise: string;
  join(classCode: string): Promise<JoinResult>;
  deliver(submission: EvidenceSubmission): Promise<DeliveryResult>;
}

/**
 * Delivery as the student sees it. `failed` carries whether another attempt could work, so
 * the screen can offer "try again" for a dropped network and the file fallback for a class
 * that no longer exists.
 */
export type DeliveryState =
  | { status: "idle" }
  | { status: "sending"; attempt: number }
  | { status: "delivered"; at: number }
  | { status: "failed"; message: string; retryable: boolean };

/**
 * Retry schedule for a submission. A school network drops connections for seconds, not
 * minutes, and a student is sitting in front of the screen — so this backs off quickly and
 * then hands the decision back to them rather than spinning.
 */
export const DELIVERY_BACKOFF_MS = [400, 1200, 3000] as const;

export async function deliverWithRetry(
  transport: EvidenceTransport,
  submission: EvidenceSubmission,
  onState: (state: DeliveryState) => void,
  wait: (ms: number) => Promise<void> = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
): Promise<DeliveryResult> {
  let last: DeliveryResult = { ok: false, error: "unavailable", message: "Not sent yet.", retryable: true };
  for (let attempt = 0; attempt <= DELIVERY_BACKOFF_MS.length; attempt += 1) {
    onState({ status: "sending", attempt: attempt + 1 });
    last = await transport.deliver(submission);
    if (last.ok) {
      onState({ status: "delivered", at: last.at });
      return last;
    }
    // A class that does not exist will not start existing because we asked again.
    if (!last.retryable) break;
    const delay = DELIVERY_BACKOFF_MS[attempt];
    if (delay === undefined) break;
    await wait(delay);
  }
  onState({ status: "failed", message: last.ok ? "" : last.message, retryable: last.ok ? false : last.retryable });
  return last;
}
