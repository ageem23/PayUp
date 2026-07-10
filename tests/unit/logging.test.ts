/**
 * @jest-environment node
 */

// Mock the anon Supabase client so the helper never makes a real call.
const mockInsert = jest.fn();
const mockGetSession = jest.fn();
// Reference the mocks lazily (inside wrapper fns) so the factory doesn't touch
// them at eval-time — they're initialized after this hoisted jest.mock call.
jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    from: jest.fn(() => ({ insert: (row: unknown) => mockInsert(row) })),
    auth: { getSession: () => mockGetSession() },
  },
}));

import { submitFeedback, logError } from "@/utils/logging/log";

describe("logging helpers (Story 23.1)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: { user: { id: "u1" } } } });
    mockInsert.mockResolvedValue({ error: null });
  });

  it("submitFeedback inserts the report with kind, message, path, context", async () => {
    const res = await submitFeedback({
      kind: "feature_request",
      message: "dark mode on receipts",
      path: "/trips/t1",
      context: { trip_id: "t1" },
    });
    expect(res.ok).toBe(true);
    const row = mockInsert.mock.calls[0][0];
    expect(row).toMatchObject({
      user_id: "u1",
      kind: "feature_request",
      message: "dark mode on receipts",
      path: "/trips/t1",
      context: { trip_id: "t1" },
    });
  });

  it("submitFeedback returns ok:false without an authenticated session (RLS)", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    const res = await submitFeedback({ kind: "error_report", message: "hi" });
    expect(res.ok).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled(); // don't attempt an anon feedback row
  });

  it("submitFeedback returns ok:false (never throws) when the insert errors", async () => {
    mockInsert.mockResolvedValue({ error: new Error("db down") });
    const res = await submitFeedback({ kind: "error_report", message: "boom" });
    expect(res.ok).toBe(false);
  });

  it("logError inserts with source and swallows a thrown insert (never throws)", async () => {
    mockInsert.mockRejectedValue(new Error("network"));
    await expect(
      logError({ source: "client", message: "kaboom", stack: "at x", path: "/" }),
    ).resolves.toBeUndefined();
    const row = mockInsert.mock.calls[0][0];
    expect(row).toMatchObject({ source: "client", message: "kaboom", stack: "at x" });
  });

  it("logError allows a null user_id (pre-login / server context)", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    await logError({ source: "server", message: "route failed" });
    expect(mockInsert.mock.calls[0][0]).toMatchObject({
      user_id: null,
      source: "server",
    });
  });

  it("logError caps an oversized message", async () => {
    await logError({ source: "client", message: "x".repeat(9000) });
    expect(mockInsert.mock.calls[0][0].message.length).toBe(4000);
  });
});
