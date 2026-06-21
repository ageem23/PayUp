/**
 * @jest-environment node
 */
import { requestUnlimitedAccess } from "@/utils/db/accessRequest";
import { supabase } from "@/utils/supabase/client";

const mockGetUser = jest.fn();
const mockInsert = jest.fn();

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: jest.fn(() => ({ insert: (...args: unknown[]) => mockInsert(...args) })),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({
    data: { user: { id: "u1", email: "a@x.com" } },
  });
});

describe("requestUnlimitedAccess", () => {
  it("inserts a pending request for the current user", async () => {
    mockInsert.mockResolvedValue({ error: null });

    await expect(requestUnlimitedAccess()).resolves.toEqual({
      ok: true,
      alreadyPending: false,
    });
    expect(supabase.from).toHaveBeenCalledWith("access_requests");
    expect(mockInsert).toHaveBeenCalledWith({ user_id: "u1", email: "a@x.com" });
  });

  it("treats a duplicate (23505) as already-pending success (graceful dedup)", async () => {
    mockInsert.mockResolvedValue({ error: { code: "23505", message: "dup" } });

    await expect(requestUnlimitedAccess()).resolves.toEqual({
      ok: true,
      alreadyPending: true,
    });
  });

  it("returns an error for a non-duplicate failure", async () => {
    mockInsert.mockResolvedValue({ error: { code: "XXXXX", message: "boom" } });

    const result = await requestUnlimitedAccess();
    expect(result).toEqual({ ok: false, error: "boom" });
  });

  it("fails when not signed in", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await requestUnlimitedAccess();
    expect(result.ok).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("refuses to insert a request for a user with no email", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: null } } });

    const result = await requestUnlimitedAccess();
    expect(result.ok).toBe(false);
    expect(mockInsert).not.toHaveBeenCalled();
  });
});
