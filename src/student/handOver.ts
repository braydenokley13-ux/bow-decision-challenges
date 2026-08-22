import { clearEveryAttempt } from "../domain/io/persistence";
import { forgetEveryClosingDraft } from "./closingQuestion";
import { forgetStudent } from "./session";

/**
 * The one meaning of "somebody else is using this computer" in every world.
 *
 * Attempts include each world's ordinary local drafts. Closing-question drafts live beside
 * those attempts and need their own clear. The session token goes too, but the opaque marker
 * saying whose work used to be here deliberately remains: it is how the next sign-in can tell
 * the same student returning from a different student arriving (see `token.ts`).
 */
export function handOverStudentDevice({
  release = () => {},
  redirect = (path: string) => window.location.assign(path),
}: {
  release?: () => void;
  redirect?: (path: string) => void;
} = {}): void {
  clearEveryAttempt();
  forgetEveryClosingDraft();
  release();
  forgetStudent();
  redirect("/join");
}
