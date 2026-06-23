/**
 * @jest-environment node
 */
import {
  fetchProfile,
  updateDisplayName,
  DISPLAY_NAME_MAX,
} from "@/utils/db/profile";

const mockGetUser = jest.fn();
const mockMaybeSingle = jest.fn();
const mockUpsert = jest.fn();
const mockEq = jest.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));

jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: jest.fn(() => ({
      select: mockSelect,
      upsert: (...args: unknown[]) => mockUpsert(...args),
    })),
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockGetUser.mockResolvedValue({
    data: { user: { id: "u1", email: "a@x.com" } },
  });
});

describe("updateDisplayName", () => {
  it("trims and upserts the display name", async () => {
    mockUpsert.mockResolvedValue({ error: null });

    await expect(updateDisplayName("  Bob  ")).resolves.toEqual({ ok: true });
    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: "u1", display_name: "Bob" },
      { onConflict: "user_id" },
    );
  });

  it("normalizes a blank name to null (falls back to email)", async () => {
    mockUpsert.mockResolvedValue({ error: null });

    await updateDisplayName("   ");
    expect(mockUpsert).toHaveBeenCalledWith(
      { user_id: "u1", display_name: null },
      { onConflict: "user_id" },
    );
  });

  it("caps the name at DISPLAY_NAME_MAX", async () => {
    mockUpsert.mockResolvedValue({ error: null });

    await updateDisplayName("x".repeat(200));
    const arg = mockUpsert.mock.calls[0][0] as { display_name: string };
    expect(arg.display_name).toHaveLength(DISPLAY_NAME_MAX);
  });

  it("fails (no upsert) when signed out", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await updateDisplayName("Bob");
    expect(result.ok).toBe(false);
    expect(mockUpsert).not.toHaveBeenCalled();
  });
});

describe("fetchProfile", () => {
  it("maps the row to a Profile", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { display_name: "Bob" },
      error: null,
    });

    await expect(fetchProfile()).resolves.toEqual({ displayName: "Bob" });
  });

  it("returns null on error (fail safe → email fallback)", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: new Error("boom") });

    await expect(fetchProfile()).resolves.toBeNull();
  });
});
