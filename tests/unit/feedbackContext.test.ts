/**
 * @jest-environment node
 */
import { contextFromPath } from "@/components/feature/FeedbackModal";

describe("contextFromPath (Story 23.3)", () => {
  it("captures the trip id on a trip page", () => {
    expect(contextFromPath("/trips/abc")).toEqual({ trip_id: "abc" });
  });

  it("captures trip + receipt ids on a receipt page", () => {
    expect(contextFromPath("/trips/abc/receipts/r1")).toEqual({
      trip_id: "abc",
      receipt_id: "r1",
    });
  });

  it("returns empty context off the trip routes", () => {
    expect(contextFromPath("/dashboard")).toEqual({});
    expect(contextFromPath("/")).toEqual({});
  });
});
