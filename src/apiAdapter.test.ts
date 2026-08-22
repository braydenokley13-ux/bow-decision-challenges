import adapter from "../api/[[...route]]";
import { describe, expect, it } from "vitest";

describe("Vercel runtime adapter", () => {
  it("serves health through Request -> Response without a socket", async () => {
    const response = await adapter.fetch(new Request("http://localhost/api/health"));

    expect([200, 503]).toContain(response.status);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect((await response.json()) as { store: string }).toHaveProperty("store");
  });

  it("answers CORS preflight directly", async () => {
    const response = await adapter.fetch(
      new Request("http://localhost/api/health", {
        method: "OPTIONS",
        headers: { Origin: "http://localhost:4173" },
      }),
    );

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("OPTIONS");
  });

  it("rejects malformed JSON before reaching the service", async () => {
    const response = await adapter.fetch(
      new Request("http://localhost/api/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "bad_request",
      message: "That request could not be read.",
    });
  });
});
