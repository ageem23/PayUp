import { patchReceiptSplits } from "@/utils/db/matrixPatch";
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
  chain.select.mockReset().mockResolvedValue({ data: [], error: null });
});

describe("patchReceiptSplits", () => {
  it("sends the updated assigned_participants array to split_among", async () => {
    const payload = [
      { item_id: "item-1", assigned_participants: ["Alice", "Bob"] },
    ];

    await patchReceiptSplits("receipt-1", payload);

    expect(chain.from).toHaveBeenCalledWith("receipts");
    expect(chain.update).toHaveBeenCalledWith({ split_among: payload });
    expect(chain.eq).toHaveBeenCalledWith("id", "receipt-1");
  });

  it("preserves an empty assigned_participants array as [] (not null)", async () => {
    const payload = [{ item_id: "item-1", assigned_participants: [] }];

    await patchReceiptSplits("receipt-1", payload);

    expect(chain.update).toHaveBeenCalledWith({
      split_among: [{ item_id: "item-1", assigned_participants: [] }],
    });
  });

  it("throws when Supabase returns an error", async () => {
    chain.select.mockResolvedValueOnce({
      data: null,
      error: new Error("rls denied"),
    });

    await expect(
      patchReceiptSplits("receipt-1", [
        { item_id: "item-1", assigned_participants: ["Alice"] },
      ]),
    ).rejects.toThrow("rls denied");
  });
});
