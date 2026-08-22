import { describe, expect, it } from "vitest";
import { createPopUpState, popUpReducer } from "./machine";

describe("Food Truck live service progress", () => {
  it("stores the customer position without adding evidence", () => {
    const initial = createPopUpState(1);
    const next = popUpReducer(initial, { type: "POPUP_SERVICE_PROGRESS", saturday: 2, dealt: 4, at: 2 });
    expect(next.serviceProgress).toEqual({ saturday: 2, dealt: 4 });
    expect(next.log).toHaveLength(0);
  });

  it("clears the live position only when the service is closed", () => {
    const initial = createPopUpState(1);
    const started = popUpReducer(initial, { type: "POPUP_SPOT_SELECTED", spotId: "middle-row", at: 2 });
    const progress = popUpReducer(started, { type: "POPUP_SERVICE_PROGRESS", saturday: 1, dealt: 3, at: 3 });
    const closed = popUpReducer(progress, { type: "POPUP_STOCK_ORDERED", saturday: 1, trays: 1, at: 4 });
    expect(closed.serviceProgress).toBeNull();
  });
});
