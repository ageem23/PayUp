/**
 * @jest-environment node
 */
import { createErrorThrottle } from "@/utils/logging/throttle";

describe("createErrorThrottle (Story 23.4)", () => {
  it("logs the first occurrence and drops repeats within the window", () => {
    const shouldLog = createErrorThrottle(10_000);
    expect(shouldLog("boom", 0)).toBe(true);
    expect(shouldLog("boom", 500)).toBe(false);
    expect(shouldLog("boom", 9_999)).toBe(false);
  });

  it("logs again once the window has elapsed", () => {
    const shouldLog = createErrorThrottle(10_000);
    expect(shouldLog("boom", 0)).toBe(true);
    expect(shouldLog("boom", 10_001)).toBe(true);
  });

  it("tracks distinct keys independently", () => {
    const shouldLog = createErrorThrottle(10_000);
    expect(shouldLog("a", 0)).toBe(true);
    expect(shouldLog("b", 100)).toBe(true);
    expect(shouldLog("a", 200)).toBe(false);
  });
});
