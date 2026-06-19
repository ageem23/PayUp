import { patchReceiptFees } from "@/utils/db/receiptFees";
import { supabase } from "@/utils/supabase/client";

// Mock the Supabase client so the test never touches the real env-guarded
// module or the network. The chain is exposed via __chain for assertions.
jest.mock("@/utils/supabase/client", () => {
  const select = jest.fn();
  const eq = jest.fn(() => ({ select }));
  const update = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ update }));
  return { supabase: { from, __chain: { select, eq, update, from } } };
});

type Chain = {
  select: jest.Mock;
  eq: jest.Mock;
  update: jest.Mock;
  from: jest.Mock;
};

const chain = (supabase as unknown as { __chain: Chain }).__chain;

beforeEach(() => {
  chain.from.mockClear();
  chain.update.mockClear();
  chain.eq.mockClear();
  chain.select.mockReset().mockResolvedValue({
    data: [{ id: "receipt-1" }],
    error: null,
  });
});

describe("patchReceiptFees", () => {
  it("writes tax and tip together to the receipt row", async () => {
    await patchReceiptFees("receipt-1", { tax: 4.25, tip: 8.5 });

    expect(chain.from).toHaveBeenCalledWith("receipts");
    expect(chain.update).toHaveBeenCalledWith({ tax: 4.25, tip: 8.5 });
    expect(chain.eq).toHaveBeenCalledWith("id", "receipt-1");
  });

  it("clamps negative and non-finite values to 0", async () => {
    await patchReceiptFees("receipt-1", { tax: -5, tip: NaN });

    expect(chain.update).toHaveBeenCalledWith({ tax: 0, tip: 0 });
  });

  it("throws when Supabase returns an error", async () => {
    chain.select.mockResolvedValueOnce({
      data: null,
      error: new Error("rls denied"),
    });

    await expect(
      patchReceiptFees("receipt-1", { tax: 1, tip: 1 }),
    ).rejects.toThrow("rls denied");
  });

  it("throws when no rows were updated (error: null, empty data)", async () => {
    chain.select.mockResolvedValueOnce({ data: [], error: null });

    await expect(
      patchReceiptFees("missing-receipt", { tax: 1, tip: 1 }),
    ).rejects.toThrow(/affected no rows/i);
  });
});
