import { isWhitelisted } from "@/utils/auth/whitelist";
import { supabase } from "@/utils/supabase/client";

// Mock the Supabase client so the test never touches the real env-guarded
// module or the network. The chain is exposed via __chain for assertions.
jest.mock("@/utils/supabase/client", () => {
  const maybeSingle = jest.fn();
  const eq = jest.fn(() => ({ maybeSingle }));
  const select = jest.fn(() => ({ eq }));
  const from = jest.fn(() => ({ select }));
  return { supabase: { from, __chain: { maybeSingle, eq, select, from } } };
});

type Chain = {
  maybeSingle: jest.Mock;
  eq: jest.Mock;
  select: jest.Mock;
  from: jest.Mock;
};

const chain = (supabase as unknown as { __chain: Chain }).__chain;

beforeEach(() => {
  chain.from.mockClear();
  chain.select.mockClear();
  chain.eq.mockClear();
  chain.maybeSingle.mockReset();
});

describe("isWhitelisted", () => {
  it("normalizes the email (trim + lowercase) before the lookup", async () => {
    chain.maybeSingle.mockResolvedValue({ data: { email: "a@x.com" }, error: null });

    await expect(isWhitelisted("  A@X.com ")).resolves.toBe(true);
    expect(chain.from).toHaveBeenCalledWith("allowed_users");
    expect(chain.eq).toHaveBeenCalledWith("email", "a@x.com");
  });

  it("returns false when the email is absent (null data)", async () => {
    chain.maybeSingle.mockResolvedValue({ data: null, error: null });

    await expect(isWhitelisted("ghost@x.com")).resolves.toBe(false);
  });

  it("fails closed when the query errors", async () => {
    chain.maybeSingle.mockResolvedValue({ data: null, error: new Error("boom") });

    await expect(isWhitelisted("a@x.com")).resolves.toBe(false);
  });
});
