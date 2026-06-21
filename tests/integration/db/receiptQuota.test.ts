/**
 * @jest-environment node
 */
import { fetchReceiptQuota } from "@/utils/db/receiptQuota";

const mockRpc = jest.fn();
jest.mock("@/utils/supabase/client", () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));

beforeEach(() => jest.clearAllMocks());

describe("fetchReceiptQuota", () => {
  it("maps a single-row TABLE result (array) into ReceiptQuota", async () => {
    mockRpc.mockResolvedValue({
      data: [
        {
          is_unlimited: false,
          used: 1,
          limit: 3,
          remaining: 2,
          next_available_at: null,
        },
      ],
      error: null,
    });

    await expect(fetchReceiptQuota()).resolves.toEqual({
      isUnlimited: false,
      used: 1,
      limit: 3,
      remaining: 2,
      nextAvailableAt: null,
    });
    expect(mockRpc).toHaveBeenCalledWith("receipt_quota_status");
  });

  it("tolerates a non-array (object) row shape", async () => {
    mockRpc.mockResolvedValue({
      data: { is_unlimited: true, used: 0, limit: 3, remaining: 3 },
      error: null,
    });

    const quota = await fetchReceiptQuota();
    expect(quota?.isUnlimited).toBe(true);
    expect(quota?.remaining).toBe(3);
  });

  it("fails safe (null) on error", async () => {
    mockRpc.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(fetchReceiptQuota()).resolves.toBeNull();
  });

  it("returns null on an empty result", async () => {
    mockRpc.mockResolvedValue({ data: [], error: null });
    await expect(fetchReceiptQuota()).resolves.toBeNull();
  });
});
