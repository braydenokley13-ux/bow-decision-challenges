import { describe, expect, it } from "vitest";
import { WORLD_REGISTRY } from "./registry";

describe("world-ready registry", () => {
  it("ships Basketball and exposes Fashion only as coming soon", () => {
    expect(WORLD_REGISTRY.basketball.availability).toBe("available");
    expect(WORLD_REGISTRY.basketball.scenario?.id).toBe("basketball");
    expect(WORLD_REGISTRY.fashion.availability).toBe("coming-soon");
    expect(WORLD_REGISTRY.fashion.scenario).toBeUndefined();
  });
});
