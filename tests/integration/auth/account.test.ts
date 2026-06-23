/**
 * @jest-environment node
 */
import {
  changePassword,
  changeEmail,
  requestPasswordReset,
  MIN_PASSWORD_LENGTH,
} from "@/utils/auth/account";

const mockUpdateUser = jest.fn();
const mockResetPasswordForEmail = jest.fn();
jest.mock("@/utils/supabase/client", () => ({
  supabase: {
    auth: {
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      resetPasswordForEmail: (...args: unknown[]) =>
        mockResetPasswordForEmail(...args),
    },
  },
}));

beforeEach(() => jest.clearAllMocks());

describe("changePassword", () => {
  it("rejects a too-short password without calling Supabase", async () => {
    const result = await changePassword("short");
    expect(result.ok).toBe(false);
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("updates a valid password", async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    await expect(changePassword("longenough1")).resolves.toEqual({ ok: true });
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: "longenough1" });
  });

  it("maps a weak-password error to a friendly message", async () => {
    mockUpdateUser.mockResolvedValue({
      error: { message: "Password should be at least 6 characters" },
    });
    const result = await changePassword("longenough1");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/stronger password/i);
  });

  it("enforces a minimum length of at least 8", () => {
    expect(MIN_PASSWORD_LENGTH).toBeGreaterThanOrEqual(8);
  });
});

describe("changeEmail", () => {
  it("rejects a blank email without calling Supabase", async () => {
    const result = await changeEmail("   ");
    expect(result.ok).toBe(false);
    expect(mockUpdateUser).not.toHaveBeenCalled();
  });

  it("trims and submits the email", async () => {
    mockUpdateUser.mockResolvedValue({ error: null });
    await expect(changeEmail("  new@x.com ")).resolves.toEqual({ ok: true });
    expect(mockUpdateUser).toHaveBeenCalledWith({ email: "new@x.com" });
  });

  it("maps an already-registered error to a friendly message", async () => {
    mockUpdateUser.mockResolvedValue({
      error: { message: "Email address already registered by another user" },
    });
    const result = await changeEmail("new@x.com");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/already in use/i);
  });
});

describe("requestPasswordReset", () => {
  it("rejects a blank email without calling Supabase", async () => {
    const result = await requestPasswordReset("  ");
    expect(result.ok).toBe(false);
    expect(mockResetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("sends a recovery email for a trimmed address", async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
    await expect(requestPasswordReset(" a@x.com ")).resolves.toEqual({
      ok: true,
    });
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      "a@x.com",
      expect.any(Object),
    );
  });
});
