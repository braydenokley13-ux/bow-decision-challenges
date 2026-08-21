// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { claimSeat } from "./session";

describe("student account linking", () => {
  it("sends the new class-card proof and BOW recovery key together", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      studentId: "student-1",
      seatCode: "A1",
      displayName: "Sam",
      token: "student-token",
      classCode: "PFDEM",
      label: "Demo",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await claimSeat({
      classCode: "pfdem",
      joinCode: "CARD1",
      bowRecoveryKey: "bow-recovery-key",
      device: "shared",
    });

    expect(result.ok).toBe(true);
    const request = JSON.parse(fetchMock.mock.calls[0]?.[1]?.body as string) as Record<string, unknown>;
    expect(request.joinCode).toBe("CARD1");
    expect(request.bowRecoveryKey).toBe("bow-recovery-key");
  });
});
